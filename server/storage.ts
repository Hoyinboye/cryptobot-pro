import { 
  type User, 
  type InsertUser,
  type Portfolio,
  type InsertPortfolio,
  type Holding,
  type InsertHolding,
  type Trade,
  type InsertTrade,
  type AiSignal,
  type InsertAiSignal,
  type TradingStrategy,
  type InsertTradingStrategy,
  users,
  portfolios,
  holdings,
  trades,
  aiSignals,
  tradingStrategies
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Portfolio operations
  getPortfolio(userId: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio>;

  // Holdings operations
  getHoldings(portfolioId: string): Promise<Holding[]>;
  getHolding(portfolioId: string, symbol: string): Promise<Holding | undefined>;
  getHoldingBySymbol(portfolioId: string, symbol: string): Promise<Holding | undefined>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  updateHolding(id: string, updates: Partial<Holding>): Promise<Holding>;
  deleteHolding(id: string): Promise<void>;

  // Trade operations
  getTrades(userId: string, limit?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, updates: Partial<Trade>): Promise<Trade>;

  // AI Signal operations
  getActiveSignals(symbol?: string): Promise<AiSignal[]>;
  getAllSignals(options?: { symbol?: string; includeInactive?: boolean; limit?: number }): Promise<AiSignal[]>;
  createAiSignal(signal: InsertAiSignal): Promise<AiSignal>;
  updateAiSignal(id: string, updates: Partial<AiSignal>): Promise<AiSignal>;

  // Trading Strategy operations
  getUserStrategies(userId: string): Promise<TradingStrategy[]>;
  createTradingStrategy(strategy: InsertTradingStrategy): Promise<TradingStrategy>;
  updateTradingStrategy(id: string, updates: Partial<TradingStrategy>): Promise<TradingStrategy>;
}

export class PostgreSQLStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  // Portfolio operations
  async getPortfolio(userId: string): Promise<Portfolio | undefined> {
    const result = await db.select().from(portfolios).where(eq(portfolios.userId, userId)).limit(1);
    return result[0];
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const result = await db.insert(portfolios).values(insertPortfolio).returning();
    return result[0];
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio> {
    const result = await db.update(portfolios).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(portfolios.id, id)).returning();
    if (!result[0]) throw new Error("Portfolio not found");
    return result[0];
  }

  // Holdings operations
  async getHoldings(portfolioId: string): Promise<Holding[]> {
    return await db.select().from(holdings).where(eq(holdings.portfolioId, portfolioId));
  }

  async getHolding(portfolioId: string, symbol: string): Promise<Holding | undefined> {
    const result = await db.select().from(holdings)
      .where(and(eq(holdings.portfolioId, portfolioId), eq(holdings.symbol, symbol)))
      .limit(1);
    return result[0];
  }

  async getHoldingBySymbol(portfolioId: string, symbol: string): Promise<Holding | undefined> {
    return this.getHolding(portfolioId, symbol);
  }

  async createHolding(insertHolding: InsertHolding): Promise<Holding> {
    const result = await db.insert(holdings).values(insertHolding).returning();
    return result[0];
  }

  async updateHolding(id: string, updates: Partial<Holding>): Promise<Holding> {
    const result = await db.update(holdings).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(holdings.id, id)).returning();
    if (!result[0]) throw new Error("Holding not found");
    return result[0];
  }

  async deleteHolding(id: string): Promise<void> {
    await db.delete(holdings).where(eq(holdings.id, id));
  }

  // Trade operations
  async getTrades(userId: string, limit: number = 50): Promise<Trade[]> {
    return await db.select().from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.createdAt))
      .limit(limit);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const result = await db.insert(trades).values(insertTrade).returning();
    return result[0];
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    const updateData: any = { ...updates };
    if (updates.status === 'filled') {
      updateData.filledAt = new Date();
    }
    
    const result = await db.update(trades).set(updateData).where(eq(trades.id, id)).returning();
    if (!result[0]) throw new Error("Trade not found");
    return result[0];
  }

  // AI Signal operations
  async getActiveSignals(symbol?: string): Promise<AiSignal[]> {
    if (symbol) {
      return await db.select().from(aiSignals)
        .where(and(eq(aiSignals.isActive, true), eq(aiSignals.symbol, symbol)))
        .orderBy(desc(aiSignals.createdAt));
    }
    
    return await db.select().from(aiSignals)
      .where(eq(aiSignals.isActive, true))
      .orderBy(desc(aiSignals.createdAt));
  }

  async createAiSignal(insertSignal: InsertAiSignal): Promise<AiSignal> {
    const result = await db.insert(aiSignals).values(insertSignal).returning();
    return result[0];
  }

  async updateAiSignal(id: string, updates: Partial<AiSignal>): Promise<AiSignal> {
    const result = await db.update(aiSignals).set(updates).where(eq(aiSignals.id, id)).returning();
    if (!result[0]) throw new Error("AI Signal not found");
    return result[0];
  }

  async getAllSignals(options?: {
    symbol?: string;
    includeInactive?: boolean;
    limit?: number;
  }): Promise<AiSignal[]> {
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
  async getUserStrategies(userId: string): Promise<TradingStrategy[]> {
    return await db.select().from(tradingStrategies).where(eq(tradingStrategies.userId, userId));
  }

  async createTradingStrategy(insertStrategy: InsertTradingStrategy): Promise<TradingStrategy> {
    const result = await db.insert(tradingStrategies).values(insertStrategy).returning();
    return result[0];
  }

  async updateTradingStrategy(id: string, updates: Partial<TradingStrategy>): Promise<TradingStrategy> {
    const result = await db.update(tradingStrategies).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(tradingStrategies.id, id)).returning();
    if (!result[0]) throw new Error("Trading Strategy not found");
    return result[0];
  }
}

