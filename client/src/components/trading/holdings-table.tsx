import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMarketPrices } from '@/hooks/use-market-prices';
import { calculateHoldingPnL, formatPnL, formatPnLPercentage, getPnLClass } from '@/lib/pnl-calculator';

export function HoldingsTable() {
  const { data: portfolioData } = useQuery({
    queryKey: ['/api/portfolio'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  const { getPrice } = useMarketPrices();

  const holdings = (portfolioData as any)?.holdings || [];

  const getCryptoIcon = (symbol: string) => {
    const icons: Record<string, { icon: string; color: string }> = {
      'BTC': { icon: 'fab fa-bitcoin', color: 'bg-orange-500' },
      'ETH': { icon: 'fab fa-ethereum', color: 'bg-blue-500' },
      'ADA': { icon: 'text-white text-xs font-bold', color: 'bg-green-500' },
    };
    
    return icons[symbol.replace('USD', '')] || { icon: 'fas fa-coins', color: 'bg-gray-500' };
  };

  return (
    <Card data-testid="holdings-table">
      <CardHeader>
        <h3 className="font-semibold">Current Holdings</h3>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-wallet text-4xl text-muted-foreground mb-2"></i>
            <p className="text-muted-foreground">No holdings yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start trading to see your positions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {holdings.map((holding: any) => {
              const cryptoInfo = getCryptoIcon(holding.symbol);
              const currentPrice = getPrice(holding.symbol);
              const pnl = calculateHoldingPnL(holding, currentPrice);
              
              return (
                <div key={holding.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", cryptoInfo.color)}>
                      {holding.symbol.replace('USD', '') === 'ADA' ? (
                        <span className="text-white text-xs font-bold">ADA</span>
                      ) : (
                        <i className={cn(cryptoInfo.icon, "text-white text-sm")}></i>
                      )}
                    </div>
                    <div>
                      <div className="font-medium" data-testid={`holding-symbol-${holding.symbol}`}>
                        {holding.symbol.replace('USD', '')}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`holding-amount-${holding.symbol}`}>
                        {parseFloat(holding.amount).toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium" data-testid={`holding-value-${holding.symbol}`}>
                      ${(parseFloat(holding.amount) * currentPrice).toLocaleString()}
                    </div>
                    <div className={cn("text-sm", getPnLClass(pnl))} data-testid={`holding-pnl-${holding.symbol}`}>
                      {formatPnL(pnl)} ({formatPnLPercentage(pnl)})
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
