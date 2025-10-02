import { storage } from './storage';
/**
 * Service for managing portfolio calculations and updates
 */
export class PortfolioService {
    /**
     * Calculate and update portfolio P&L based on current market prices
     */
    async updatePortfolioPnL(userId, marketPrices) {
        const portfolio = await storage.getPortfolio(userId);
        if (!portfolio)
            return;
        const holdings = await storage.getHoldings(portfolio.id);
        let totalPnL = 0;
        let totalInvestment = 0;
        let updatedTradingBalance = 0;
        // Calculate P&L for each holding and update holding data
        for (const holding of holdings) {
            const currentPrice = marketPrices[holding.symbol] || parseFloat(holding.currentPrice);
            const avgPrice = parseFloat(holding.averagePrice);
            const amount = parseFloat(holding.amount);
            const holdingValue = currentPrice * amount;
            const investment = avgPrice * amount;
            const holdingPnL = (currentPrice - avgPrice) * amount;
            const holdingPnLPercentage = avgPrice > 0 ? (holdingPnL / investment) * 100 : 0;
            // Update individual holding with current values
            await storage.updateHolding(holding.id, {
                currentPrice: currentPrice.toString(),
                value: holdingValue.toFixed(8),
                pnl: holdingPnL.toFixed(8),
                pnlPercentage: holdingPnLPercentage.toFixed(4)
            });
            totalPnL += holdingPnL;
            totalInvestment += investment;
            updatedTradingBalance += holdingValue;
        }
        // Calculate portfolio-level P&L percentage
        const portfolioPnLPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;
        // Update portfolio with calculated values
        const availableBalance = parseFloat(portfolio.availableBalance || '0');
        await storage.updatePortfolio(portfolio.id, {
            tradingBalance: updatedTradingBalance.toFixed(8),
            totalBalance: (availableBalance + updatedTradingBalance).toFixed(8),
            pnl24h: totalPnL.toFixed(8),
            pnlPercentage24h: portfolioPnLPercentage.toFixed(4)
        });
    }
    /**
     * Update multiple users' portfolios with market prices
     */
    async updateAllPortfolios(marketPrices) {
        // In a real application, you'd fetch all user IDs and update them
        // For now, this is a placeholder for the batch update functionality
        console.log('Batch portfolio update with market prices:', marketPrices);
    }
    /**
     * Calculate portfolio metrics for display
     */
    async getPortfolioMetrics(userId) {
        const portfolio = await storage.getPortfolio(userId);
        if (!portfolio) {
            return {
                totalValue: 0,
                totalPnL: 0,
                totalPnLPercentage: 0,
                bestPerformer: null,
                worstPerformer: null
            };
        }
        const holdings = await storage.getHoldings(portfolio.id);
        let totalValue = parseFloat(portfolio.availableBalance || '0');
        let totalPnL = 0;
        let totalInvestment = 0;
        let bestPerformer = null;
        let worstPerformer = null;
        for (const holding of holdings) {
            const holdingValue = parseFloat(holding.value || '0');
            const holdingPnL = parseFloat(holding.pnl || '0');
            totalValue += holdingValue;
            totalPnL += holdingPnL;
            totalInvestment += parseFloat(holding.averagePrice || '0') * parseFloat(holding.amount || '0');
            if (!bestPerformer || holdingPnL > bestPerformer.pnl) {
                bestPerformer = { symbol: holding.symbol, pnl: holdingPnL };
            }
            if (!worstPerformer || holdingPnL < worstPerformer.pnl) {
                worstPerformer = { symbol: holding.symbol, pnl: holdingPnL };
            }
        }
        const totalPnLPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;
        return {
            totalValue,
            totalPnL,
            totalPnLPercentage,
            bestPerformer,
            worstPerformer
        };
    }
}
export const portfolioService = new PortfolioService();
