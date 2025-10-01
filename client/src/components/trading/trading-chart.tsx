import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { 
  ComposedChart, 
  Line as RechartsLine,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';

interface TradingChartProps {
  symbol: string;
  price: string;
  change: string;
}

export function TradingChart({ symbol, price, change }: TradingChartProps) {
  const [timeframe, setTimeframe] = useState('1D');
  const [indicators, setIndicators] = useState<string[]>(['RSI']);
  
  // Map timeframe to Kraken interval (in minutes)
  const getInterval = () => {
    switch (timeframe) {
      case '1H': return '5'; // 5 minute candles
      case '4H': return '15'; // 15 minute candles  
      case '1D': return '60'; // 1 hour candles
      case '1W': return '240'; // 4 hour candles
      default: return '60';
    }
  };

  // Fetch real OHLC data from Kraken
  const { data: ohlcData, isLoading } = useQuery({
    queryKey: ['/api/market/ohlc', symbol, timeframe],
    queryFn: async () => {
      const interval = getInterval();
      const response = await fetch(`/api/market/ohlc/${symbol}?interval=${interval}`);
      if (!response.ok) throw new Error('Failed to fetch OHLC data');
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Format OHLC data for candlestick chart
  const candleData = ohlcData?.data?.map((candle: any) => ({
    time: new Date(candle.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    // Candle color: green if close > open, red otherwise
    fill: candle.close >= candle.open ? '#22c55e' : '#ef4444',
    // Candle body (for rendering)
    candleBody: [candle.open, candle.close],
    // Wick range
    wickRange: [candle.low, candle.high]
  })) || [];

  const toggleIndicator = (indicator: string) => {
    setIndicators(prev =>
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const isPositive = !change.startsWith('-');

  // Custom candlestick shape renderer for Recharts
  const renderCandleStick = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload || !payload.open || !payload.close) return <g />;
    
    const { open, high, low, close } = payload;
    const isUp = close >= open;
    const color = isUp ? '#22c55e' : '#ef4444';
    
    // Calculate vertical positions
    const maxPrice = Math.max(open, close);
    const minPrice = Math.min(open, close);
    const priceRange = high - low;
    
    if (priceRange === 0) return <g />; // Avoid division by zero
    
    // Calculate scaled positions
    const bodyTop = y;
    const bodyHeight = Math.abs(height) || 1;
    const wickTop = bodyTop - ((high - maxPrice) / priceRange) * bodyHeight;
    const wickBottom = bodyTop + bodyHeight + ((minPrice - low) / priceRange) * bodyHeight;
    const centerX = x + width / 2;
    
    return (
      <g>
        {/* Upper and lower wick */}
        <line
          x1={centerX}
          y1={wickTop}
          x2={centerX}
          y2={wickBottom}
          stroke={color}
          strokeWidth={1.5}
        />
        {/* Candle body */}
        <rect
          x={x + 1}
          y={bodyTop}
          width={Math.max(width - 2, 1)}
          height={bodyHeight}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  return (
    <Card className="lg:col-span-2" data-testid="trading-chart">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold" data-testid="chart-symbol">{symbol.replace('USD', '/USD')}</h2>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold" data-testid="chart-price">{price}</span>
              <span className={`text-sm ${isPositive ? 'profit' : 'loss'}`} data-testid="chart-change">
                {change}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20" data-testid="timeframe-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1H">1H</SelectItem>
                <SelectItem value="4H">4H</SelectItem>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="1W">1W</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" data-testid="fullscreen-chart">
              <i className="fas fa-expand-arrows-alt text-muted-foreground"></i>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="h-96 chart-container rounded-lg" data-testid="chart-container">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Loading candlestick data...
            </div>
          ) : candleData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candleData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={['dataMin - 50', 'dataMax + 50']}
                  orientation="right"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <RechartsTooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: '1px solid #374151',
                    borderRadius: '4px',
                    color: '#fff'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'volume') return [value.toLocaleString(), 'Volume'];
                    return [`$${parseFloat(value).toLocaleString()}`, name.toUpperCase()];
                  }}
                />
                <Bar 
                  dataKey="close" 
                  fill="#8884d8"
                  shape={renderCandleStick}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No candlestick data available
            </div>
          )}
        </div>

        {/* Chart Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Indicators:</span>
            {['RSI', 'MACD', 'MA(20)'].map((indicator) => (
              <Button
                key={indicator}
                variant={indicators.includes(indicator) ? 'default' : 'secondary'}
                size="sm"
                onClick={() => toggleIndicator(indicator)}
                data-testid={`indicator-${indicator.toLowerCase()}`}
              >
                {indicator}
              </Button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : 'Real-time data from Kraken'}
            </span>
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
