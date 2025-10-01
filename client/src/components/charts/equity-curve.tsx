import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EquityCurveProps {
  data: Array<{
    timestamp: string;
    equity: number;
    drawdown?: number;
  }>;
  height?: number;
  className?: string;
  showDrawdown?: boolean;
  title?: string;
}

export function EquityCurve({
  data = [],
  height = 300,
  className,
  showDrawdown = true,
  title = "Portfolio Equity Curve"
}: EquityCurveProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  // Calculate key metrics
  const currentEquity = data[data.length - 1]?.equity || 0;
  const initialEquity = data[0]?.equity || 0;
  const totalReturn = currentEquity - initialEquity;
  const totalReturnPercent = initialEquity > 0 ? (totalReturn / initialEquity) * 100 : 0;
  
  const maxDrawdown = data.reduce((max, point) => 
    Math.min(max, point.drawdown || 0), 0
  );

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (data.length < 2) return;

    // Calculate bounds
    const minEquity = Math.min(...data.map(d => d.equity));
    const maxEquity = Math.max(...data.map(d => d.equity));
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
    }

    // Draw equity curve
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const y = padding + chartHeight - ((point.equity - minEquity) / (maxEquity - minEquity)) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Fill area under curve
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineTo(rect.width - padding, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw drawdown if enabled
    if (showDrawdown) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();

      data.forEach((point, index) => {
        if (point.drawdown) {
          const x = padding + (chartWidth / (data.length - 1)) * index;
          const ddHeight = Math.abs(point.drawdown) / Math.abs(maxDrawdown) * 60;
          const y = rect.height - padding - ddHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
    }

  }, [data, height, showDrawdown]);

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              {totalReturn >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={cn(
                'font-medium',
                totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)} ({totalReturnPercent.toFixed(2)}%)
              </span>
            </div>
            {showDrawdown && (
              <div className="text-red-600">
                <span className="text-xs text-muted-foreground">Max DD:</span>
                <span className="font-medium ml-1">{maxDrawdown.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative" style={{ height }}>
          <canvas
            ref={chartRef}
            className="absolute inset-0 w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
          
          {data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-lg font-medium mb-1">No data available</div>
                <div className="text-sm">Start trading to see your equity curve</div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="border-t bg-muted/30 p-3">
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-muted-foreground">Portfolio Value</span>
            </div>
            {showDrawdown && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span className="text-muted-foreground">Drawdown</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-medium">${currentEquity.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}