// Keep the in-memory implementation for backwards compatibility
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private portfolios: Map<string, Portfolio> = new Map();
  private holdings: Map<string, Holding> = new Map();
  private trades: Map<string, Trade> = new Map();
  private aiSignals: Map<string, AiSignal> = new Map();
  private strategies: Map<string, TradingStrategy> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      displayName: insertUser.displayName || null,
      photoURL: insertUser.photoURL || null,
      krakenApiKey: insertUser.krakenApiKey || null,
      krakenApiSecret: insertUser.krakenApiSecret || null,
      isDemo: insertUser.isDemo ?? true,
      riskSettings: insertUser.riskSettings || {},
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Portfolio operations
  async getPortfolio(userId: string): Promise<Portfolio | undefined> {
    return Array.from(this.portfolios.values()).find(p => p.userId === userId);
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const id = randomUUID();
    const portfolio: Portfolio = { 
      ...insertPortfolio,
      isDemo: insertPortfolio.isDemo ?? true,
      totalBalance: insertPortfolio.totalBalance || "0",
      availableBalance: insertPortfolio.availableBalance || "0",
      tradingBalance: insertPortfolio.tradingBalance || "0",
      pnl24h: insertPortfolio.pnl24h || "0",
      pnlPercentage24h: insertPortfolio.pnlPercentage24h || "0",
      id,
      updatedAt: new Date()
    };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio> {
    const portfolio = this.portfolios.get(id);
    if (!portfolio) throw new Error("Portfolio not found");
    const updatedPortfolio = { ...portfolio, ...updates, updatedAt: new Date() };
    this.portfolios.set(id, updatedPortfolio);
    return updatedPortfolio;
  }

  // Holdings operations
  async getHoldings(portfolioId: string): Promise<Holding[]> {
    return Array.from(this.holdings.values()).filter(h => h.portfolioId === portfolioId);
  }

  async getHolding(portfolioId: string, symbol: string): Promise<Holding | undefined> {
    return Array.from(this.holdings.values()).find(h => h.portfolioId === portfolioId && h.symbol === symbol);
  }

  async getHoldingBySymbol(portfolioId: string, symbol: string): Promise<Holding | undefined> {
    return this.getHolding(portfolioId, symbol);
  }

  async createHolding(insertHolding: InsertHolding): Promise<Holding> {
    const id = randomUUID();
    const holding: Holding = { 
      ...insertHolding,
      pnl: insertHolding.pnl || "0",
      pnlPercentage: insertHolding.pnlPercentage || "0",
      id,
      updatedAt: new Date()
    };
    this.holdings.set(id, holding);
    return holding;
  }

  async updateHolding(id: string, updates: Partial<Holding>): Promise<Holding> {
    const holding = this.holdings.get(id);
    if (!holding) throw new Error("Holding not found");
    const updatedHolding = { ...holding, ...updates, updatedAt: new Date() };
    this.holdings.set(id, updatedHolding);
    return updatedHolding;
  }

  async deleteHolding(id: string): Promise<void> {
    this.holdings.delete(id);
  }

  // Trade operations
  async getTrades(userId: string, limit: number = 50): Promise<Trade[]> {
    const userTrades = Array.from(this.trades.values()).filter(t => t.userId === userId);
    return userTrades.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, limit);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const trade: Trade = { 
      ...insertTrade,
      fee: insertTrade.fee || "0",
      isDemo: insertTrade.isDemo ?? true,
      isAiGenerated: insertTrade.isAiGenerated ?? false,
      krakenOrderId: insertTrade.krakenOrderId || null,
      metadata: insertTrade.metadata || {},
      id,
      createdAt: new Date(),
      filledAt: null
    };
    this.trades.set(id, trade);
    return trade;
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    const trade = this.trades.get(id);
    if (!trade) throw new Error("Trade not found");
    const updatedTrade = { ...trade, ...updates };
    if (updates.status === 'filled' && !trade.filledAt) {
      updatedTrade.filledAt = new Date();
    }
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  // AI Signal operations
  async getActiveSignals(symbol?: string): Promise<AiSignal[]> {
    let signals = Array.from(this.aiSignals.values()).filter(s => s.isActive);
    if (symbol) {
      signals = signals.filter(s => s.symbol === symbol);
    }
    return signals.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createAiSignal(insertSignal: InsertAiSignal): Promise<AiSignal> {
    const id = randomUUID();
    const signal: AiSignal = { 
      ...insertSignal,
      entryPrice: insertSignal.entryPrice || "0",
      targetPrice: insertSignal.targetPrice || "0",
      stopLoss: insertSignal.stopLoss || "0",
      riskReward: insertSignal.riskReward || "0",
      reasoning: insertSignal.reasoning || null,
      indicators: insertSignal.indicators || {},
      isActive: insertSignal.isActive ?? true,
      id,
      createdAt: new Date(),
      expiresAt: null
    };
    this.aiSignals.set(id, signal);
    return signal;
  }

  async updateAiSignal(id: string, updates: Partial<AiSignal>): Promise<AiSignal> {
    const signal = this.aiSignals.get(id);
    if (!signal) throw new Error("AI Signal not found");
    const updatedSignal = { ...signal, ...updates };
    this.aiSignals.set(id, updatedSignal);
    return updatedSignal;
  }

  async getAllSignals(options?: {
    symbol?: string;
    includeInactive?: boolean;
    limit?: number;
  }): Promise<AiSignal[]> {
    let signals = Array.from(this.aiSignals.values());
    
    if (options?.symbol) {
      signals = signals.filter(s => s.symbol === options.symbol);
    }
    
    if (!options?.includeInactive) {
      signals = signals.filter(s => s.isActive);
    }
    
    signals = signals.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    if (options?.limit) {
      signals = signals.slice(0, options.limit);
    }
    
    return signals;
  }

  // Trading Strategy operations
  async getUserStrategies(userId: string): Promise<TradingStrategy[]> {
    return Array.from(this.strategies.values()).filter(s => s.userId === userId);
  }

  async createTradingStrategy(insertStrategy: InsertTradingStrategy): Promise<TradingStrategy> {
    const id = randomUUID();
    const strategy: TradingStrategy = { 
      ...insertStrategy,
      description: insertStrategy.description || null,
      isActive: insertStrategy.isActive ?? false,
      performance: insertStrategy.performance || {},
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.strategies.set(id, strategy);
    return strategy;
  }

  async updateTradingStrategy(id: string, updates: Partial<TradingStrategy>): Promise<TradingStrategy> {
    const strategy = this.strategies.get(id);
    if (!strategy) throw new Error("Trading Strategy not found");
    const updatedStrategy = { ...strategy, ...updates, updatedAt: new Date() };
    this.strategies.set(id, updatedStrategy);
    return updatedStrategy;
  }
}

// Use PostgreSQL storage for production
export const storage = new PostgreSQLStorage();