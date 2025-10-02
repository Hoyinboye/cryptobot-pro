var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiSignals: () => aiSignals,
  holdings: () => holdings,
  insertAiSignalSchema: () => insertAiSignalSchema,
  insertHoldingSchema: () => insertHoldingSchema,
  insertPortfolioSchema: () => insertPortfolioSchema,
  insertTradeSchema: () => insertTradeSchema,
  insertTradingStrategySchema: () => insertTradingStrategySchema,
  insertUserSchema: () => insertUserSchema,
  portfolios: () => portfolios,
  sanitizeUser: () => sanitizeUser,
  trades: () => trades,
  tradingStrategies: () => tradingStrategies,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  isDemo: boolean("is_demo").default(true),
  krakenApiKey: text("kraken_api_key"),
  krakenApiSecret: text("kraken_api_secret"),
  riskSettings: jsonb("risk_settings").default({}),
  createdAt: timestamp("created_at").defaultNow()
});
var portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  totalBalance: decimal("total_balance", { precision: 20, scale: 8 }).default("0"),
  availableBalance: decimal("available_balance", { precision: 20, scale: 8 }).default("0"),
  tradingBalance: decimal("trading_balance", { precision: 20, scale: 8 }).default("0"),
  pnl24h: decimal("pnl_24h", { precision: 20, scale: 8 }).default("0"),
  pnlPercentage24h: decimal("pnl_percentage_24h", { precision: 8, scale: 4 }).default("0"),
  isDemo: boolean("is_demo").default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});
var holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  symbol: text("symbol").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  averagePrice: decimal("average_price", { precision: 20, scale: 8 }).notNull(),
  currentPrice: decimal("current_price", { precision: 20, scale: 8 }).notNull(),
  value: decimal("value", { precision: 20, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default("0"),
  pnlPercentage: decimal("pnl_percentage", { precision: 8, scale: 4 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  // 'buy' or 'sell'
  type: text("type").notNull(),
  // 'market', 'limit', 'stop-loss'
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  fee: decimal("fee", { precision: 20, scale: 8 }).default("0"),
  status: text("status").notNull(),
  // 'pending', 'filled', 'cancelled'
  isDemo: boolean("is_demo").default(true),
  isAiGenerated: boolean("is_ai_generated").default(false),
  krakenOrderId: text("kraken_order_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  filledAt: timestamp("filled_at")
});
var aiSignals = pgTable("ai_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  signal: text("signal").notNull(),
  // 'buy', 'sell', 'hold'
  confidence: integer("confidence").notNull(),
  // 0-100
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }),
  targetPrice: decimal("target_price", { precision: 20, scale: 8 }),
  stopLoss: decimal("stop_loss", { precision: 20, scale: 8 }),
  riskReward: decimal("risk_reward", { precision: 8, scale: 2 }),
  reasoning: text("reasoning"),
  indicators: jsonb("indicators").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at")
});
var tradingStrategies = pgTable("trading_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  symbol: text("symbol").notNull(),
  strategy: text("strategy").notNull(),
  // 'rsi', 'moving_average', 'grid'
  parameters: jsonb("parameters").notNull(),
  isActive: boolean("is_active").default(false),
  performance: jsonb("performance").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  updatedAt: true
});
var insertHoldingSchema = createInsertSchema(holdings).omit({
  id: true,
  updatedAt: true
});
var insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  filledAt: true
});
var insertAiSignalSchema = createInsertSchema(aiSignals).omit({
  id: true,
  createdAt: true,
  expiresAt: true
});
var insertTradingStrategySchema = createInsertSchema(tradingStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
function sanitizeUser(user) {
  const { krakenApiKey, krakenApiSecret, riskSettings, ...publicUser } = user;
  return publicUser;
}

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, desc } from "drizzle-orm";
var PostgreSQLStorage = class {
  // User operations
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByFirebaseUid(firebaseUid) {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0];
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async updateUser(id, updates) {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }
  // Portfolio operations
  async getPortfolio(userId) {
    const result = await db.select().from(portfolios).where(eq(portfolios.userId, userId)).limit(1);
    return result[0];
  }
  async createPortfolio(insertPortfolio) {
    const result = await db.insert(portfolios).values(insertPortfolio).returning();
    return result[0];
  }
  async updatePortfolio(id, updates) {
    const result = await db.update(portfolios).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(portfolios.id, id)).returning();
    if (!result[0]) throw new Error("Portfolio not found");
    return result[0];
  }
  // Holdings operations
  async getHoldings(portfolioId) {
    return await db.select().from(holdings).where(eq(holdings.portfolioId, portfolioId));
  }
  async getHolding(portfolioId, symbol) {
    const result = await db.select().from(holdings).where(and(eq(holdings.portfolioId, portfolioId), eq(holdings.symbol, symbol))).limit(1);
    return result[0];
  }
  async getHoldingBySymbol(portfolioId, symbol) {
    return this.getHolding(portfolioId, symbol);
  }
  async createHolding(insertHolding) {
    const result = await db.insert(holdings).values(insertHolding).returning();
    return result[0];
  }
  async updateHolding(id, updates) {
    const result = await db.update(holdings).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(holdings.id, id)).returning();
    if (!result[0]) throw new Error("Holding not found");
    return result[0];
  }
  async deleteHolding(id) {
    await db.delete(holdings).where(eq(holdings.id, id));
  }
  // Trade operations
  async getTrades(userId, limit = 50) {
    return await db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.createdAt)).limit(limit);
  }
  async createTrade(insertTrade) {
    const result = await db.insert(trades).values(insertTrade).returning();
    return result[0];
  }
  async updateTrade(id, updates) {
    const updateData = { ...updates };
    if (updates.status === "filled") {
      updateData.filledAt = /* @__PURE__ */ new Date();
    }
    const result = await db.update(trades).set(updateData).where(eq(trades.id, id)).returning();
    if (!result[0]) throw new Error("Trade not found");
    return result[0];
  }
  // AI Signal operations
  async getActiveSignals(symbol) {
    if (symbol) {
      return await db.select().from(aiSignals).where(and(eq(aiSignals.isActive, true), eq(aiSignals.symbol, symbol))).orderBy(desc(aiSignals.createdAt));
    }
    return await db.select().from(aiSignals).where(eq(aiSignals.isActive, true)).orderBy(desc(aiSignals.createdAt));
  }
  async createAiSignal(insertSignal) {
    const result = await db.insert(aiSignals).values(insertSignal).returning();
    return result[0];
  }
  async updateAiSignal(id, updates) {
    const result = await db.update(aiSignals).set(updates).where(eq(aiSignals.id, id)).returning();
    if (!result[0]) throw new Error("AI Signal not found");
    return result[0];
  }
  async getAllSignals(options) {
    let query = db.select().from(aiSignals);
    const conditions = [];
    if (options?.symbol) {
      conditions.push(eq(aiSignals.symbol, options.symbol));
    }
    if (!options?.includeInactive) {
      conditions.push(eq(aiSignals.isActive, true));
    }
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    query = query.orderBy(desc(aiSignals.createdAt));
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    return await query;
  }
  // Trading Strategy operations
  async getUserStrategies(userId) {
    return await db.select().from(tradingStrategies).where(eq(tradingStrategies.userId, userId));
  }
  async createTradingStrategy(insertStrategy) {
    const result = await db.insert(tradingStrategies).values(insertStrategy).returning();
    return result[0];
  }
  async updateTradingStrategy(id, updates) {
    const result = await db.update(tradingStrategies).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(tradingStrategies.id, id)).returning();
    if (!result[0]) throw new Error("Trading Strategy not found");
    return result[0];
  }
};
var storage = new PostgreSQLStorage();

