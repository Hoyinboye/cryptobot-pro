import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMarketPrices } from '@/hooks/use-market-prices';
import { calculateTradePnL, formatPnL, formatPnLPercentage, getPnLClass } from '@/lib/pnl-calculator';

export function RecentTrades() {
  const { data: tradesData } = useQuery({
    queryKey: ['/api/trades'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  const { getPrice } = useMarketPrices();

  const trades = (tradesData as any)?.trades || [];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Card data-testid="recent-trades">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent Trades</h3>
          <Button variant="ghost" size="sm" data-testid="view-all-trades">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-history text-4xl text-muted-foreground mb-2"></i>
            <p className="text-muted-foreground">No trades yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your trading history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.slice(0, 5).map((trade: any) => {
              const isBuy = trade.side === 'buy';
              const status = trade.status;
              const currentPrice = getPrice(trade.symbol);
              const pnl = calculateTradePnL(trade, currentPrice);
              
              return (
                <div key={trade.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'filled' ? (isBuy ? 'bg-success' : 'bg-destructive') : 'bg-warning'
                    )}></div>
                    <div>
                      <div className="font-medium text-sm" data-testid={`trade-action-${trade.id}`}>
                        {trade.side.toUpperCase()} {trade.symbol.replace('USD', '')}
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`trade-time-${trade.id}`}>
                        {formatTimeAgo(trade.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm" data-testid={`trade-amount-${trade.id}`}>
                      {parseFloat(trade.amount).toFixed(4)} {trade.symbol.replace('USD', '')}
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`trade-price-${trade.id}`}>
                      ${parseFloat(trade.price).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-sm", getPnLClass(pnl))} data-testid={`trade-pnl-${trade.id}`}>
                      {formatPnL(pnl)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPnLPercentage(pnl)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trade.isAiGenerated ? 'AI' : 'Manual'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
