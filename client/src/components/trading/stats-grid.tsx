import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';

export function StatsGrid() {
  const { data: portfolioData } = useQuery({
    queryKey: ['/api/portfolio'],
    refetchInterval: 30000,
  });

  const { data: tradesData } = useQuery({
    queryKey: ['/api/trades'],
    refetchInterval: 30000,
  });

  const { data: signalsData } = useQuery({
    queryKey: ['/api/ai/signals'],
    refetchInterval: 30000,
  });

  const { data: strategiesData } = useQuery({
    queryKey: ['/api/strategies'],
  });

  const portfolio = (portfolioData as any)?.portfolio;
  const trades = (tradesData as any)?.trades || [];
  const signals = (signalsData as any)?.signals || [];
  const strategies = (strategiesData as any)?.strategies || [];

  // Calculate stats
  const totalTrades = trades.length;
  const successfulTrades = trades.filter((t: any) => t.status === 'filled').length;
  const successRate = totalTrades > 0 ? ((successfulTrades / totalTrades) * 100).toFixed(0) : '0';
  
  const activeSignal = signals.find((s: any) => s.isActive);
  const aiConfidence = activeSignal ? activeSignal.confidence : 0;
  
  const activeStrategies = strategies.filter((s: any) => s.isActive);
  const activePositions = activeStrategies.length;

  const stats = [
    {
      title: '24h P&L',
      value: portfolio ? `$${parseFloat(portfolio.pnl24h).toLocaleString()}` : '$0.00',
      change: portfolio ? `${parseFloat(portfolio.pnlPercentage24h).toFixed(2)}%` : '0.00%',
      icon: 'fas fa-trending-up',
      color: 'success',
      testId: 'stat-pnl-24h'
    },
    {
      title: 'Total Trades',
      value: totalTrades.toString(),
      change: `${successRate}% success rate`,
      icon: 'fas fa-exchange-alt',
      color: 'primary',
      testId: 'stat-total-trades'
    },
    {
      title: 'AI Confidence',
      value: `${aiConfidence}%`,
      change: aiConfidence > 70 ? 'High' : aiConfidence > 40 ? 'Medium' : 'Low',
      icon: 'fas fa-brain',
      color: 'accent',
      testId: 'stat-ai-confidence'
    },
    {
      title: 'Active Positions',
      value: activePositions.toString(),
      change: portfolio ? `$${parseFloat(portfolio.tradingBalance).toLocaleString()} invested` : '$0 invested',
      icon: 'fas fa-coins',
      color: 'warning',
      testId: 'stat-active-positions'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
      {stats.map((stat) => (
        <Card key={stat.testId}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold" data-testid={stat.testId}>
                  {stat.value}
                </p>
                <p className={`text-sm ${stat.color === 'success' ? 'profit' : 'text-muted-foreground'}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}/20`}>
                <i className={`${stat.icon} text-${stat.color}`}></i>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
