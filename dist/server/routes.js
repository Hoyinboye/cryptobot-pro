"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const http_1 = require("http");
const ws_1 = require("ws");
const storage_1 = require("./storage");
const schema_1 = require("../shared/schema");
const openai_1 = __importDefault(require("openai"));
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const secure_storage_1 = require("./secure-storage");
const kraken_symbols_1 = require("./kraken-symbols");
const kraken_stub_1 = require("./kraken-stub");
// Initialize Firebase Admin SDK
if ((0, app_1.getApps)().length === 0) {
    // For demo/development - initialize with project ID from environment
    console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
    (0, app_1.initializeApp)({
        projectId: process.env.FIREBASE_PROJECT_ID
    });
}
const adminAuth = (0, auth_1.getAuth)();
// Kraken API helper functions
function getKrakenSignature(path, request, secret, nonce) {
    const message = nonce + request;
    const hash = crypto_1.default.createHash('sha256').update(message).digest();
    const hmac = crypto_1.default.createHmac('sha512', Buffer.from(secret, 'base64'));
    hmac.update(path + hash);
    return hmac.digest('base64');
}
let lastPrivateNonce = 0n;
function nextPrivateNonce() {
    const now = BigInt(Date.now()) * 1000n;
    if (now > lastPrivateNonce) {
        lastPrivateNonce = now;
    }
    else {
        lastPrivateNonce += 1n;
    }
    return lastPrivateNonce;
}
async function krakenRequest(endpoint, data = {}, apiKey, apiSecret) {
    if ((0, kraken_stub_1.isKrakenStubEnabled)()) {
        return (0, kraken_stub_1.handleStubbedRequest)(endpoint, data, apiKey, apiSecret);
    }
    const baseUrl = 'https://api.kraken.com';
    if (apiKey && apiSecret) {
        // Private API call
        const nonce = nextPrivateNonce().toString();
        const postDataObj = {
            nonce,
            ...data
        };
        const postData = new URLSearchParams(postDataObj).toString();
        const signature = getKrakenSignature(endpoint, postData, apiSecret, nonce);
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'API-Key': apiKey,
                'API-Sign': signature,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: postData
        });
        return response.json();
    }
    else {
        // Public API call
        const response = await fetch(`${baseUrl}${endpoint}`);
        return response.json();
    }
}
// Lazy OpenAI initialization to prevent startup crashes
let openaiClient = null;
function getOpenAI() {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required for AI features');
        }
        openaiClient = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openaiClient;
}
const DEFAULT_SYMBOL_LIST = (process.env.SUPPORTED_SYMBOLS || 'BTCUSD,ETHUSD,ADAUSD,SOLUSD,DOTUSD,LINKUSD')
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean);
const LEGACY_SYMBOL_MAP = {
    BTCUSD: 'XXBTZUSD',
    ETHUSD: 'XETHZUSD',
    ADAUSD: 'ADAUSD',
    SOLUSD: 'SOLUSD',
    DOTUSD: 'DOTUSD',
    LINKUSD: 'LINKUSD'
};
async function resolveKrakenSymbol(symbol) {
    const normalized = symbol?.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (!normalized) {
        return null;
    }
    return await (0, kraken_symbols_1.getKrakenSymbol)(normalized);
}
async function resolveDisplaySymbol(krakenPair) {
    return await (0, kraken_symbols_1.getDisplaySymbol)(krakenPair);
}
async function getPreferredKrakenPairs() {
    const pairs = await (0, kraken_symbols_1.resolveKrakenPairs)(DEFAULT_SYMBOL_LIST);
    if (pairs.length > 0) {
        return pairs;
    }
    const popular = await (0, kraken_symbols_1.getPopularPairs)(6);
    if (popular.length > 0) {
        return popular;
    }
    const legacy = DEFAULT_SYMBOL_LIST
        .map(symbol => LEGACY_SYMBOL_MAP[symbol])
        .filter(Boolean);
    return Array.from(new Set(legacy));
}
async function validateRiskLimits(userId, portfolioId, tradeValue, tradeSide, symbol, riskSettings) {
    // If risk management is disabled, allow all trades
    if (!riskSettings.enabled) {
        return { allowed: true };
    }
    // Check max position size (only for buys that increase exposure)
    if (riskSettings.maxPositionSize && tradeSide === 'buy') {
        const maxPositionSize = parseFloat(riskSettings.maxPositionSize);
        if (tradeValue > maxPositionSize) {
            return {
                allowed: false,
                reason: `Trade value $${tradeValue.toFixed(2)} exceeds maximum position size limit of $${maxPositionSize.toFixed(2)}`
            };
        }
    }
    // Check max open positions (only for buys into new positions)
    if (riskSettings.maxOpenPositions && tradeSide === 'buy') {
        const holdings = await storage_1.storage.getHoldings(portfolioId);
        const openPositions = holdings.length;
        const existingHolding = holdings.find(h => h.symbol === symbol);
        // Only block if at limit AND this is a new position (not adding to existing)
        if (openPositions >= riskSettings.maxOpenPositions && !existingHolding) {
            return {
                allowed: false,
                reason: `Maximum open positions limit reached (${openPositions}/${riskSettings.maxOpenPositions}). Cannot open new position in ${symbol}.`
            };
        }
    }
    // Check daily loss limit (including the current trade)
    if (riskSettings.maxDailyLoss) {
        const maxDailyLoss = parseFloat(riskSettings.maxDailyLoss);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        // Get today's trades to calculate daily P&L
        const allTrades = await storage_1.storage.getTrades(userId, 1000);
        const todayTrades = allTrades.filter(t => t.createdAt && new Date(t.createdAt) >= todayStart);
        // Calculate realized P&L from today's trades
        let dailyPnL = 0;
        for (const trade of todayTrades) {
            const value = parseFloat(trade.amount) * parseFloat(trade.price);
            if (trade.side === 'sell') {
                // Selling adds to P&L (simplified - actual P&L would need entry price)
                dailyPnL += value;
            }
            else {
                // Buying reduces P&L
                dailyPnL -= value;
            }
        }
        // Include the prospective trade effect
        if (tradeSide === 'buy') {
            dailyPnL -= tradeValue;
        }
        else {
            dailyPnL += tradeValue;
        }
        // Block if including this trade would exceed loss limit
        if (dailyPnL < 0 && Math.abs(dailyPnL) >= maxDailyLoss) {
            return {
                allowed: false,
                reason: `Daily loss limit would be exceeded ($${Math.abs(dailyPnL).toFixed(2)}/$${maxDailyLoss.toFixed(2)} including this trade)`
            };
        }
    }
    return { allowed: true };
}
// Helper function to fetch and transform Kraken trade history
async function getKrakenTradeHistory(apiKey, apiSecret, options = {}) {
    try {
        const params = {
            trades: true, // Include trade info
            ...options
        };
        const response = await krakenRequest('/0/private/ClosedOrders', params, apiKey, apiSecret);
        if (response.error && response.error.length > 0) {
            console.error('Kraken ClosedOrders error:', response.error);
            return [];
        }
        const orders = response.result?.closed || {};
        const transformedTrades = [];
        for (const [orderId, order] of Object.entries(orders)) {
            const orderData = order;
            const rawPair = orderData.descr?.pair || orderData.descr?.altname || orderId;
            let symbol = null;
            try {
                symbol = await resolveDisplaySymbol(rawPair);
                if (!symbol && orderData.descr?.altname) {
                    symbol = (0, kraken_symbols_1.displayFromAltname)(orderData.descr.altname);
                }
                if (!symbol && orderData.descr?.base && orderData.descr?.quote) {
                    symbol = (0, kraken_symbols_1.displayFromAssets)(orderData.descr.base, orderData.descr.quote);
                }
            }
            catch (resolutionError) {
                console.error('Failed to resolve display symbol for Kraken pair:', rawPair, resolutionError);
            }
            const displaySymbol = symbol || rawPair;
            const side = orderData.descr.type;
            const type = orderData.descr.ordertype;
            const amount = orderData.vol;
            const price = orderData.descr.price || orderData.price || '0';
            const status = orderData.status === 'closed' ? 'filled' : orderData.status;
            transformedTrades.push({
                id: orderId,
                krakenOrderId: orderId,
                symbol: displaySymbol,
                side,
                type,
                amount,
                price,
                status,
                createdAt: new Date(orderData.opentm * 1000),
                filledAt: orderData.closetm ? new Date(orderData.closetm * 1000) : null,
                metadata: {
                    kraken: true,
                    cost: orderData.cost,
                    fee: orderData.fee,
                    vol_exec: orderData.vol_exec
                }
            });
        }
        return transformedTrades;
    }
    catch (error) {
        console.error('Error fetching Kraken trade history:', error);
        return [];
    }
}
async function registerRoutes(app) {
    const httpServer = (0, http_1.createServer)(app);
    // WebSocket server for real-time data
    const wss = new ws_1.WebSocketServer({ server: httpServer, path: '/ws' });
    // Store active WebSocket connections
    const wsConnections = new Set();
    wss.on('connection', (ws) => {
        wsConnections.add(ws);
        console.log('WebSocket client connected');
        ws.on('close', () => {
            wsConnections.delete(ws);
            console.log('WebSocket client disconnected');
        });
    });
    // Broadcast to all connected clients
    function broadcast(data) {
        wsConnections.forEach(ws => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            }
        });
    }
    // Health check endpoint for Render
    app.get('/api/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'cryptobot-backend'
        });
    });
    // Auth middleware with proper Firebase token verification
    const requireAuth = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No valid authorization token provided' });
            }
            const idToken = authHeader.split('Bearer ')[1];
            // Verify the Firebase ID token
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            req.firebaseUid = decodedToken.uid;
            next();
        }
        catch (error) {
            console.error('Token verification failed:', error);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
    // User routes - secure login with token verification
    app.post('/api/auth/login', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No valid authorization token provided' });
            }
            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            // Extract user info from verified token (not client-supplied data)
            const firebaseUid = decodedToken.uid;
            const email = decodedToken.email || '';
            const displayName = decodedToken.name || null;
            const photoURL = decodedToken.picture || null;
            let user = await storage_1.storage.getUserByFirebaseUid(firebaseUid);
            if (!user) {
                user = await storage_1.storage.createUser({
                    firebaseUid,
                    email,
                    displayName,
                    photoURL,
                    isDemo: true,
                    krakenApiKey: null,
                    krakenApiSecret: null,
                    riskSettings: {}
                });
                // Create default portfolio
                await storage_1.storage.createPortfolio({
                    userId: user.id,
                    totalBalance: "10000.00", // Demo balance
                    availableBalance: "10000.00",
                    tradingBalance: "0.00",
                    pnl24h: "0.00",
                    pnlPercentage24h: "0.00",
                    isDemo: true
                });
            }
            res.json({ user: (0, schema_1.sanitizeUser)(user) });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });
    app.get('/api/user/profile', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({ user: (0, schema_1.sanitizeUser)(user) });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get user profile' });
        }
    });
    app.put('/api/user/risk-settings', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const { enabled, maxPositionSize, maxDailyLoss, maxOpenPositions } = req.body;
            // Validate input
            const riskSettings = {};
            if (typeof enabled === 'boolean') {
                riskSettings.enabled = enabled;
            }
            if (maxPositionSize !== undefined && maxPositionSize !== null && maxPositionSize !== '') {
                const value = parseFloat(maxPositionSize);
                if (isNaN(value) || value <= 0) {
                    return res.status(400).json({ error: 'Max position size must be a positive number greater than zero' });
                }
                riskSettings.maxPositionSize = value.toString();
            }
            if (maxDailyLoss !== undefined && maxDailyLoss !== null && maxDailyLoss !== '') {
                const value = parseFloat(maxDailyLoss);
                if (isNaN(value) || value <= 0) {
                    return res.status(400).json({ error: 'Max daily loss must be a positive number greater than zero' });
                }
                riskSettings.maxDailyLoss = value.toString();
            }
            if (maxOpenPositions !== undefined && maxOpenPositions !== null && maxOpenPositions !== '') {
                const value = parseInt(maxOpenPositions, 10);
                if (isNaN(value) || !Number.isInteger(value) || value < 1) {
                    return res.status(400).json({ error: 'Max open positions must be an integer of at least 1' });
                }
                riskSettings.maxOpenPositions = value;
            }
            // Update user risk settings
            await storage_1.storage.updateUser(user.id, { riskSettings });
            const updatedUser = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            res.json({ user: (0, schema_1.sanitizeUser)(updatedUser) });
        }
        catch (error) {
            console.error('Update risk settings error:', error);
            res.status(500).json({ error: 'Failed to update risk settings' });
        }
    });
    // Portfolio routes
    app.get('/api/portfolio', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const portfolio = await storage_1.storage.getPortfolio(user.id);
            const holdings = portfolio ? await storage_1.storage.getHoldings(portfolio.id) : [];
            res.json({ portfolio, holdings });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    });
    // Market data routes
    app.get('/api/market/ticker/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const normalizedSymbol = symbol?.toUpperCase() || '';
            const krakenSymbol = await resolveKrakenSymbol(normalizedSymbol);
            if (!krakenSymbol) {
                return res.status(404).json({ error: `Unsupported trading pair: ${symbol}` });
            }
            const data = await krakenRequest(`/0/public/Ticker?pair=${krakenSymbol}`);
            // Normalize Kraken response to expected format
            if (data.error && data.error.length > 0) {
                return res.status(400).json({ error: data.error[0] });
            }
            const result = data.result;
            const pairKey = Object.keys(result)[0]; // Get first (and usually only) pair
            const tickerData = result[pairKey];
            if (!tickerData) {
                return res.status(404).json({ error: 'Symbol not found' });
            }
            const displaySymbol = await resolveDisplaySymbol(pairKey) || normalizedSymbol;
            // Extract relevant data from Kraken format
            // c = last trade closed array [price, lot volume]
            // v = volume array [today, 24h]
            // p = volume weighted average price array [today, 24h]
            // o = today's opening price
            const currentPrice = parseFloat(tickerData.c[0]);
            const openPrice = parseFloat(tickerData.o);
            const volume24h = parseFloat(tickerData.v[1]);
            const change24h = currentPrice - openPrice;
            const changePercent = openPrice > 0 ? ((change24h / openPrice) * 100).toFixed(2) : '0.00';
            const normalizedResponse = {
                symbol: displaySymbol,
                price: currentPrice.toFixed(2),
                change24h: change24h.toFixed(2),
                changePercent: changePercent,
                volume: volume24h.toFixed(2),
                timestamp: Date.now()
            };
            res.json(normalizedResponse);
        }
        catch (error) {
            console.error('Market data error:', error);
            res.status(500).json({ error: 'Failed to get market data' });
        }
    });
    app.get('/api/market/tickers', async (req, res) => {
        try {
            const pairs = await getPreferredKrakenPairs();
            if (!pairs.length) {
                return res.status(500).json({ error: 'No supported trading pairs available' });
            }
            const data = await krakenRequest(`/0/public/Ticker?pair=${pairs.join(',')}`);
            // Normalize Kraken response to expected format
            if (data.error && data.error.length > 0) {
                return res.status(400).json({ error: data.error[0] });
            }
            const result = data.result;
            const normalizedTickers = [];
            // Convert each ticker to normalized format
            for (const [pairKey, tickerData] of Object.entries(result)) {
                if (tickerData && typeof tickerData === 'object') {
                    const currentPrice = parseFloat(tickerData.c[0]);
                    const openPrice = parseFloat(tickerData.o);
                    const volume24h = parseFloat(tickerData.v[1]);
                    const change24h = currentPrice - openPrice;
                    const changePercent = openPrice > 0 ? ((change24h / openPrice) * 100).toFixed(2) : '0.00';
                    const displaySymbol = await resolveDisplaySymbol(pairKey) || pairKey;
                    normalizedTickers.push({
                        symbol: displaySymbol,
                        price: currentPrice.toFixed(2),
                        change24h: change24h.toFixed(2),
                        changePercent: changePercent,
                        volume: volume24h.toFixed(2),
                        timestamp: Date.now()
                    });
                }
            }
            res.json(normalizedTickers);
        }
        catch (error) {
            console.error('Market tickers error:', error);
            res.status(500).json({ error: 'Failed to get market data' });
        }
    });
    // OHLC candlestick data endpoint
    app.get('/api/market/ohlc/:symbol', async (req, res) => {
        try {
            const { symbol } = req.params;
            const { interval = '60' } = req.query; // Default to 60 minutes (1 hour)
            const normalizedSymbol = symbol?.toUpperCase() || '';
            const krakenSymbol = await resolveKrakenSymbol(normalizedSymbol);
            if (!krakenSymbol) {
                return res.status(404).json({ error: `Unsupported trading pair: ${symbol}` });
            }
            // Kraken OHLC intervals: 1, 5, 15, 30, 60, 240, 1440, 10080, 21600
            const data = await krakenRequest(`/0/public/OHLC?pair=${krakenSymbol}&interval=${interval}`);
            if (data.error && data.error.length > 0) {
                return res.status(400).json({ error: data.error[0] });
            }
            const result = data.result;
            const pairKey = Object.keys(result).find(key => key !== 'last');
            if (!pairKey || !result[pairKey]) {
                return res.status(404).json({ error: 'OHLC data not found' });
            }
            // Kraken OHLC format: [time, open, high, low, close, vwap, volume, count]
            const ohlcData = result[pairKey].map((candle) => ({
                time: candle[0] * 1000, // Convert to milliseconds
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[6])
            }));
            res.json({
                symbol,
                interval: parseInt(interval),
                data: ohlcData
            });
        }
        catch (error) {
            console.error('OHLC data error:', error);
            res.status(500).json({ error: 'Failed to get OHLC data' });
        }
    });
    // AI Signal routes
    app.get('/api/ai/signals', async (req, res) => {
        try {
            const { symbol, includeInactive, limit } = req.query;
            if (includeInactive === 'true') {
                // Return all signals (active and inactive) for historical data
                const signals = await storage_1.storage.getAllSignals({
                    symbol: symbol,
                    includeInactive: true,
                    limit: limit ? parseInt(limit, 10) : undefined
                });
                res.json({ signals });
            }
            else {
                // Return only active signals (default behavior)
                const signals = await storage_1.storage.getActiveSignals(symbol);
                res.json({ signals });
            }
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get AI signals' });
        }
    });
    app.put('/api/ai/signals/:id/dismiss', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            const signal = await storage_1.storage.updateAiSignal(id, {
                isActive: false
            });
            res.json({ signal });
        }
        catch (error) {
            console.error('Failed to dismiss signal:', error);
            res.status(500).json({ error: 'Failed to dismiss signal' });
        }
    });
    app.post('/api/ai/analyze', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { symbol, timeframe = '60' } = req.body;
            const normalizedSymbol = symbol?.toUpperCase() || '';
            // Map frontend symbol to Kraken format
            const krakenSymbol = await resolveKrakenSymbol(normalizedSymbol);
            if (!krakenSymbol) {
                return res.status(400).json({ error: 'Invalid or unsupported symbol' });
            }
            // Get current market ticker data
            const displaySymbol = await resolveDisplaySymbol(krakenSymbol) || normalizedSymbol;
            const marketData = await krakenRequest(`/0/public/Ticker?pair=${krakenSymbol}`);
            if (marketData.error && marketData.error.length > 0) {
                return res.status(400).json({ error: 'Invalid symbol' });
            }
            // Get OHLC historical data for technical analysis
            const ohlcData = await krakenRequest(`/0/public/OHLC?pair=${krakenSymbol}&interval=${timeframe}`);
            if (ohlcData.error && ohlcData.error.length > 0) {
                return res.status(400).json({ error: 'Failed to fetch historical data' });
            }
            const pairKey = Object.keys(marketData.result)[0];
            const ticker = marketData.result[pairKey];
            const currentPrice = parseFloat(ticker.c[0]);
            const volume24h = parseFloat(ticker.v[1]);
            const high24h = parseFloat(ticker.h[1]);
            const low24h = parseFloat(ticker.l[1]);
            // Get OHLC candles
            const ohlcPairKey = Object.keys(ohlcData.result).find(key => key !== 'last');
            const candles = ohlcPairKey ? ohlcData.result[ohlcPairKey] : [];
            // Calculate technical indicators
            const closes = candles.slice(-50).map((c) => parseFloat(c[4])); // Last 50 closes
            const volumes = candles.slice(-50).map((c) => parseFloat(c[6]));
            // Simple Moving Average (SMA) - 20 period
            const sma20 = closes.length >= 20 ?
                closes.slice(-20).reduce((sum, val) => sum + val, 0) / 20 :
                currentPrice;
            // Exponential Moving Average (EMA) - 12 period
            const ema12 = calculateEMA(closes, 12);
            const ema26 = calculateEMA(closes, 26);
            // RSI calculation - 14 period
            const rsi = calculateRSI(closes, 14);
            // MACD
            const macd = ema12 - ema26;
            // Volume trend
            const avgVolume = volumes.length > 0 ?
                volumes.reduce((sum, val) => sum + val, 0) / volumes.length :
                0;
            const volumeTrend = avgVolume > 0 ? ((volume24h - avgVolume) / avgVolume) * 100 : 0;
            // Price momentum
            const priceChange24h = closes.length > 0 ? ((currentPrice - closes[0]) / closes[0]) * 100 : 0;
            // Support and resistance levels (simplified)
            const recent20High = Math.max(...closes.slice(-20));
            const recent20Low = Math.min(...closes.slice(-20));
            // Prepare comprehensive analysis prompt
            const analysisPrompt = `Analyze ${displaySymbol} cryptocurrency and provide a professional trading recommendation.

CURRENT MARKET DATA:
- Current Price: $${currentPrice.toFixed(2)}
- 24h High: $${high24h.toFixed(2)}
- 24h Low: $${low24h.toFixed(2)}
- 24h Volume: ${volume24h.toFixed(2)}
- 24h Price Change: ${priceChange24h.toFixed(2)}%

TECHNICAL INDICATORS:
- RSI (14): ${rsi.toFixed(2)} ${rsi > 70 ? '(Overbought)' : rsi < 30 ? '(Oversold)' : '(Neutral)'}
- SMA (20): $${sma20.toFixed(2)} - Price is ${currentPrice > sma20 ? 'above' : 'below'} SMA
- EMA (12): $${ema12.toFixed(2)}
- EMA (26): $${ema26.toFixed(2)}
- MACD: ${macd.toFixed(2)} ${macd > 0 ? '(Bullish)' : '(Bearish)'}
- Volume Trend: ${volumeTrend.toFixed(2)}% vs average
- Support Level: $${recent20Low.toFixed(2)}
- Resistance Level: $${recent20High.toFixed(2)}

INSTRUCTIONS:
1. Analyze the technical indicators and market conditions
2. Determine if this is a BUY, SELL, or HOLD opportunity
3. Set realistic entry, target, and stop-loss prices based on current levels
4. Calculate risk/reward ratio (should be at least 2:1 for buy/sell signals)
5. Provide clear reasoning based on the technical analysis
6. Assign confidence level (0-100) based on signal strength

Respond with JSON only in this exact format:
{
  "signal": "buy|sell|hold",
  "confidence": number (0-100),
  "reasoning": "detailed explanation of analysis and why this signal was generated",
  "entryPrice": number (recommended entry price),
  "targetPrice": number (profit target),
  "stopLoss": number (stop loss level),
  "riskReward": number (risk/reward ratio)
}`;
            // Using GPT-4o-mini for reliable AI analysis
            const completion = await getOpenAI().chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a professional cryptocurrency trading analyst with expertise in technical analysis. You provide data-driven trading recommendations based on technical indicators, market conditions, and risk management principles. Always consider proper risk/reward ratios and realistic price targets.`
                    },
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                response_format: { type: "json_object" }
            });
            const analysis = JSON.parse(completion.choices[0].message.content);
            // Store technical indicators with the signal
            const indicators = {
                rsi,
                sma20,
                ema12,
                ema26,
                macd,
                volumeTrend,
                priceChange24h,
                currentPrice,
                support: recent20Low,
                resistance: recent20High
            };
            // Store AI signal
            let signal = await storage_1.storage.createAiSignal({
                symbol: displaySymbol, // Store normalized symbol (BTCUSD, not XXBTZUSD)
                signal: analysis.signal,
                confidence: analysis.confidence,
                entryPrice: analysis.entryPrice?.toString() || currentPrice.toString(),
                targetPrice: analysis.targetPrice?.toString() || "0",
                stopLoss: analysis.stopLoss?.toString() || "0",
                riskReward: analysis.riskReward?.toString() || "0",
                reasoning: analysis.reasoning,
                indicators,
                isActive: true
            });
            // Set expiration time (24 hours from now)
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            signal = await storage_1.storage.updateAiSignal(signal.id, { expiresAt });
            res.json({ signal, analysis, indicators });
        }
        catch (error) {
            console.error('AI analysis error:', error);
            res.status(500).json({ error: 'AI analysis failed' });
        }
    });
    // Helper functions for technical indicators
    function calculateEMA(prices, period) {
        if (prices.length < period)
            return prices[prices.length - 1] || 0;
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }
        return ema;
    }
    function calculateRSI(prices, period = 14) {
        if (prices.length < period + 1)
            return 50; // Default neutral RSI
        let gains = 0;
        let losses = 0;
        // Calculate initial average gain and loss
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0)
                gains += change;
            else
                losses += Math.abs(change);
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        // Calculate RSI for remaining periods
        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    // Trading routes
    app.post('/api/trade', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const portfolio = await storage_1.storage.getPortfolio(user.id);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const tradeData = schema_1.insertTradeSchema.parse({
                userId: user.id,
                portfolioId: portfolio.id,
                ...req.body
            });
            tradeData.symbol = tradeData.symbol.toUpperCase();
            // For market orders, fetch current price from Kraken
            let executionPrice = tradeData.price;
            if (tradeData.type === 'market' && (!executionPrice || executionPrice === '0')) {
                const krakenSymbol = await resolveKrakenSymbol(tradeData.symbol);
                if (!krakenSymbol) {
                    return res.status(400).json({ error: `Unsupported trading pair: ${tradeData.symbol}` });
                }
                const tickerData = await krakenRequest(`/0/public/Ticker?pair=${krakenSymbol}`);
                if (tickerData.error && tickerData.error.length > 0) {
                    return res.status(400).json({ error: 'Failed to fetch current market price' });
                }
                const pairKey = Object.keys(tickerData.result)[0];
                const currentPrice = parseFloat(tickerData.result[pairKey].c[0]);
                executionPrice = currentPrice.toString();
            }
            // Ensure tradeData.price is set to executionPrice for all downstream operations
            tradeData.price = executionPrice;
            // Final validation: ensure we have a valid numeric price before proceeding
            if (!tradeData.price || isNaN(parseFloat(tradeData.price)) || parseFloat(tradeData.price) <= 0) {
                return res.status(400).json({
                    error: 'Invalid execution price. Cannot process trade without a valid price.'
                });
            }
            // Risk management validation
            const tradeValue = parseFloat(tradeData.amount) * parseFloat(tradeData.price);
            const riskSettings = user.riskSettings || {};
            const riskCheck = await validateRiskLimits(user.id, portfolio.id, tradeValue, tradeData.side, tradeData.symbol, riskSettings);
            if (!riskCheck.allowed) {
                return res.status(403).json({
                    error: 'Trade blocked by risk management',
                    reason: riskCheck.reason
                });
            }
            let trade;
            if (user.isDemo) {
                // Demo mode - simulate trade execution
                trade = await storage_1.storage.createTrade({
                    userId: user.id,
                    portfolioId: portfolio.id,
                    symbol: tradeData.symbol,
                    side: tradeData.side,
                    type: tradeData.type,
                    amount: tradeData.amount,
                    price: tradeData.price,
                    status: 'filled', // ✅ Demo trades fill instantly
                    fee: tradeData.fee,
                    isDemo: tradeData.isDemo,
                    isAiGenerated: tradeData.isAiGenerated,
                    krakenOrderId: `demo_${Date.now()}`,
                    metadata: { demo: true }
                });
                // Update portfolio balances for demo
                const amount = parseFloat(tradeData.amount);
                const price = parseFloat(tradeData.price);
                const value = amount * price;
                // Update portfolio balances and holdings for demo trades
                const availableBalance = parseFloat(portfolio.availableBalance || '0');
                const tradingBalance = parseFloat(portfolio.tradingBalance || '0');
                if (tradeData.side === 'buy') {
                    // Deduct cash, increase trading balance
                    const newAvailable = availableBalance - value;
                    const newTrading = tradingBalance + value;
                    await storage_1.storage.updatePortfolio(portfolio.id, {
                        availableBalance: newAvailable.toString(),
                        tradingBalance: newTrading.toString(),
                        totalBalance: (newAvailable + newTrading).toString()
                    });
                    // Create or update holding
                    const existingHolding = await storage_1.storage.getHoldingBySymbol(portfolio.id, tradeData.symbol);
                    if (existingHolding) {
                        // Update existing holding with new average price
                        const currentValue = parseFloat(existingHolding.amount) * parseFloat(existingHolding.averagePrice);
                        const newTotalAmount = parseFloat(existingHolding.amount) + amount;
                        const newAveragePrice = ((currentValue + value) / newTotalAmount).toFixed(6);
                        await storage_1.storage.updateHolding(existingHolding.id, {
                            amount: newTotalAmount.toString(),
                            averagePrice: newAveragePrice,
                            currentPrice: tradeData.price,
                            value: (newTotalAmount * parseFloat(tradeData.price)).toFixed(2)
                        });
                    }
                    else {
                        // Create new holding
                        await storage_1.storage.createHolding({
                            portfolioId: portfolio.id,
                            symbol: tradeData.symbol,
                            amount: tradeData.amount,
                            averagePrice: tradeData.price,
                            currentPrice: tradeData.price,
                            value: value.toFixed(2)
                        });
                    }
                }
                else if (tradeData.side === 'sell') {
                    // Add cash from sale, reduce trading balance
                    const newAvailable = availableBalance + value;
                    const newTrading = Math.max(0, tradingBalance - value);
                    await storage_1.storage.updatePortfolio(portfolio.id, {
                        availableBalance: newAvailable.toString(),
                        tradingBalance: newTrading.toString(),
                        totalBalance: (newAvailable + newTrading).toString()
                    });
                    // Update or remove holding
                    const existingHolding = await storage_1.storage.getHoldingBySymbol(portfolio.id, tradeData.symbol);
                    if (existingHolding) {
                        const newAmount = parseFloat(existingHolding.amount) - amount;
                        if (newAmount <= 0) {
                            // Remove holding if sold completely
                            await storage_1.storage.deleteHolding(existingHolding.id);
                        }
                        else {
                            // Update holding with reduced amount
                            await storage_1.storage.updateHolding(existingHolding.id, {
                                amount: newAmount.toString(),
                                currentPrice: tradeData.price,
                                value: (newAmount * parseFloat(tradeData.price)).toFixed(2)
                            });
                        }
                    }
                }
            }
            else {
                // Live mode - execute real trade via Kraken API
                let apiKey;
                let apiSecret;
                try {
                    apiKey = user.krakenApiKey ? (0, secure_storage_1.decryptSensitive)(user.krakenApiKey) : null;
                    apiSecret = user.krakenApiSecret ? (0, secure_storage_1.decryptSensitive)(user.krakenApiSecret) : null;
                }
                catch (decryptionError) {
                    console.error('Failed to decrypt Kraken API credentials', decryptionError);
                    return res.status(500).json({ error: 'Unable to access Kraken credentials. Please re-enter your API keys.' });
                }
                if (!apiKey || !apiSecret) {
                    return res.status(400).json({ error: 'Kraken API keys not configured' });
                }
                // Map user-friendly symbol to Kraken's internal pair code
                const krakenSymbol = await resolveKrakenSymbol(tradeData.symbol);
                if (!krakenSymbol) {
                    return res.status(400).json({ error: `Unsupported trading pair: ${tradeData.symbol}` });
                }
                const orderData = {
                    pair: krakenSymbol,
                    type: tradeData.side,
                    ordertype: tradeData.type,
                    volume: tradeData.amount,
                    ...(tradeData.type === 'limit' ? { price: tradeData.price } : {})
                };
                const orderResult = await krakenRequest('/0/private/AddOrder', orderData, apiKey, apiSecret);
                if (orderResult.error && orderResult.error.length > 0) {
                    return res.status(400).json({ error: orderResult.error[0] });
                }
                trade = await storage_1.storage.createTrade({
                    userId: user.id,
                    portfolioId: portfolio.id,
                    symbol: tradeData.symbol,
                    side: tradeData.side,
                    type: tradeData.type,
                    amount: tradeData.amount,
                    price: tradeData.price,
                    status: 'pending', // ✅ Real trades are pending until Kraken confirms
                    fee: tradeData.fee,
                    isDemo: tradeData.isDemo,
                    isAiGenerated: tradeData.isAiGenerated,
                    krakenOrderId: orderResult.result.txid[0],
                    metadata: { kraken: true, pair: krakenSymbol }
                });
            }
            // Note: WebSocket broadcasting disabled for security - trade data should only be sent to authorized users
            res.json({ trade });
        }
        catch (error) {
            console.error('Trade error:', error);
            res.status(500).json({ error: 'Trade execution failed' });
        }
    });
    app.get('/api/trades', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Parse query parameters for pagination and filtering
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const symbol = req.query.symbol;
            const side = req.query.side;
            const status = req.query.status;
            const sortBy = req.query.sortBy || 'createdAt';
            const sortOrder = req.query.sortOrder || 'desc';
            // Fetch database trades
            let dbTrades = await storage_1.storage.getTrades(user.id, 1000); // Get more for merging
            // For live mode users with Kraken credentials, fetch and merge Kraken trade history
            if (!user.isDemo && user.krakenApiKey && user.krakenApiSecret) {
                try {
                    const apiKey = (0, secure_storage_1.decryptSensitive)(user.krakenApiKey);
                    const apiSecret = (0, secure_storage_1.decryptSensitive)(user.krakenApiSecret);
                    const krakenTrades = await getKrakenTradeHistory(apiKey, apiSecret, {});
                    // Create a map of database trades by krakenOrderId for deduplication
                    const dbTradesByKrakenId = new Map(dbTrades
                        .filter(t => t.krakenOrderId)
                        .map(t => [t.krakenOrderId, t]));
                    // Merge: Only add Kraken trades that aren't already in our database
                    for (const krakenTrade of krakenTrades) {
                        if (!dbTradesByKrakenId.has(krakenTrade.krakenOrderId)) {
                            // Add missing fields to match our schema
                            dbTrades.push({
                                ...krakenTrade,
                                userId: user.id,
                                portfolioId: '', // Kraken trades don't have portfolio mapping
                            });
                        }
                    }
                }
                catch (error) {
                    console.error('Error fetching Kraken trade history:', error);
                    // Continue with database trades only
                }
            }
            // Apply filters
            let filteredTrades = dbTrades;
            if (symbol) {
                filteredTrades = filteredTrades.filter(t => t.symbol === symbol);
            }
            if (side) {
                filteredTrades = filteredTrades.filter(t => t.side === side);
            }
            if (status) {
                filteredTrades = filteredTrades.filter(t => t.status === status);
            }
            // Apply sorting
            filteredTrades.sort((a, b) => {
                let aValue = a[sortBy];
                let bValue = b[sortBy];
                // Handle date sorting
                if (sortBy === 'createdAt' || sortBy === 'filledAt') {
                    aValue = aValue ? new Date(aValue).getTime() : 0;
                    bValue = bValue ? new Date(bValue).getTime() : 0;
                }
                // Convert to numbers for comparison if they aren't already
                if (typeof aValue === 'string')
                    aValue = parseFloat(aValue) || aValue;
                if (typeof bValue === 'string')
                    bValue = parseFloat(bValue) || bValue;
                const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                return sortOrder === 'asc' ? comparison : -comparison;
            });
            // Apply pagination
            const total = filteredTrades.length;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedTrades = filteredTrades.slice(startIndex, endIndex);
            res.json({
                trades: paginatedTrades,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        }
        catch (error) {
            console.error('Trade history error:', error);
            res.status(500).json({ error: 'Failed to get trades' });
        }
    });
    // Trading strategies
    app.get('/api/strategies', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const strategies = await storage_1.storage.getUserStrategies(user.id);
            res.json({ strategies });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get strategies' });
        }
    });
    // Settings routes
    app.post('/api/settings/kraken', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Validate request body
            const settingsSchema = zod_1.z.object({
                apiKey: zod_1.z.string().min(1, 'API key is required'),
                apiSecret: zod_1.z.string().min(1, 'API secret is required')
            });
            const { apiKey, apiSecret } = settingsSchema.parse(req.body);
            // Test API keys by making a balance request
            const balanceResult = await krakenRequest('/0/private/Balance', {}, apiKey, apiSecret);
            if (balanceResult.error && balanceResult.error.length > 0) {
                return res.status(400).json({ error: 'Invalid API keys' });
            }
            let encryptedKey;
            let encryptedSecret;
            try {
                encryptedKey = (0, secure_storage_1.encryptSensitive)(apiKey);
                encryptedSecret = (0, secure_storage_1.encryptSensitive)(apiSecret);
            }
            catch (cryptoError) {
                console.error('Failed to encrypt Kraken API keys', cryptoError);
                return res.status(500).json({ error: 'Server-side encryption error. Please contact support before retrying.' });
            }
            await storage_1.storage.updateUser(user.id, {
                krakenApiKey: encryptedKey,
                krakenApiSecret: encryptedSecret
            });
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update API keys' });
        }
    });
    app.post('/api/settings/mode', requireAuth, async (req, res) => {
        try {
            if (!req.firebaseUid) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await storage_1.storage.getUserByFirebaseUid(req.firebaseUid);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Validate request body
            const modeSchema = zod_1.z.object({
                isDemo: zod_1.z.boolean()
            });
            const { isDemo } = modeSchema.parse(req.body);
            await storage_1.storage.updateUser(user.id, { isDemo });
            const portfolio = await storage_1.storage.getPortfolio(user.id);
            if (portfolio) {
                await storage_1.storage.updatePortfolio(portfolio.id, { isDemo });
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update mode' });
        }
    });
    // Real-time price updates from Kraken API via WebSocket
    async function fetchAndBroadcastPrices() {
        try {
            const pairs = await getPreferredKrakenPairs();
            if (!pairs.length) {
                console.warn('No Kraken trading pairs available for price broadcast');
                return;
            }
            const data = await krakenRequest(`/0/public/Ticker?pair=${pairs.join(',')}`);
            if (data.error && data.error.length > 0) {
                console.error('Kraken API error:', data.error);
                return;
            }
            const priceUpdates = {};
            for (const [krakenSymbol, tickerData] of Object.entries(data.result)) {
                const displaySymbol = await resolveDisplaySymbol(krakenSymbol) || krakenSymbol;
                const ticker = tickerData;
                priceUpdates[displaySymbol] = {
                    price: parseFloat(ticker.c[0]),
                    change24h: parseFloat(ticker.c[0]) - parseFloat(ticker.o),
                    volume: parseFloat(ticker.v[1]),
                    high24h: parseFloat(ticker.h[1]),
                    low24h: parseFloat(ticker.l[1]),
                    timestamp: Date.now()
                };
            }
            broadcast({
                type: 'price_update',
                data: priceUpdates
            });
        }
        catch (error) {
            console.error('Failed to fetch prices for WebSocket:', error);
        }
    }
    // Broadcast real prices every 5 seconds
    setInterval(fetchAndBroadcastPrices, 5000);
    // Initial broadcast
    fetchAndBroadcastPrices();
    return httpServer;
}
