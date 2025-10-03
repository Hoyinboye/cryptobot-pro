"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTradingStrategySchema = exports.insertAiSignalSchema = exports.insertTradeSchema = exports.insertHoldingSchema = exports.insertPortfolioSchema = exports.insertUserSchema = exports.tradingStrategies = exports.aiSignals = exports.trades = exports.holdings = exports.portfolios = exports.users = void 0;
exports.sanitizeUser = sanitizeUser;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const zod_1 = require("zod");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    firebaseUid: (0, pg_core_1.text)("firebase_uid").notNull().unique(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    displayName: (0, pg_core_1.text)("display_name"),
    photoURL: (0, pg_core_1.text)("photo_url"),
    isDemo: (0, pg_core_1.boolean)("is_demo").default(true),
    krakenApiKey: (0, pg_core_1.text)("kraken_api_key"),
    krakenApiSecret: (0, pg_core_1.text)("kraken_api_secret"),
    riskSettings: (0, pg_core_1.jsonb)("risk_settings").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.portfolios = (0, pg_core_1.pgTable)("portfolios", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id).notNull(),
    totalBalance: (0, pg_core_1.decimal)("total_balance", { precision: 20, scale: 8 }).default("0"),
    availableBalance: (0, pg_core_1.decimal)("available_balance", { precision: 20, scale: 8 }).default("0"),
    tradingBalance: (0, pg_core_1.decimal)("trading_balance", { precision: 20, scale: 8 }).default("0"),
    pnl24h: (0, pg_core_1.decimal)("pnl_24h", { precision: 20, scale: 8 }).default("0"),
    pnlPercentage24h: (0, pg_core_1.decimal)("pnl_percentage_24h", { precision: 8, scale: 4 }).default("0"),
    isDemo: (0, pg_core_1.boolean)("is_demo").default(true),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.holdings = (0, pg_core_1.pgTable)("holdings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    portfolioId: (0, pg_core_1.varchar)("portfolio_id").references(() => exports.portfolios.id).notNull(),
    symbol: (0, pg_core_1.text)("symbol").notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 20, scale: 8 }).notNull(),
    averagePrice: (0, pg_core_1.decimal)("average_price", { precision: 20, scale: 8 }).notNull(),
    currentPrice: (0, pg_core_1.decimal)("current_price", { precision: 20, scale: 8 }).notNull(),
    value: (0, pg_core_1.decimal)("value", { precision: 20, scale: 8 }).notNull(),
    pnl: (0, pg_core_1.decimal)("pnl", { precision: 20, scale: 8 }).default("0"),
    pnlPercentage: (0, pg_core_1.decimal)("pnl_percentage", { precision: 8, scale: 4 }).default("0"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.trades = (0, pg_core_1.pgTable)("trades", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id).notNull(),
    portfolioId: (0, pg_core_1.varchar)("portfolio_id").references(() => exports.portfolios.id).notNull(),
    symbol: (0, pg_core_1.text)("symbol").notNull(),
    side: (0, pg_core_1.text)("side").notNull(), // 'buy' or 'sell'
    type: (0, pg_core_1.text)("type").notNull(), // 'market', 'limit', 'stop-loss'
    amount: (0, pg_core_1.decimal)("amount", { precision: 20, scale: 8 }).notNull(),
    price: (0, pg_core_1.decimal)("price", { precision: 20, scale: 8 }).notNull(),
    fee: (0, pg_core_1.decimal)("fee", { precision: 20, scale: 8 }).default("0"),
    status: (0, pg_core_1.text)("status").notNull(), // 'pending', 'filled', 'cancelled'
    isDemo: (0, pg_core_1.boolean)("is_demo").default(true),
    isAiGenerated: (0, pg_core_1.boolean)("is_ai_generated").default(false),
    krakenOrderId: (0, pg_core_1.text)("kraken_order_id"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    filledAt: (0, pg_core_1.timestamp)("filled_at"),
});
exports.aiSignals = (0, pg_core_1.pgTable)("ai_signals", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    symbol: (0, pg_core_1.text)("symbol").notNull(),
    signal: (0, pg_core_1.text)("signal").notNull(), // 'buy', 'sell', 'hold'
    confidence: (0, pg_core_1.integer)("confidence").notNull(), // 0-100
    entryPrice: (0, pg_core_1.decimal)("entry_price", { precision: 20, scale: 8 }),
    targetPrice: (0, pg_core_1.decimal)("target_price", { precision: 20, scale: 8 }),
    stopLoss: (0, pg_core_1.decimal)("stop_loss", { precision: 20, scale: 8 }),
    riskReward: (0, pg_core_1.decimal)("risk_reward", { precision: 8, scale: 2 }),
    reasoning: (0, pg_core_1.text)("reasoning"),
    indicators: (0, pg_core_1.jsonb)("indicators").default({}),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
});
exports.tradingStrategies = (0, pg_core_1.pgTable)("trading_strategies", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id).notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    symbol: (0, pg_core_1.text)("symbol").notNull(),
    strategy: (0, pg_core_1.text)("strategy").notNull(), // 'rsi', 'moving_average', 'grid'
    parameters: (0, pg_core_1.jsonb)("parameters").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(false),
    performance: (0, pg_core_1.jsonb)("performance").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Insert schemas
