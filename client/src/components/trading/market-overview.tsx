import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMarketPrices } from '@/hooks/use-market-prices';

const MARKET_SYMBOLS = ['BTCUSD', 'ETHUSD', 'ADAUSD'];

export function MarketOverview() {
  const { marketData } = useMarketPrices();

  const { data: signalsData } = useQuery({
    queryKey: ['/api/ai/signals'],
    refetchInterval: 30000,
  });

  const signals = (signalsData as any)?.signals || [];

  const getSignalForSymbol = (symbol: string) => {
    const signal = signals.find((s: any) => s.symbol === symbol);
    return signal?.signal || 'hold';
  };

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case 'buy':
        return <Badge className="bg-success/20 text-success">BUY</Badge>;
      case 'sell':
        return <Badge className="bg-destructive/20 text-destructive">SELL</Badge>;
      case 'hold':
        return <Badge className="bg-warning/20 text-warning">HOLD</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const getCryptoInfo = (symbol: string) => {
    const info: Record<string, { name: string; icon: string; color: string }> = {
      'BTCUSD': { name: 'Bitcoin', icon: 'fab fa-bitcoin', color: 'bg-orange-500' },
      'ETHUSD': { name: 'Ethereum', icon: 'fab fa-ethereum', color: 'bg-blue-500' },
      'ADAUSD': { name: 'Cardano', icon: 'text-white text-xs font-bold', color: 'bg-green-500' },
    };
    
    return info[symbol] || { name: symbol, icon: 'fas fa-coins', color: 'bg-gray-500' };
  };

  return (
    <Card data-testid="market-overview">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Market Overview</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Live prices via WebSocket</span>
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-4 text-sm font-medium text-muted-foreground">Asset</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Price</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">24h Change</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Volume</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">AI Signal</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {MARKET_SYMBOLS.map((symbol) => {
                const ticker = marketData[symbol];
                const cryptoInfo = getCryptoInfo(symbol);
                const signal = getSignalForSymbol(symbol);
                
                if (!ticker) {
                  return (
                    <tr key={symbol} className="border-b border-border">
                      <td className="p-4" colSpan={6}>
                        <div className="text-center text-muted-foreground">Loading {symbol}...</div>
                      </td>
                    </tr>
                  );
                }

                const price = ticker.price;
                const change = ticker.changePercent;
                const isPositive = !change.startsWith('-');
                const volume = (parseFloat(ticker.volume) / 1000000).toFixed(1);

                return (
                  <tr key={symbol} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", cryptoInfo.color)}>
                          {symbol === 'ADAUSD' ? (
                            <span className="text-white text-xs font-bold">ADA</span>
                          ) : (
                            <i className={cn(cryptoInfo.icon, "text-white text-sm")}></i>
                          )}
                        </div>
                        <div>
                          <div className="font-medium" data-testid={`market-name-${symbol}`}>
                            {cryptoInfo.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {symbol.replace('USD', '')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium" data-testid={`market-price-${symbol}`}>
                        ${parseFloat(price).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={cn(isPositive ? "profit" : "loss")} data-testid={`market-change-${symbol}`}>
                        {isPositive ? '+' : ''}{change}%
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm" data-testid={`market-volume-${symbol}`}>
                        ${volume}M
                      </div>
                    </td>
                    <td className="p-4">
                      {getSignalBadge(signal)}
                    </td>
                    <td className="p-4">
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90"
                        data-testid={`trade-${symbol}`}
                      >
                        Trade
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