// server/routes.ts
import OpenAI from "openai";
import crypto from "crypto";
import { z } from "zod";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
  });
}
var adminAuth = getAuth();
function getKrakenSignature(path3, request, secret, nonce) {
  const message = nonce + request;
  const hash = crypto.createHash("sha256").update(message).digest();
  const hmac = crypto.createHmac("sha512", Buffer.from(secret, "base64"));
  hmac.update(path3 + hash);
  return hmac.digest("base64");
}
async function krakenRequest(endpoint, data = {}, apiKey, apiSecret) {
  const baseUrl = "https://api.kraken.com";
  if (apiKey && apiSecret) {
    const nonce = Date.now() * 1e3;
    const postDataObj = {
      nonce: nonce.toString(),
      ...data
    };
    const postData = new URLSearchParams(postDataObj).toString();
    const signature = getKrakenSignature(endpoint, postData, apiSecret, nonce.toString());
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "API-Key": apiKey,
        "API-Sign": signature,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: postData
    });
    return response.json();
  } else {
    const response = await fetch(`${baseUrl}${endpoint}`);
    return response.json();
  }
}
var openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required for AI features");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
}
var SYMBOL_MAP = {
  "BTCUSD": "XXBTZUSD",
  "ETHUSD": "XETHZUSD",
  "ADAUSD": "ADAUSD",
  "SOLUSD": "SOLUSD",
  "DOTUSD": "DOTUSD",
  "LINKUSD": "LINKUSD"
};
var DISPLAY_MAP = {
  "XXBTZUSD": "BTCUSD",
  "XETHZUSD": "ETHUSD",
  "ADAUSD": "ADAUSD",
  "SOLUSD": "SOLUSD",
  "DOTUSD": "DOTUSD",
  "LINKUSD": "LINKUSD"
};
async function validateRiskLimits(userId, portfolioId, tradeValue, tradeSide, symbol, riskSettings) {
  if (!riskSettings.enabled) {
    return { allowed: true };
  }
  if (riskSettings.maxPositionSize && tradeSide === "buy") {
    const maxPositionSize = parseFloat(riskSettings.maxPositionSize);
    if (tradeValue > maxPositionSize) {
      return {
        allowed: false,
        reason: `Trade value $${tradeValue.toFixed(2)} exceeds maximum position size limit of $${maxPositionSize.toFixed(2)}`
      };
    }
  }
  if (riskSettings.maxOpenPositions && tradeSide === "buy") {
    const holdings2 = await storage.getHoldings(portfolioId);
    const openPositions = holdings2.length;
    const existingHolding = holdings2.find((h) => h.symbol === symbol);
    if (openPositions >= riskSettings.maxOpenPositions && !existingHolding) {
      return {
        allowed: false,
        reason: `Maximum open positions limit reached (${openPositions}/${riskSettings.maxOpenPositions}). Cannot open new position in ${symbol}.`
      };
    }
  }
  if (riskSettings.maxDailyLoss) {
    const maxDailyLoss = parseFloat(riskSettings.maxDailyLoss);
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const allTrades = await storage.getTrades(userId, 1e3);
    const todayTrades = allTrades.filter(
      (t) => t.createdAt && new Date(t.createdAt) >= todayStart
    );
    let dailyPnL = 0;
    for (const trade of todayTrades) {
      const value = parseFloat(trade.amount) * parseFloat(trade.price);
      if (trade.side === "sell") {
        dailyPnL += value;
      } else {
        dailyPnL -= value;
      }
    }
    if (tradeSide === "buy") {
      dailyPnL -= tradeValue;
    } else {
      dailyPnL += tradeValue;
    }
    if (dailyPnL < 0 && Math.abs(dailyPnL) >= maxDailyLoss) {
      return {
        allowed: false,
        reason: `Daily loss limit would be exceeded ($${Math.abs(dailyPnL).toFixed(2)}/$${maxDailyLoss.toFixed(2)} including this trade)`
      };
    }
  }
  return { allowed: true };
}
async function getKrakenTradeHistory(apiKey, apiSecret, options = {}) {
  try {
    const params = {
      trades: true,
      // Include trade info
      ...options
    };
    const response = await krakenRequest("/0/private/ClosedOrders", params, apiKey, apiSecret);
    if (response.error && response.error.length > 0) {
      console.error("Kraken ClosedOrders error:", response.error);
      return [];
    }
    const orders = response.result?.closed || {};
    const transformedTrades = [];
    for (const [orderId, order] of Object.entries(orders)) {
      const orderData = order;
      const symbol = DISPLAY_MAP[orderData.descr.pair] || orderData.descr.pair;
      const side = orderData.descr.type;
      const type = orderData.descr.ordertype;
      const amount = orderData.vol;
      const price = orderData.descr.price || orderData.price || "0";
      const status = orderData.status === "closed" ? "filled" : orderData.status;
      transformedTrades.push({
        id: orderId,
        krakenOrderId: orderId,
        symbol,
        side,
        type,
        amount,
        price,
        status,
        createdAt: new Date(orderData.opentm * 1e3),
        filledAt: orderData.closetm ? new Date(orderData.closetm * 1e3) : null,
        metadata: {
          kraken: true,
          cost: orderData.cost,
          fee: orderData.fee,
          vol_exec: orderData.vol_exec
        }
      });
    }
    return transformedTrades;
  } catch (error) {
    console.error("Error fetching Kraken trade history:", error);
    return [];
  }
}
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const wsConnections = /* @__PURE__ */ new Set();
  wss.on("connection", (ws2) => {
    wsConnections.add(ws2);
    console.log("WebSocket client connected");
    ws2.on("close", () => {
      wsConnections.delete(ws2);
      console.log("WebSocket client disconnected");
    });
  });
  function broadcast(data) {
    wsConnections.forEach((ws2) => {
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.send(JSON.stringify(data));
      }
    });
  }
  app2.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: "cryptobot-backend"
    });
  });
  const requireAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No valid authorization token provided" });
      }
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      req.firebaseUid = decodedToken.uid;
      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No valid authorization token provided" });
      }
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email || "";
      const displayName = decodedToken.name || null;
      const photoURL = decodedToken.picture || null;
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        user = await storage.createUser({
          firebaseUid,
          email,
          displayName,
          photoURL,
          isDemo: true,
          krakenApiKey: null,
          krakenApiSecret: null,
          riskSettings: {}
        });
        await storage.createPortfolio({
          userId: user.id,
          totalBalance: "10000.00",
          // Demo balance
          availableBalance: "10000.00",
          tradingBalance: "0.00",
          pnl24h: "0.00",
          pnlPercentage24h: "0.00",
          isDemo: true
        });
      }
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });
  app2.put("/api/user/risk-settings", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { enabled, maxPositionSize, maxDailyLoss, maxOpenPositions } = req.body;
      const riskSettings = {};
      if (typeof enabled === "boolean") {
        riskSettings.enabled = enabled;
      }
      if (maxPositionSize !== void 0 && maxPositionSize !== null && maxPositionSize !== "") {
        const value = parseFloat(maxPositionSize);
        if (isNaN(value) || value <= 0) {
          return res.status(400).json({ error: "Max position size must be a positive number greater than zero" });
        }
        riskSettings.maxPositionSize = value.toString();
      }
      if (maxDailyLoss !== void 0 && maxDailyLoss !== null && maxDailyLoss !== "") {
        const value = parseFloat(maxDailyLoss);
        if (isNaN(value) || value <= 0) {
          return res.status(400).json({ error: "Max daily loss must be a positive number greater than zero" });
        }
        riskSettings.maxDailyLoss = value.toString();
      }
      if (maxOpenPositions !== void 0 && maxOpenPositions !== null && maxOpenPositions !== "") {
        const value = parseInt(maxOpenPositions, 10);
        if (isNaN(value) || !Number.isInteger(value) || value < 1) {
          return res.status(400).json({ error: "Max open positions must be an integer of at least 1" });
        }
        riskSettings.maxOpenPositions = value;
      }
      await storage.updateUser(user.id, { riskSettings });
      const updatedUser = await storage.getUserByFirebaseUid(req.firebaseUid);
      res.json({ user: sanitizeUser(updatedUser) });
    } catch (error) {
      console.error("Update risk settings error:", error);
      res.status(500).json({ error: "Failed to update risk settings" });
    }
  });
  app2.get("/api/portfolio", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const portfolio = await storage.getPortfolio(user.id);
      const holdings2 = portfolio ? await storage.getHoldings(portfolio.id) : [];
      res.json({ portfolio, holdings: holdings2 });
    } catch (error) {
      res.status(500).json({ error: "Failed to get portfolio" });
    }
  });
  app2.get("/api/market/ticker/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const krakenSymbol = SYMBOL_MAP[symbol] || symbol;
      const data = await krakenRequest(`/0/public/Ticker?pair=${krakenSymbol}`);
      if (data.error && data.error.length > 0) {
        return res.status(400).json({ error: data.error[0] });
      }
      const result = data.result;
      const pairKey = Object.keys(result)[0];
      const tickerData = result[pairKey];
      if (!tickerData) {
        return res.status(404).json({ error: "Symbol not found" });
      }
      const currentPrice = parseFloat(tickerData.c[0]);
      const openPrice = parseFloat(tickerData.o);
      const volume24h = parseFloat(tickerData.v[1]);
      const change24h = currentPrice - openPrice;
      const changePercent = openPrice > 0 ? (change24h / openPrice * 100).toFixed(2) : "0.00";
      const normalizedResponse = {
        symbol,
        price: currentPrice.toFixed(2),
        change24h: change24h.toFixed(2),
        changePercent,
        volume: volume24h.toFixed(2),
        timestamp: Date.now()
      };
      res.json(normalizedResponse);
    } catch (error) {
      console.error("Market data error:", error);
      res.status(500).json({ error: "Failed to get market data" });
    }
  });
  app2.get("/api/market/tickers", async (req, res) => {
    try {
      const pairs = "XXBTZUSD,XETHZUSD,ADAUSD,SOLUSD,DOTUSD,LINKUSD";
      const data = await krakenRequest(`/0/public/Ticker?pair=${pairs}`);
      if (data.error && data.error.length > 0) {
        return res.status(400).json({ error: data.error[0] });
      }
      const result = data.result;
      const normalizedTickers = [];
      const symbolMap = {
        "XXBTZUSD": "BTCUSD",
        "XETHZUSD": "ETHUSD",
        "ADAUSD": "ADAUSD",
        "SOLUSD": "SOLUSD",
        "DOTUSD": "DOTUSD",
        "LINKUSD": "LINKUSD"
      };
      for (const [pairKey, tickerData] of Object.entries(result)) {
        if (tickerData && typeof tickerData === "object") {
          const currentPrice = parseFloat(tickerData.c[0]);
          const openPrice = parseFloat(tickerData.o);
          const volume24h = parseFloat(tickerData.v[1]);
          const change24h = currentPrice - openPrice;
          const changePercent = openPrice > 0 ? (change24h / openPrice * 100).toFixed(2) : "0.00";
          normalizedTickers.push({
            symbol: symbolMap[pairKey] || pairKey,
            price: currentPrice.toFixed(2),
            change24h: change24h.toFixed(2),
            changePercent,
            volume: volume24h.toFixed(2),
            timestamp: Date.now()
          });
        }
      }
      res.json(normalizedTickers);
    } catch (error) {
      console.error("Market tickers error:", error);
      res.status(500).json({ error: "Failed to get market data" });
    }
  });
  app2.get("/api/market/ohlc/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { interval = "60" } = req.query;
      const krakenSymbol = SYMBOL_MAP[symbol] || symbol;
      const data = await krakenRequest(`/0/public/OHLC?pair=${krakenSymbol}&interval=${interval}`);
      if (data.error && data.error.length > 0) {
        return res.status(400).json({ error: data.error[0] });
      }
      const result = data.result;
      const pairKey = Object.keys(result).find((key) => key !== "last");
      if (!pairKey || !result[pairKey]) {
        return res.status(404).json({ error: "OHLC data not found" });
      }
      const ohlcData = result[pairKey].map((candle) => ({
        time: candle[0] * 1e3,
        // Convert to milliseconds
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
    } catch (error) {
      console.error("OHLC data error:", error);
      res.status(500).json({ error: "Failed to get OHLC data" });
    }
  });
  app2.get("/api/ai/signals", async (req, res) => {
    try {
      const { symbol, includeInactive, limit } = req.query;
      if (includeInactive === "true") {
        const signals = await storage.getAllSignals({
          symbol,
          includeInactive: true,
          limit: limit ? parseInt(limit, 10) : void 0
        });
        res.json({ signals });
      } else {
        const signals = await storage.getActiveSignals(symbol);
        res.json({ signals });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get AI signals" });
    }
  });
  app2.put("/api/ai/signals/:id/dismiss", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { id } = req.params;
      const signal = await storage.updateAiSignal(id, {
        isActive: false
      });
      res.json({ signal });
    } catch (error) {
      console.error("Failed to dismiss signal:", error);
      res.status(500).json({ error: "Failed to dismiss signal" });
    }
  });
  app2.post("/api/ai/analyze", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { symbol, timeframe = "60" } = req.body;
      const krakenSymbol = SYMBOL_MAP[symbol] || symbol;
      const marketData = await krakenRequest(`/0/public/Ticker?pair=${krakenSymbol}`);
      if (marketData.error && marketData.error.length > 0) {
        return res.status(400).json({ error: "Invalid symbol" });
      }
      const ohlcData = await krakenRequest(`/0/public/OHLC?pair=${krakenSymbol}&interval=${timeframe}`);
      if (ohlcData.error && ohlcData.error.length > 0) {
        return res.status(400).json({ error: "Failed to fetch historical data" });
      }
      const pairKey = Object.keys(marketData.result)[0];
      const ticker = marketData.result[pairKey];
      const currentPrice = parseFloat(ticker.c[0]);
      const volume24h = parseFloat(ticker.v[1]);
      const high24h = parseFloat(ticker.h[1]);
      const low24h = parseFloat(ticker.l[1]);
      const ohlcPairKey = Object.keys(ohlcData.result).find((key) => key !== "last");
      const candles = ohlcPairKey ? ohlcData.result[ohlcPairKey] : [];
      const closes = candles.slice(-50).map((c) => parseFloat(c[4]));
      const volumes = candles.slice(-50).map((c) => parseFloat(c[6]));
      const sma20 = closes.length >= 20 ? closes.slice(-20).reduce((sum, val) => sum + val, 0) / 20 : currentPrice;
      const ema12 = calculateEMA(closes, 12);
      const ema26 = calculateEMA(closes, 26);
      const rsi = calculateRSI(closes, 14);
      const macd = ema12 - ema26;
      const avgVolume = volumes.length > 0 ? volumes.reduce((sum, val) => sum + val, 0) / volumes.length : 0;
      const volumeTrend = avgVolume > 0 ? (volume24h - avgVolume) / avgVolume * 100 : 0;
      const priceChange24h = closes.length > 0 ? (currentPrice - closes[0]) / closes[0] * 100 : 0;
      const recent20High = Math.max(...closes.slice(-20));
      const recent20Low = Math.min(...closes.slice(-20));
      const analysisPrompt = `Analyze ${symbol} cryptocurrency and provide a professional trading recommendation.

CURRENT MARKET DATA:
- Current Price: $${currentPrice.toFixed(2)}
- 24h High: $${high24h.toFixed(2)}
- 24h Low: $${low24h.toFixed(2)}
- 24h Volume: ${volume24h.toFixed(2)}
- 24h Price Change: ${priceChange24h.toFixed(2)}%

TECHNICAL INDICATORS:
- RSI (14): ${rsi.toFixed(2)} ${rsi > 70 ? "(Overbought)" : rsi < 30 ? "(Oversold)" : "(Neutral)"}
- SMA (20): $${sma20.toFixed(2)} - Price is ${currentPrice > sma20 ? "above" : "below"} SMA
- EMA (12): $${ema12.toFixed(2)}
- EMA (26): $${ema26.toFixed(2)}
- MACD: ${macd.toFixed(2)} ${macd > 0 ? "(Bullish)" : "(Bearish)"}
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
      let signal = await storage.createAiSignal({
        symbol,
        // Store normalized symbol (BTCUSD, not XXBTZUSD)
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
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      signal = await storage.updateAiSignal(signal.id, { expiresAt });
      res.json({ signal, analysis, indicators });
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "AI analysis failed" });
    }
  });
  function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
  }
  function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }
  app2.post("/api/trade", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const portfolio = await storage.getPortfolio(user.id);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }
      const tradeData = insertTradeSchema.parse({
        userId: user.id,
        portfolioId: portfolio.id,
        ...req.body
      });
      let executionPrice = tradeData.price;
      if (tradeData.type === "market" && (!executionPrice || executionPrice === "0")) {
        const krakenSymbol = SYMBOL_MAP[tradeData.symbol] || tradeData.symbol;
        const tickerData = await krakenRequest(`/0/public/Ticker?pair=${krakenSymbol}`);
        if (tickerData.error && tickerData.error.length > 0) {
          return res.status(400).json({ error: "Failed to fetch current market price" });
        }
        const pairKey = Object.keys(tickerData.result)[0];
        const currentPrice = parseFloat(tickerData.result[pairKey].c[0]);
        executionPrice = currentPrice.toString();
      }
      tradeData.price = executionPrice;
      if (!tradeData.price || isNaN(parseFloat(tradeData.price)) || parseFloat(tradeData.price) <= 0) {
        return res.status(400).json({
          error: "Invalid execution price. Cannot process trade without a valid price."
        });
      }
      const tradeValue = parseFloat(tradeData.amount) * parseFloat(tradeData.price);
      const riskSettings = user.riskSettings || {};
      const riskCheck = await validateRiskLimits(
        user.id,
        portfolio.id,
        tradeValue,
        tradeData.side,
        tradeData.symbol,
        riskSettings
      );
      if (!riskCheck.allowed) {
        return res.status(403).json({
          error: "Trade blocked by risk management",
          reason: riskCheck.reason
        });
      }
      let trade;
      if (user.isDemo) {
        trade = await storage.createTrade({
          ...tradeData,
          status: "filled",
          krakenOrderId: `demo_${Date.now()}`,
          metadata: { demo: true }
        });
        const amount = parseFloat(tradeData.amount);
        const price = parseFloat(tradeData.price);
        const value = amount * price;
        const availableBalance = parseFloat(portfolio.availableBalance || "0");
        const tradingBalance = parseFloat(portfolio.tradingBalance || "0");
        if (tradeData.side === "buy") {
          const newAvailable = availableBalance - value;
          const newTrading = tradingBalance + value;
          await storage.updatePortfolio(portfolio.id, {
            availableBalance: newAvailable.toString(),
            tradingBalance: newTrading.toString(),
            totalBalance: (newAvailable + newTrading).toString()
          });
          const existingHolding = await storage.getHoldingBySymbol(portfolio.id, tradeData.symbol);
          if (existingHolding) {
            const currentValue = parseFloat(existingHolding.amount) * parseFloat(existingHolding.averagePrice);
            const newTotalAmount = parseFloat(existingHolding.amount) + amount;
            const newAveragePrice = ((currentValue + value) / newTotalAmount).toFixed(6);
            await storage.updateHolding(existingHolding.id, {
              amount: newTotalAmount.toString(),
              averagePrice: newAveragePrice,
              currentPrice: tradeData.price,
              value: (newTotalAmount * parseFloat(tradeData.price)).toFixed(2)
            });
          } else {
            await storage.createHolding({
              portfolioId: portfolio.id,
              symbol: tradeData.symbol,
              amount: tradeData.amount,
              averagePrice: tradeData.price,
              currentPrice: tradeData.price,
              value: value.toFixed(2)
            });
          }
        } else if (tradeData.side === "sell") {
          const newAvailable = availableBalance + value;
          const newTrading = Math.max(0, tradingBalance - value);
          await storage.updatePortfolio(portfolio.id, {
            availableBalance: newAvailable.toString(),
            tradingBalance: newTrading.toString(),
            totalBalance: (newAvailable + newTrading).toString()
          });
          const existingHolding = await storage.getHoldingBySymbol(portfolio.id, tradeData.symbol);
          if (existingHolding) {
            const newAmount = parseFloat(existingHolding.amount) - amount;
            if (newAmount <= 0) {
              await storage.deleteHolding(existingHolding.id);
            } else {
              await storage.updateHolding(existingHolding.id, {
                amount: newAmount.toString(),
                currentPrice: tradeData.price,
                value: (newAmount * parseFloat(tradeData.price)).toFixed(2)
              });
            }
          }
        }
      } else {
        if (!user.krakenApiKey || !user.krakenApiSecret) {
          return res.status(400).json({ error: "Kraken API keys not configured" });
        }
        const krakenSymbol = SYMBOL_MAP[tradeData.symbol] || tradeData.symbol;
        const orderData = {
          pair: krakenSymbol,
          type: tradeData.side,
          ordertype: tradeData.type,
          volume: tradeData.amount,
          ...tradeData.type === "limit" ? { price: tradeData.price } : {}
        };
        const orderResult = await krakenRequest(
          "/0/private/AddOrder",
          orderData,
          user.krakenApiKey,
          user.krakenApiSecret
        );
        if (orderResult.error && orderResult.error.length > 0) {
          return res.status(400).json({ error: orderResult.error[0] });
        }
        trade = await storage.createTrade({
          ...tradeData,
          status: "pending",
          krakenOrderId: orderResult.result.txid[0],
          metadata: { kraken: true }
        });
      }
      res.json({ trade });
    } catch (error) {
      console.error("Trade error:", error);
      res.status(500).json({ error: "Trade execution failed" });
    }
  });
  app2.get("/api/trades", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const symbol = req.query.symbol;
      const side = req.query.side;
      const status = req.query.status;
      const sortBy = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder || "desc";
      let dbTrades = await storage.getTrades(user.id, 1e3);
      if (!user.isDemo && user.krakenApiKey && user.krakenApiSecret) {
        try {
          const krakenTrades = await getKrakenTradeHistory(
            user.krakenApiKey,
            user.krakenApiSecret,
            {}
          );
          const dbTradesByKrakenId = new Map(
            dbTrades.filter((t) => t.krakenOrderId).map((t) => [t.krakenOrderId, t])
          );
          for (const krakenTrade of krakenTrades) {
            if (!dbTradesByKrakenId.has(krakenTrade.krakenOrderId)) {
              dbTrades.push({
                ...krakenTrade,
                userId: user.id,
                portfolioId: ""
                // Kraken trades don't have portfolio mapping
              });
            }
          }
        } catch (error) {
          console.error("Error fetching Kraken trade history:", error);
        }
      }
      let filteredTrades = dbTrades;
      if (symbol) {
        filteredTrades = filteredTrades.filter((t) => t.symbol === symbol);
      }
      if (side) {
        filteredTrades = filteredTrades.filter((t) => t.side === side);
      }
      if (status) {
        filteredTrades = filteredTrades.filter((t) => t.status === status);
      }
      filteredTrades.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        if (sortBy === "createdAt" || sortBy === "filledAt") {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }
        if (typeof aValue === "string") aValue = parseFloat(aValue) || aValue;
        if (typeof bValue === "string") bValue = parseFloat(bValue) || bValue;
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortOrder === "asc" ? comparison : -comparison;
      });
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
    } catch (error) {
      console.error("Trade history error:", error);
      res.status(500).json({ error: "Failed to get trades" });
    }
  });
  app2.get("/api/strategies", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const strategies = await storage.getUserStrategies(user.id);
      res.json({ strategies });
    } catch (error) {
      res.status(500).json({ error: "Failed to get strategies" });
    }
  });
  app2.post("/api/settings/kraken", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const settingsSchema = z.object({
        apiKey: z.string().min(1, "API key is required"),
        apiSecret: z.string().min(1, "API secret is required")
      });
      const { apiKey, apiSecret } = settingsSchema.parse(req.body);
      const balanceResult = await krakenRequest("/0/private/Balance", {}, apiKey, apiSecret);
      if (balanceResult.error && balanceResult.error.length > 0) {
        return res.status(400).json({ error: "Invalid API keys" });
      }
      await storage.updateUser(user.id, {
        krakenApiKey: apiKey,
        krakenApiSecret: apiSecret
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update API keys" });
    }
  });
  app2.post("/api/settings/mode", requireAuth, async (req, res) => {
    try {
      if (!req.firebaseUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUserByFirebaseUid(req.firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const modeSchema = z.object({
        isDemo: z.boolean()
      });
      const { isDemo } = modeSchema.parse(req.body);
      await storage.updateUser(user.id, { isDemo });
      const portfolio = await storage.getPortfolio(user.id);
      if (portfolio) {
        await storage.updatePortfolio(portfolio.id, { isDemo });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update mode" });
    }
  });
  async function fetchAndBroadcastPrices() {
    try {
      const pairs = "XXBTZUSD,XETHZUSD,ADAUSD,SOLUSD,DOTUSD,LINKUSD";
      const data = await krakenRequest(`/0/public/Ticker?pair=${pairs}`);
      if (data.error && data.error.length > 0) {
        console.error("Kraken API error:", data.error);
        return;
      }
      const priceUpdates = {};
      for (const [krakenSymbol, tickerData] of Object.entries(data.result)) {
        const displaySymbol = DISPLAY_MAP[krakenSymbol] || krakenSymbol;
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
        type: "price_update",
        data: priceUpdates
      });
    } catch (error) {
      console.error("Failed to fetch prices for WebSocket:", error);
    }
  }
  setInterval(fetchAndBroadcastPrices, 5e3);
  fetchAndBroadcastPrices();
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