// Insert schemas - manually defined with proper required/optional fields
exports.insertUserSchema = zod_1.z.object({
    firebaseUid: zod_1.z.string(), // REQUIRED
    email: zod_1.z.string().email(), // REQUIRED
    displayName: zod_1.z.string().optional().nullable(),
    photoURL: zod_1.z.string().optional().nullable(),
    isDemo: zod_1.z.boolean().optional().default(true),
    krakenApiKey: zod_1.z.string().optional().nullable(),
    krakenApiSecret: zod_1.z.string().optional().nullable(),
    riskSettings: zod_1.z.any().optional(),
});
exports.insertPortfolioSchema = zod_1.z.object({
    userId: zod_1.z.string(), // REQUIRED
    totalBalance: zod_1.z.string().optional(),
    availableBalance: zod_1.z.string().optional(),
    tradingBalance: zod_1.z.string().optional(),
    pnl24h: zod_1.z.string().optional(),
    pnlPercentage24h: zod_1.z.string().optional(),
    isDemo: zod_1.z.boolean().optional(),
});
exports.insertHoldingSchema = zod_1.z.object({
    portfolioId: zod_1.z.string(), // REQUIRED
    symbol: zod_1.z.string(), // REQUIRED
    amount: zod_1.z.string(), // REQUIRED
    averagePrice: zod_1.z.string(), // REQUIRED
    currentPrice: zod_1.z.string(), // REQUIRED
    value: zod_1.z.string(), // REQUIRED
    pnl: zod_1.z.string().optional(),
    pnlPercentage: zod_1.z.string().optional(),
});
exports.insertTradeSchema = zod_1.z.object({
    userId: zod_1.z.string(), // REQUIRED
    portfolioId: zod_1.z.string(), // REQUIRED
    symbol: zod_1.z.string(), // REQUIRED
    side: zod_1.z.string(), // REQUIRED
    type: zod_1.z.string(), // REQUIRED
    amount: zod_1.z.string(), // REQUIRED
    price: zod_1.z.string(), // REQUIRED
    status: zod_1.z.string(), // REQUIRED
    fee: zod_1.z.string().optional(),
    isDemo: zod_1.z.boolean().optional(),
    isAiGenerated: zod_1.z.boolean().optional(),
    krakenOrderId: zod_1.z.string().optional().nullable(),
    metadata: zod_1.z.any().optional(),
});
exports.insertAiSignalSchema = zod_1.z.object({
    symbol: zod_1.z.string(), // REQUIRED
    signal: zod_1.z.string(), // REQUIRED
    confidence: zod_1.z.number(), // REQUIRED
    entryPrice: zod_1.z.string().optional(),
    targetPrice: zod_1.z.string().optional(),
    stopLoss: zod_1.z.string().optional(),
    riskReward: zod_1.z.string().optional(),
    reasoning: zod_1.z.string().optional().nullable(),
    indicators: zod_1.z.any().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.insertTradingStrategySchema = zod_1.z.object({
    userId: zod_1.z.string(), // REQUIRED
    name: zod_1.z.string(), // REQUIRED
    symbol: zod_1.z.string(), // REQUIRED
    strategy: zod_1.z.string(), // REQUIRED
    parameters: zod_1.z.any(), // REQUIRED
    description: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
    performance: zod_1.z.any().optional(),
});
// Function to convert User to PublicUser (sanitize sensitive data)
function sanitizeUser(user) {
    const { krakenApiKey, krakenApiSecret, riskSettings, ...publicUser } = user;
    return publicUser;
}
