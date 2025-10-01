import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProCard, MetricTile } from '@/components/ui/pro-card';
import { ProTable, ProTableColumn } from '@/components/ui/pro-table';
import { EquityCurve } from '@/components/charts/equity-curve';
import { TopNavigation } from '@/components/layout/top-navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useMarketPrices } from '@/hooks/use-market-prices';
import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  BarChart3, 
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
  Target,
  Shield
} from 'lucide-react';

export default function Portfolio() {
  const { getPrice } = useMarketPrices();
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');

  const { data: portfolioData } = useQuery({
    queryKey: ['/api/portfolio'],
    refetchInterval: 5000,
  });

  const { data: tradesData } = useQuery({
    queryKey: ['/api/trades'],
    refetchInterval: 30000,
  });

  const portfolio = (portfolioData as any)?.portfolio;
  const holdings = (portfolioData as any)?.holdings || [];
  const trades = (tradesData as any)?.trades || [];

  // Calculate enhanced portfolio metrics
  const totalBalance = portfolio ? parseFloat(portfolio.totalBalance) : 0;
  const availableBalance = portfolio ? parseFloat(portfolio.availableBalance) : 0;
  const tradingBalance = portfolio ? parseFloat(portfolio.tradingBalance) : 0;
  const pnl24h = portfolio ? parseFloat(portfolio.pnl24h) : 0;
  const pnlPercentage = portfolio ? parseFloat(portfolio.pnlPercentage24h) : 0;

  // Calculate additional metrics
  const totalInvested = totalBalance - pnl24h;
  const realizedPnL = trades.reduce((sum: number, trade: any) => sum + parseFloat(trade.pnl || '0'), 0);
  const unrealizedPnL = pnl24h - realizedPnL;
  
  // Performance calculations
  const winningTrades = trades.filter((t: any) => parseFloat(t.pnl) > 0);
  const losingTrades = trades.filter((t: any) => parseFloat(t.pnl) < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? 
    winningTrades.reduce((sum: number, trade: any) => sum + parseFloat(trade.pnl), 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? 
    Math.abs(losingTrades.reduce((sum: number, trade: any) => sum + parseFloat(trade.pnl), 0) / losingTrades.length) : 0;

  // Generate mock equity curve data (would come from backend in real app)
  const equityData = useMemo(() => {
    const data = [];
    let equity = totalInvested;
    const days = 30;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const change = (Math.random() - 0.48) * 200; // Slight upward bias
      equity += change;
      
      data.push({
        timestamp: date.toISOString(),
        equity: equity,
        drawdown: equity < totalInvested ? ((equity - totalInvested) / totalInvested) * 100 : 0
      });
    }
    
    return data;
  }, [totalInvested]);

  // Holdings table columns
  const holdingsColumns: ProTableColumn[] = [
    {
      key: 'symbol',
      title: 'Asset',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {value.replace('USD', '').slice(0, 2)}
            </span>
          </div>
          <span className="font-medium">{value.replace('USD', '/USD')}</span>
        </div>
      )
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      className: 'text-right',
      render: (value: string) => parseFloat(value).toFixed(6)
    },
    {
      key: 'averagePrice',
      title: 'Avg Price',
      sortable: true,
      className: 'text-right',
      render: (value: string) => `$${parseFloat(value).toFixed(2)}`
    },
    {
      key: 'currentPrice',
      title: 'Current Price',
      sortable: true,
      className: 'text-right',
      render: (value: string, row: any) => {
        const currentPrice = getPrice(row.symbol);
        return `$${currentPrice.toFixed(2)}`;
      }
    },
    {
      key: 'value',
      title: 'Market Value',
      sortable: true,
      className: 'text-right',
      render: (value: string, row: any) => {
        const currentPrice = getPrice(row.symbol);
        const marketValue = currentPrice * parseFloat(row.amount);
        return `$${marketValue.toFixed(2)}`;
      }
    },
    {
      key: 'pnl',
      title: 'P&L',
      sortable: true,
      className: 'text-right',
      render: (value: string, row: any) => {
        const pnl = parseFloat(row.pnl || '0');
        const pnlPercent = parseFloat(row.pnlPercentage || '0');
        return (
          <div className={`${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className="font-medium">${pnl.toFixed(2)}</div>
            <div className="text-xs">({pnlPercent.toFixed(2)}%)</div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="portfolio-page">
      <TopNavigation />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-[calc(100vh-73px)] overflow-y-auto">
            <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="page-title">
            Portfolio Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time portfolio performance and asset allocation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProCard
          title="Total Portfolio Value"
          value={`$${totalBalance.toLocaleString()}`}
          change={pnlPercentage}
          changeType="percentage"
          trend={pnl24h >= 0 ? 'up' : 'down'}
          icon={<Wallet className="w-5 h-5" />}
          variant="metric"
          data-testid="total-balance-card"
        />
        
        <ProCard
          title="Available Cash"
          value={`$${availableBalance.toLocaleString()}`}
          subtitle="Ready to trade"
          icon={<DollarSign className="w-5 h-5" />}
          data-testid="available-balance-card"
        />
        
        <ProCard
          title="Active Positions"
          value={`$${tradingBalance.toLocaleString()}`}
          subtitle={`${holdings.length} assets`}
          icon={<Activity className="w-5 h-5" />}
          data-testid="trading-balance-card"
        />
        
        <ProCard
          title="Today's P&L"
          value={`$${pnl24h.toFixed(2)}`}
          change={pnlPercentage}
          changeType="percentage"
          trend={pnl24h >= 0 ? 'up' : 'down'}
          icon={pnl24h >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          variant={pnl24h >= 0 ? 'default' : 'critical'}
          data-testid="pnl-card"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          change={winRate > 50 ? 5.2 : -2.1}
          icon={<Target className="w-4 h-4 text-green-500" />}
          trend={winRate > 50 ? 'up' : 'down'}
        />
        <MetricTile
          label="Avg Win"
          value={`$${avgWin.toFixed(2)}`}
          changeLabel="per trade"
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        />
        <MetricTile
          label="Avg Loss"
          value={`$${avgLoss.toFixed(2)}`}
          changeLabel="per trade"
          icon={<TrendingDown className="w-4 h-4 text-red-500" />}
        />
        <MetricTile
          label="Risk Score"
          value="2.4/5"
          change={-0.3}
          icon={<Shield className="w-4 h-4 text-blue-500" />}
          trend="down"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2">
          <EquityCurve
            data={equityData}
            height={300}
            title="Portfolio Performance"
            showDrawdown={true}
          />
        </div>

        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <div className="text-center py-8">
                <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No assets to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {holdings.map((holding: any, index: number) => {
                  const currentPrice = getPrice(holding.symbol);
                  const value = currentPrice * parseFloat(holding.amount);
                  const percentage = totalBalance > 0 ? (value / totalBalance) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
                  
                  return (
                    <div key={holding.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="font-medium text-sm">
                            {holding.symbol.replace('USD', '/USD')}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{percentage.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">
                            ${value.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[index % colors.length]}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="holdings" className="space-y-4" data-testid="portfolio-tabs">
        <TabsList>
          <TabsTrigger value="holdings" data-testid="holdings-tab">Current Holdings</TabsTrigger>
          <TabsTrigger value="performance" data-testid="performance-tab">Performance Analysis</TabsTrigger>
          <TabsTrigger value="allocation" data-testid="allocation-tab">Risk & Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="space-y-4" data-testid="holdings-content">
          <ProCard
            title="Current Holdings"
            value={`${holdings.length} Assets`}
            subtitle={`Total Value: $${totalBalance.toLocaleString()}`}
            icon={<Wallet className="w-4 h-4" />}
          >
            {holdings.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start trading to build your portfolio
                </p>
                <Button data-testid="start-trading-btn">
                  Start Trading
                </Button>
              </div>
            ) : (
              <ProTable
                data={holdings}
                columns={holdingsColumns}
                searchable={true}
                searchPlaceholder="Search holdings..."
                exportable={true}
                onExport={() => console.log('Export holdings')}
                emptyState={
                  <div className="text-center py-8">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No holdings found</p>
                  </div>
                }
              />
            )}
          </ProCard>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4" data-testid="performance-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProCard
              title="Realized P&L"
              value={`$${realizedPnL.toFixed(2)}`}
              change={realizedPnL > 0 ? 15.2 : -8.4}
              changeType="percentage"
              trend={realizedPnL >= 0 ? 'up' : 'down'}
              icon={<BarChart3 className="w-4 h-4" />}
              variant="metric"
            >
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Closed Positions</span>
                  <span className="font-medium">{trades.length}</span>
                </div>
              </div>
            </ProCard>

            <ProCard
              title="Unrealized P&L"
              value={`$${unrealizedPnL.toFixed(2)}`}
              change={unrealizedPnL > 0 ? 8.7 : -5.2}
              changeType="percentage"
              trend={unrealizedPnL >= 0 ? 'up' : 'down'}
              icon={<Activity className="w-4 h-4" />}
              variant="metric"
            >
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open Positions</span>
                  <span className="font-medium">{holdings.length}</span>
                </div>
              </div>
            </ProCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricTile
                  label="Total Return"
                  value={`${((pnl24h / totalInvested) * 100).toFixed(2)}%`}
                  change={(pnl24h / totalInvested) * 100}
                  size="sm"
                />
                <MetricTile
                  label="Best Day"
                  value="+$1,247"
                  change={15.7}
                  size="sm"
                />
                <MetricTile
                  label="Worst Day"
                  value="-$423"
                  change={-8.3}
                  size="sm"
                />
                <MetricTile
                  label="Volatility"
                  value="12.4%"
                  change={-2.1}
                  size="sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4" data-testid="allocation-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Portfolio Beta</span>
                    <span className="font-medium">1.24</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-medium">1.85</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Max Drawdown</span>
                    <span className="font-medium text-red-600">-8.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">VaR (95%)</span>
                    <span className="font-medium">-$342</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Large Cap (BTC, ETH)</span>
                      <span className="text-sm font-medium">70%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Mid Cap (ADA, SOL)</span>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Cash</span>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-gray-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}