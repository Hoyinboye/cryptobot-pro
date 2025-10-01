import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  Bot, 
  Wallet, 
  History, 
  Settings,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Trading', href: '/ai-trading', icon: Bot },
  { name: 'Portfolio', href: '/portfolio', icon: Wallet },
  { name: 'Activity', href: '/trades', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  const { data: portfolioData } = useQuery({
    queryKey: ['/api/portfolio'],
    enabled: true,
  });

  const { data: strategiesData } = useQuery({
    queryKey: ['/api/strategies'],
    enabled: true,
  });

  const portfolio = (portfolioData as any)?.portfolio;
  const strategies = (strategiesData as any)?.strategies || [];

  return (
    <aside className="w-64 bg-card border-r border-border h-[calc(100vh-73px)] overflow-y-auto sidebar-scroll" data-testid="sidebar">
      <div className="p-4">
        {/* Portfolio Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Portfolio Overview</h3>
          <div className="space-y-3">
            <div className="bg-background rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Total Balance</div>
              <div className="text-lg font-bold" data-testid="total-balance">
                ${portfolio ? parseFloat(portfolio.totalBalance).toLocaleString() : '0.00'}
              </div>
              <div className="flex items-center text-xs">
                {portfolio && parseFloat(portfolio.pnl24h) >= 0 ? (
                  <ArrowUp className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={portfolio && parseFloat(portfolio.pnl24h) >= 0 ? "text-green-500" : "text-red-500"}>
                  ${portfolio ? portfolio.pnl24h : '0.00'} ({portfolio ? portfolio.pnlPercentage24h : '0.00'}%)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Available</div>
                <div className="font-semibold text-sm" data-testid="available-balance">
                  ${portfolio ? parseFloat(portfolio.availableBalance).toLocaleString() : '0.00'}
                </div>
              </div>
              <div className="bg-background rounded-lg p-2">
                <div className="text-xs text-muted-foreground">In Trading</div>
                <div className="font-semibold text-sm" data-testid="trading-balance">
                  ${portfolio ? parseFloat(portfolio.tradingBalance).toLocaleString() : '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                    location === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className={location === item.href ? "font-medium" : ""}>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Active Strategies */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Strategies</h3>
          <div className="space-y-2">
            {strategies.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No active strategies
              </div>
            ) : (
              strategies.slice(0, 3).map((strategy: any) => (
                <div key={strategy.id} className="bg-background rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" data-testid={`strategy-${strategy.id}`}>
                      {strategy.name}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded",
                      strategy.isActive
                        ? "bg-success/20 text-success"
                        : "bg-warning/20 text-warning"
                    )}>
                      {strategy.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{strategy.symbol}</div>
                  <div className="text-xs profit">
                    +{strategy.performance?.dailyReturn || '0.00'}% today
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
