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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  updatedAt: true,
});

export const insertHoldingSchema = createInsertSchema(holdings).omit({
  id: true,
  updatedAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  filledAt: true,
});

export const insertAiSignalSchema = createInsertSchema(aiSignals).omit({
  id: true,
  createdAt: true,
  expiresAt: true,
});

export const insertTradingStrategySchema = createInsertSchema(tradingStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type Holding = typeof holdings.$inferSelect;
export type InsertHolding = z.infer<typeof insertHoldingSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type AiSignal = typeof aiSignals.$inferSelect;
export type InsertAiSignal = z.infer<typeof insertAiSignalSchema>;

export type TradingStrategy = typeof tradingStrategies.$inferSelect;
export type InsertTradingStrategy = z.infer<typeof insertTradingStrategySchema>;

// Public user type without sensitive data
export interface PublicUser {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  isDemo: boolean | null;
  createdAt: Date | null;
}

// Function to convert User to PublicUser (sanitize sensitive data)
export function sanitizeUser(user: User): PublicUser {
  const { krakenApiKey, krakenApiSecret, riskSettings, ...publicUser } = user;
  return publicUser;
}
