import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { placeTrade } from '@/lib/kraken';
import { queryClient } from '@/lib/queryClient';

const tradeSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop-loss']),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Invalid amount'),
  price: z.string().optional(),
  stopLoss: z.string().optional(),
  takeProfit: z.string().optional(),
}).refine((data) => {
  // Price is required only for limit and stop-loss orders
  if (data.type !== 'market' && (!data.price || isNaN(Number(data.price)) || Number(data.price) <= 0)) {
    return false;
  }
  return true;
}, {
  message: 'Price is required for limit and stop-loss orders',
  path: ['price']
});

type TradeFormData = z.infer<typeof tradeSchema>;

export function QuickTrade() {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const { toast } = useToast();

  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      symbol: 'BTCUSD',
      side: 'buy',
      type: 'market',
      amount: '',
      price: '',
      stopLoss: '',
      takeProfit: '',
    },
  });

  const onSubmit = async (data: TradeFormData) => {
    try {
      await placeTrade({
        ...data,
        side: side,
      });

      toast({
        title: 'Order Placed',
        description: `${side.toUpperCase()} order for ${data.amount} ${data.symbol}`,
      });

      // Refresh related queries
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });

      form.reset();
    } catch (error) {
      toast({
        title: 'Trade Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card data-testid="quick-trade">
      <CardHeader>
        <h3 className="font-semibold">Quick Trade</h3>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={side === 'buy' ? 'default' : 'secondary'}
              onClick={() => setSide('buy')}
              className={side === 'buy' ? 'bg-success hover:bg-success/90 text-white' : ''}
              data-testid="buy-button"
            >
              BUY
            </Button>
            <Button
              type="button"
              variant={side === 'sell' ? 'default' : 'secondary'}
              onClick={() => setSide('sell')}
              className={side === 'sell' ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
              data-testid="sell-button"
            >
              SELL
            </Button>
          </div>

          <div>
            <Label htmlFor="symbol" className="text-sm text-muted-foreground">Symbol</Label>
            <Select 
              value={form.watch('symbol')} 
              onValueChange={(value) => form.setValue('symbol', value)}
            >
              <SelectTrigger data-testid="symbol-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSD">BTC/USD</SelectItem>
                <SelectItem value="ETHUSD">ETH/USD</SelectItem>
                <SelectItem value="ADAUSD">ADA/USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount" className="text-sm text-muted-foreground">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="1000.00"
              {...form.register('amount')}
              data-testid="amount-input"
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type" className="text-sm text-muted-foreground">Order Type</Label>
            <Select 
              value={form.watch('type')} 
              onValueChange={(value) => form.setValue('type', value as any)}
            >
              <SelectTrigger data-testid="order-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop-loss">Stop Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.watch('type') !== 'market' && (
            <div>
              <Label htmlFor="price" className="text-sm text-muted-foreground">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="43000.00"
                {...form.register('price')}
                data-testid="price-input"
              />
              {form.formState.errors.price && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.price.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="stopLoss" className="text-sm text-muted-foreground">Stop Loss %</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.1"
                placeholder="5"
                {...form.register('stopLoss')}
                data-testid="stop-loss-input"
              />
            </div>
            <div>
              <Label htmlFor="takeProfit" className="text-sm text-muted-foreground">Take Profit %</Label>
              <Input
                id="takeProfit"
                type="number"
                step="0.1"
                placeholder="10"
                {...form.register('takeProfit')}
                data-testid="take-profit-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={form.formState.isSubmitting}
            data-testid="place-order-button"
          >
            {form.formState.isSubmitting ? 'Placing Order...' : 'Place Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
