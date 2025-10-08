"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopularPairs = exports.resolveKrakenPairs = exports.getDisplaySymbol = exports.getKrakenSymbol = exports.displayFromAssets = exports.displayFromAltname = exports.LEGACY_SYMBOL_MAP = exports.normalizeAsset = void 0;
const ASSET_ENDPOINT = 'https://api.kraken.com/0/public/AssetPairs';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
exports.normalizeAsset = normalizeAsset;
const LEGACY_SYMBOL_MAP = {
    BTCUSD: 'XXBTZUSD',
    ETHUSD: 'XETHZUSD',
    ADAUSD: 'ADAUSD',
    SOLUSD: 'SOLUSD',
    DOTUSD: 'DOTUSD',
    LINKUSD: 'LINKUSD'
};
exports.LEGACY_SYMBOL_MAP = LEGACY_SYMBOL_MAP;
let symbolCache = {
    fetchedAt: 0,
    toKraken: new Map(),
    toDisplay: new Map(),
    ordered: [],
};
let inflightPromise = null;
function normalizeAsset(code) {
    if (!code) {
        return '';
    }
    const upper = code.toUpperCase();
    const alias = {
        XBT: 'BTC',
        XXBT: 'BTC',
        ZUSD: 'USD',
        ZEUR: 'EUR',
        ZGBP: 'GBP',
        ZJPY: 'JPY',
        ZCAD: 'CAD',
        ZAUD: 'AUD',
        ZCHF: 'CHF',
        XETH: 'ETH',
        XXRP: 'XRP',
        XLTC: 'LTC',
        XDG: 'DOGE',
        XMR: 'XMR',
        XTZ: 'XTZ',
        XICN: 'ICN',
        XREP: 'REP',
    };
    if (alias[upper]) {
        return alias[upper];
    }
    const trimmed = upper.replace(/^[XZ]/, '');
    if (alias[trimmed]) {
        return alias[trimmed];
    }
    return trimmed;
}
function displayFromAltname(altname) {
    if (!altname) {
        return altname;
    }
    const sanitized = altname.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (sanitized.length <= 3) {
        return sanitized;
    }
    const quoteCandidates = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'USDT', 'USDC', 'ETH', 'BTC'];
    for (const quote of quoteCandidates) {
        if (sanitized.endsWith(quote)) {
            const base = sanitized.slice(0, sanitized.length - quote.length);
            return `${normalizeAsset(base)}${normalizeAsset(quote)}`;
        }
    }
    const base = sanitized.slice(0, sanitized.length - 3);
    const quote = sanitized.slice(-3);
    return `${normalizeAsset(base)}${normalizeAsset(quote)}`;
}
exports.displayFromAltname = displayFromAltname;
function displayFromAssets(base, quote) {
    return `${normalizeAsset(base)}${normalizeAsset(quote)}`;
}
exports.displayFromAssets = displayFromAssets;
async function loadSymbolCache() {
    const now = Date.now();
    if (process.env.KRAKEN_STUB === 'true' || process.env.NODE_ENV === 'test') {
        if (symbolCache.toKraken.size === 0) {
            for (const [symbol, pair] of Object.entries(LEGACY_SYMBOL_MAP)) {
                symbolCache.toKraken.set(symbol, pair);
                symbolCache.toDisplay.set(pair, displayFromAltname(symbol));
                symbolCache.ordered.push({
                    pair,
                    display: displayFromAltname(symbol),
                    base: normalizeAsset(symbol.slice(0, -3)),
                    quote: normalizeAsset(symbol.slice(-3)),
                    altname: symbol,
                });
            }
            symbolCache.fetchedAt = now;
        }
        return symbolCache;
    }
    if (symbolCache.toKraken.size > 0 && now - symbolCache.fetchedAt < CACHE_TTL_MS) {
        return symbolCache;
    }
    if (inflightPromise) {
        return inflightPromise;
    }
    inflightPromise = fetch(ASSET_ENDPOINT)
        .then(async (response) => {
        if (!response.ok) {
            throw new Error(`Failed to load Kraken asset pairs: ${response.status}`);
        }
        const payload = await response.json();
        const result = payload.result || {};
        const toKraken = new Map();
        const toDisplay = new Map();
        const ordered = [];
        for (const [pair, info] of Object.entries(result)) {
            if (pair.includes('.d')) {
                // Skip dark pool pairs
                continue;
            }
            const pairInfo = info;
            const display = displayFromAssets(pairInfo.base, pairInfo.quote);
            const altDisplay = displayFromAltname(pairInfo.altname || '');
            toKraken.set(display, pair);
            toKraken.set(display.replace(/[^A-Za-z0-9]/g, ''), pair);
            if (pairInfo.altname) {
                toKraken.set(pairInfo.altname.toUpperCase(), pair);
                toKraken.set(altDisplay, pair);
            }
            toKraken.set(pair.toUpperCase(), pair);
            toDisplay.set(pair, display);
            ordered.push({
                pair,
                display,
                base: normalizeAsset(pairInfo.base),
                quote: normalizeAsset(pairInfo.quote),
                altname: pairInfo.altname,
            });
        }
        symbolCache = {
            fetchedAt: Date.now(),
            toKraken,
            toDisplay,
            ordered,
        };
        inflightPromise = null;
        return symbolCache;
    })
        .catch((error) => {
        inflightPromise = null;
        console.error('Failed to refresh Kraken asset pairs', error);
        return symbolCache;
    });
    return inflightPromise;
}
async function getKrakenSymbol(symbol) {
    if (!symbol) {
        return null;
    }
    const normalized = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cache = await loadSymbolCache();
    return cache.toKraken.get(normalized) || LEGACY_SYMBOL_MAP[normalized] || null;
}
exports.getKrakenSymbol = getKrakenSymbol;
async function getDisplaySymbol(krakenPair) {
    if (!krakenPair) {
        return null;
    }
    const cache = await loadSymbolCache();
    const direct = cache.toDisplay.get(krakenPair);
    if (direct) {
        return direct;
    }
    return cache.toDisplay.get(krakenPair.toUpperCase()) || displayFromAltname(krakenPair);
}
exports.getDisplaySymbol = getDisplaySymbol;
async function resolveKrakenPairs(symbols) {
    if (!symbols || symbols.length === 0) {
        return [];
    }
    const cache = await loadSymbolCache();
    const resolved = new Set();
    for (const symbol of symbols) {
        if (!symbol) {
            continue;
        }
        const normalized = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const match = cache.toKraken.get(normalized);
        if (match) {
            resolved.add(match);
            continue;
        }
        if (LEGACY_SYMBOL_MAP[normalized]) {
            resolved.add(LEGACY_SYMBOL_MAP[normalized]);
        }
    }
    return Array.from(resolved);
}
exports.resolveKrakenPairs = resolveKrakenPairs;
async function getPopularPairs(limit = 6) {
    const cache = await loadSymbolCache();
    if (!cache.ordered.length) {
        return [];
    }
    const usdPairs = cache.ordered.filter(entry => entry.display.endsWith('USD'));
    const primary = usdPairs.slice(0, limit);
    if (primary.length >= limit) {
        return primary.map(entry => entry.pair);
    }
    const fallback = cache.ordered.slice(0, limit);
    const combined = [...new Set([...primary, ...fallback])].slice(0, limit);
    if (combined.length > 0) {
        return combined.map(entry => entry.pair);
    }
    return Object.values(LEGACY_SYMBOL_MAP).slice(0, limit);
}
exports.getPopularPairs = getPopularPairs;
