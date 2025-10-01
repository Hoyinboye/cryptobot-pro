import type { Trade, Holding } from "@shared/schema";

export interface PnLCalculation {
  amount: number;
  percentage: number;
  isProfit: boolean;
}

/**
 * Calculate P&L for a single trade based on current market price
 */
export function calculateTradePnL(
  trade: Trade, 
  currentPrice: number
): PnLCalculation {
  const entryPrice = parseFloat(trade.price);
  const amount = parseFloat(trade.amount);
  
  let pnlAmount: number;
  
  if (trade.side === 'buy') {
    // For buy trades: P&L = (current_price - entry_price) * amount
    pnlAmount = (currentPrice - entryPrice) * amount;
  } else {
    // For sell trades: P&L = (entry_price - current_price) * amount
    pnlAmount = (entryPrice - currentPrice) * amount;
  }
  
  const pnlPercentage = entryPrice > 0 ? (pnlAmount / (entryPrice * amount)) * 100 : 0;
  
  return {
    amount: pnlAmount,
    percentage: pnlPercentage,
    isProfit: pnlAmount >= 0
  };
}

/**
 * Calculate P&L for a holding based on current market price
 */
export function calculateHoldingPnL(
  holding: Holding,
  currentPrice: number
): PnLCalculation {
  const avgPrice = parseFloat(holding.averagePrice);
  const amount = parseFloat(holding.amount);
  
  const pnlAmount = (currentPrice - avgPrice) * amount;
  const pnlPercentage = avgPrice > 0 ? (pnlAmount / (avgPrice * amount)) * 100 : 0;
  
  return {
    amount: pnlAmount,
    percentage: pnlPercentage,
    isProfit: pnlAmount >= 0
  };
}

/**
 * Calculate total portfolio P&L from all holdings
 */
export function calculatePortfolioPnL(
  holdings: Holding[],
  marketPrices: { [symbol: string]: number }
): PnLCalculation {
  let totalPnL = 0;
  let totalInvestment = 0;
  
  for (const holding of holdings) {
    const currentPrice = marketPrices[holding.symbol] || parseFloat(holding.currentPrice);
    const avgPrice = parseFloat(holding.averagePrice);
    const amount = parseFloat(holding.amount);
    
    const holdingPnL = (currentPrice - avgPrice) * amount;
    const investment = avgPrice * amount;
    
    totalPnL += holdingPnL;
    totalInvestment += investment;
  }
  
  const pnlPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;
  
  return {
    amount: totalPnL,
    percentage: pnlPercentage,
    isProfit: totalPnL >= 0
  };
}

/**
 * Format P&L amount for display
 */
export function formatPnL(pnl: PnLCalculation, showSign: boolean = true): string {
  const sign = showSign ? (pnl.isProfit ? '+' : '-') : '';
  return `${sign}$${Math.abs(pnl.amount).toFixed(2)}`;
}

/**
 * Format P&L percentage for display
 */
export function formatPnLPercentage(pnl: PnLCalculation, showSign: boolean = true): string {
  const sign = showSign ? (pnl.isProfit ? '+' : '-') : '';
  return `${sign}${Math.abs(pnl.percentage).toFixed(2)}%`;
}

/**
 * Get CSS class for P&L display based on profit/loss
 */
export function getPnLClass(pnl: PnLCalculation): string {
  return pnl.isProfit ? 'profit' : 'loss';
}