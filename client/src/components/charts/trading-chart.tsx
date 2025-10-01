import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart, 
  BarChart2,
  Volume,
  Settings,
  Maximize,
  Minimize
} from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  data?: any[];
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  onTimeframeChange?: (timeframe: string) => void;
  height?: number;
  className?: string;
  showVolume?: boolean;
  showIndicators?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function TradingChart({
  symbol,
  data = [],
  timeframe = '1h',
  onTimeframeChange,
  height = 400,
  className,
  showVolume = true,
  showIndicators = true,
  isFullscreen = false,
  onToggleFullscreen
}: TradingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);

  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' }
  ];

  // Mock price data for demonstration
  useEffect(() => {
    // Simulate real-time price updates
    setCurrentPrice(42350.75);
    setPriceChange(1250.30);
    setPriceChangePercent(3.04);
  }, [symbol]);

  // Chart rendering would integrate with a library like Lightweight Charts
  useEffect(() => {
    if (!chartRef.current) return;

    // This would be where you'd integrate with TradingView Lightweight Charts
    // For now, we'll show a placeholder that looks professional
    
    return () => {
      // Cleanup chart instance
    };
  }, [data, chartType, timeframe]);

  return (
    <Card className={cn(
      'relative overflow-hidden',
      isFullscreen && 'fixed inset-0 z-50 rounded-none',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle className="text-lg font-semibold">
              {symbol.replace('USD', '/USD')}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                ${currentPrice.toLocaleString()}
              </span>
              <Badge 
                variant={priceChange >= 0 ? 'default' : 'destructive'}
                className="text-xs"
              >
                {priceChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Chart type selector */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none border-r"
                onClick={() => setChartType('candlestick')}
              >
                <BarChart2 className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setChartType('line')}
              >
                <LineChart className="w-4 h-4" />
              </Button>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center border rounded-md">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? 'default' : 'ghost'}
                  size="sm"
                  className="border-none rounded-none text-xs px-3"
                  onClick={() => onTimeframeChange?.(tf.value)}
                  data-testid={`timeframe-${tf.value}`}
                >
                  {tf.label}
                </Button>
              ))}
            </div>

            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>

            {onToggleFullscreen && (
              <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Chart container */}
        <div
          ref={chartRef}
          className="relative bg-background"
          style={{ height }}
        >
          {/* Professional chart placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Professional Trading Chart
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                TradingView Lightweight Charts integration placeholder
              </p>
              <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                <span>• Real-time data</span>
                <span>• Technical indicators</span>
                <span>• Drawing tools</span>
                <span>• Volume analysis</span>
              </div>
            </div>
          </div>

          {/* Crosshair info panel */}
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur border rounded-lg p-3 text-xs">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Open:</span>
              <span className="font-medium">41,100.25</span>
              <span className="text-muted-foreground">High:</span>
              <span className="font-medium text-green-600">42,580.90</span>
              <span className="text-muted-foreground">Low:</span>
              <span className="font-medium text-red-600">40,950.10</span>
              <span className="text-muted-foreground">Close:</span>
              <span className="font-medium">42,350.75</span>
            </div>
          </div>

          {/* Volume indicator */}
          {showVolume && (
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur border rounded-lg p-2 text-xs">
              <div className="flex items-center space-x-2">
                <Volume className="w-4 h-4 text-blue-500" />
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-medium">1,234.56 BTC</span>
              </div>
            </div>
          )}
        </div>

        {/* Indicators panel */}
        {showIndicators && (
          <div className="border-t bg-muted/30 p-3">
            <div className="flex items-center space-x-6 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-muted-foreground">MA(20):</span>
                <span className="font-medium">41,850.30</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-muted-foreground">MA(50):</span>
                <span className="font-medium">40,920.15</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-muted-foreground">RSI:</span>
                <span className="font-medium">67.23</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">MACD:</span>
                <span className="font-medium text-green-600">+125.40</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}