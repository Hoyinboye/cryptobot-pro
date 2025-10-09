import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  isDemo: boolean("is_demo").default(true),
  krakenApiKey: text("kraken_api_key"),
  krakenApiSecret: text("kraken_api_secret"),
  riskSettings: jsonb("risk_settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  totalBalance: decimal("total_balance", { precision: 20, scale: 8 }).default("0"),
  availableBalance: decimal("available_balance", { precision: 20, scale: 8 }).default("0"),
  tradingBalance: decimal("trading_balance", { precision: 20, scale: 8 }).default("0"),
  pnl24h: decimal("pnl_24h", { precision: 20, scale: 8 }).default("0"),
  pnlPercentage24h: decimal("pnl_percentage_24h", { precision: 8, scale: 4 }).default("0"),
  isDemo: boolean("is_demo").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  symbol: text("symbol").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  averagePrice: decimal("average_price", { precision: 20, scale: 8 }).notNull(),
  currentPrice: decimal("current_price", { precision: 20, scale: 8 }).notNull(),
  value: decimal("value", { precision: 20, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default("0"),
  pnlPercentage: decimal("pnl_percentage", { precision: 8, scale: 4 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' or 'sell'
  type: text("type").notNull(), // 'market', 'limit', 'stop-loss'
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  fee: decimal("fee", { precision: 20, scale: 8 }).default("0"),
  status: text("status").notNull(), // 'pending', 'filled', 'cancelled'
  isDemo: boolean("is_demo").default(true),
  isAiGenerated: boolean("is_ai_generated").default(false),
  krakenOrderId: text("kraken_order_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  filledAt: timestamp("filled_at"),
});

export const aiSignals = pgTable("ai_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  signal: text("signal").notNull(), // 'buy', 'sell', 'hold'
  confidence: integer("confidence").notNull(), // 0-100
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }),
  targetPrice: decimal("target_price", { precision: 20, scale: 8 }),
  stopLoss: decimal("stop_loss", { precision: 20, scale: 8 }),
  riskReward: decimal("risk_reward", { precision: 8, scale: 2 }),
  reasoning: text("reasoning"),
  indicators: jsonb("indicators").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const tradingStrategies = pgTable("trading_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  symbol: text("symbol").notNull(),
  strategy: text("strategy").notNull(), // 'rsi', 'moving_average', 'grid'
  parameters: jsonb("parameters").notNull(),
  isActive: boolean("is_active").default(false),
  performance: jsonb("performance").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
// Insert schemas - manually defined with proper required/optional fields
export const insertUserSchema = z.object({
  firebaseUid: z.string(),  // REQUIRED
  email: z.string().email(), // REQUIRED
  displayName: z.string().optional().nullable(),
  photoURL: z.string().optional().nullable(),
  isDemo: z.boolean().optional().default(true),
  krakenApiKey: z.string().optional().nullable(),
  krakenApiSecret: z.string().optional().nullable(),
  riskSettings: z.any().optional(),
});

export const insertPortfolioSchema = z.object({
  userId: z.string(), // REQUIRED
  totalBalance: z.string().optional(),
  availableBalance: z.string().optional(),
  tradingBalance: z.string().optional(),
  pnl24h: z.string().optional(),
  pnlPercentage24h: z.string().optional(),
  isDemo: z.boolean().optional(),
});

export const insertHoldingSchema = z.object({
  portfolioId: z.string(), // REQUIRED
  symbol: z.string(), // REQUIRED
  amount: z.string(), // REQUIRED
  averagePrice: z.string(), // REQUIRED
  currentPrice: z.string(), // REQUIRED
  value: z.string(), // REQUIRED
  pnl: z.string().optional(),
  pnlPercentage: z.string().optional(),
});

export const insertTradeSchema = z.object({
  userId: z.string(), // REQUIRED
  portfolioId: z.string(), // REQUIRED
  symbol: z.string(), // REQUIRED
  side: z.string(), // REQUIRED
  type: z.string(), // REQUIRED
  amount: z.string(), // REQUIRED
  price: z.string(), // REQUIRED
  status: z.enum(["pending", "filled", "cancelled"]).default("pending"), // Default to pending if not provided
  fee: z.string().optional(),
  isDemo: z.boolean().optional(),
  isAiGenerated: z.boolean().optional(),
  krakenOrderId: z.string().optional().nullable(),
  metadata: z.any().optional(),
});

export const insertAiSignalSchema = z.object({
  symbol: z.string(), // REQUIRED
  signal: z.string(), // REQUIRED
  confidence: z.number(), // REQUIRED
  entryPrice: z.string().optional(),
  targetPrice: z.string().optional(),
  stopLoss: z.string().optional(),
  riskReward: z.string().optional(),
  reasoning: z.string().optional().nullable(),
  indicators: z.any().optional(),
  isActive: z.boolean().optional(),
});

export const insertTradingStrategySchema = z.object({
  userId: z.string(), // REQUIRED
  name: z.string(), // REQUIRED
  symbol: z.string(), // REQUIRED
  strategy: z.string(), // REQUIRED
  parameters: z.any(), // REQUIRED
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  performance: z.any().optional(),
});

// Types - Select types from Drizzle
export type User = typeof users.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type AiSignal = typeof aiSignals.$inferSelect;
export type TradingStrategy = typeof tradingStrategies.$inferSelect;

// Insert types - manually defined to include optional fields
export type InsertUser = {
  firebaseUid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
  krakenApiKey?: string | null;
  krakenApiSecret?: string | null;
  riskSettings?: any;
};

export type InsertPortfolio = {
  userId: string;
  totalBalance?: string;
  availableBalance?: string;
  tradingBalance?: string;
  pnl24h?: string;
  pnlPercentage24h?: string;
  isDemo?: boolean;
};

export type InsertHolding = {
  portfolioId: string;
  symbol: string;
  amount: string;
  averagePrice: string;
  currentPrice: string;
  value: string;
  pnl?: string;
  pnlPercentage?: string;
};

export type InsertTrade = {
  userId: string;
  portfolioId: string;
  symbol: string;
  side: string;
  type: string;
  amount: string;
  price: string;
  status: string;
  fee?: string;
  isDemo?: boolean;
  isAiGenerated?: boolean;
  krakenOrderId?: string | null;
  metadata?: any;
};

export type InsertAiSignal = {
  symbol: string;
  signal: string;
  confidence: number;
  entryPrice?: string;
  targetPrice?: string;
  stopLoss?: string;
  riskReward?: string;
  reasoning?: string | null;
  indicators?: any;
  isActive?: boolean;
};

export type InsertTradingStrategy = {
  userId: string;
  name: string;
  symbol: string;
  strategy: string;
  parameters: any;
  description?: string | null;
  isActive?: boolean;
  performance?: any;
};  // ✅ FIX0.

// Public user type without sensitive data
export interface PublicUser {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  isDemo: boolean | null;
  createdAt: Date | null;
  riskSettings?: any;
}

// Function to convert User to PublicUser (sanitize sensitive data)
export function sanitizeUser(user: User): PublicUser {
  const { krakenApiKey, krakenApiSecret, ...publicUser } = user;
  return {
    ...publicUser,
    riskSettings: user.riskSettings || {}
  };
}
