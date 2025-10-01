import { TopNavigation } from '@/components/layout/top-navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { StatsGrid } from '@/components/trading/stats-grid';
import { TradingChart } from '@/components/trading/trading-chart';
import { AISignals } from '@/components/trading/ai-signals';
import { QuickTrade } from '@/components/trading/quick-trade';
import { HoldingsTable } from '@/components/trading/holdings-table';
import { RecentTrades } from '@/components/trading/recent-trades';
import { MarketOverview } from '@/components/trading/market-overview';
import { useMarketPrices } from '@/hooks/use-market-prices';

export default function Dashboard() {
  const { getFormattedPrice, getFormattedChange } = useMarketPrices();

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard">
      <TopNavigation />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-[calc(100vh-73px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Top Stats Row */}
              <StatsGrid />

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trading Chart */}
                <TradingChart 
                  symbol="BTCUSD"
                  price={getFormattedPrice('BTCUSD')}
                  change={getFormattedChange('BTCUSD')}
                />

                {/* AI Signals & Quick Trade */}
                <div className="space-y-6">
                  <AISignals />
                  <QuickTrade />
                </div>
              </div>

              {/* Holdings & Recent Trades */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HoldingsTable />
                <RecentTrades />
              </div>

              {/* Market Overview */}
              <MarketOverview />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
