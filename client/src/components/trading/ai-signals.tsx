import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

export function AISignals() {
  const { toast } = useToast();
  
  // Query for active signals only
  const { data: signalsData } = useQuery({
    queryKey: ['/api/ai/signals'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for historical signals (active + inactive)
  const { data: historicalData } = useQuery({
    queryKey: ['/api/ai/signals?includeInactive=true&limit=20'],
    refetchInterval: 60000, // Refetch every minute
  });

  const signals = (signalsData as any)?.signals || [];
  const historicalSignals = (historicalData as any)?.signals || [];
  const currentSignal = signals[0]; // Most recent signal

  const tradeMutation = useMutation({
    mutationFn: async (tradeData: any) => {
      const response = await apiRequest('POST', '/api/trade', tradeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'AI Trade Executed',
        description: `${currentSignal.signal.toUpperCase()} order placed for ${currentSignal.symbol}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
    },
    onError: () => {
      toast({
        title: 'Trade Failed',
        description: 'Failed to execute AI trade recommendation',
        variant: 'destructive',
      });
    }
  });

  const handleAutoTrade = async () => {
    if (!currentSignal) return;

    tradeMutation.mutate({
      symbol: currentSignal.symbol,
      side: currentSignal.signal === 'buy' ? 'buy' : 'sell',
      type: 'market',
      amount: '0.01', // Small test amount
      price: currentSignal.entryPrice,
      isAiGenerated: true
    });
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'buy': return 'text-success bg-success/10 border-success/20';
      case 'sell': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'hold': return 'text-warning bg-warning/10 border-warning/20';
      default: return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const renderSignalCard = (signal: any, showActions: boolean = false, index?: number) => (
    <div key={signal.id || index} className={cn("rounded-lg p-4 border", getSignalColor(signal.signal))} data-testid={`signal-card-${signal.id || index}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium uppercase text-sm" data-testid={`signal-action-${signal.id || index}`}>
            {signal.signal === 'buy' ? 'STRONG BUY' : 
             signal.signal === 'sell' ? 'STRONG SELL' : 'HOLD'}
          </span>
          <span className="text-xs font-medium">{signal.symbol}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground" data-testid={`signal-confidence-${signal.id || index}`}>
            {signal.confidence}% confidence
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(signal.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3" data-testid={`signal-reasoning-${signal.id || index}`}>
        {signal.reasoning || 'AI analysis completed'}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Entry: </span>
          <span className="font-medium" data-testid={`signal-entry-${signal.id || index}`}>
            ${parseFloat(signal.entryPrice || '0').toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Target: </span>
          <span className="font-medium" data-testid={`signal-target-${signal.id || index}`}>
            ${parseFloat(signal.targetPrice || '0').toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Stop Loss: </span>
          <span className="font-medium" data-testid={`signal-stop-loss-${signal.id || index}`}>
            ${parseFloat(signal.stopLoss || '0').toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Risk/Reward: </span>
          <span className="font-medium" data-testid={`signal-risk-reward-${signal.id || index}`}>
            1:{parseFloat(signal.riskReward || '0').toFixed(1)}
          </span>
        </div>
      </div>
      {showActions && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button
            className="bg-success hover:bg-success/90 text-white"
            onClick={handleAutoTrade}
            disabled={signal.signal === 'hold' || tradeMutation.isPending}
            data-testid="auto-execute-button"
          >
            Auto Execute
          </Button>
          <Button variant="secondary" data-testid="review-signal-button">
            Review Signal
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card data-testid="ai-signals">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">AI Trading Signals</h3>
          <Badge variant="secondary" className="bg-success/20 text-success">
            {signals.length} ACTIVE
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="current" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" data-testid="tab-current">Current</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4" data-testid="current-signals">
            {!currentSignal ? (
              <div className="text-center py-8">
                <i className="fas fa-brain text-4xl text-muted-foreground mb-2"></i>
                <p className="text-muted-foreground">No active signals</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI analysis will appear here
                </p>
              </div>
            ) : (
              renderSignalCard(currentSignal, true)
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4" data-testid="historical-signals">
            {historicalSignals.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-history text-4xl text-muted-foreground mb-2"></i>
                <p className="text-muted-foreground">No signal history</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Past AI signals will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historicalSignals.map((signal: any, index: number) => renderSignalCard(signal, false, index))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
