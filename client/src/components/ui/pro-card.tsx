import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ProCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeType?: 'percentage' | 'absolute';
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'metric' | 'signal' | 'critical';
}

export function ProCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'percentage',
  trend,
  icon,
  className,
  children,
  variant = 'default'
}: ProCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
  };

  const getChangeColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'metric':
        return 'bg-gradient-to-br from-card to-muted/20 border-primary/20';
      case 'signal':
        return 'bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20';
      case 'critical':
        return 'bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-200 hover:shadow-lg dark:hover:shadow-primary/10',
      getVariantStyles(),
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {trend && getTrendIcon()}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {(subtitle || change !== undefined) && (
          <div className="flex items-center justify-between mt-1">
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {change !== undefined && (
              <p className={cn('text-xs font-medium', getChangeColor())}>
                {change > 0 ? '+' : ''}{change}
                {changeType === 'percentage' ? '%' : ''}
              </p>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

interface MetricTileProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricTile({ 
  label, 
  value, 
  change, 
  changeLabel, 
  icon, 
  size = 'md',
  trend 
}: MetricTileProps) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const valueSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={cn(
      'bg-card border border-border rounded-lg transition-all hover:shadow-md dark:hover:shadow-primary/5',
      sizeClasses[size]
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {icon}
      </div>
      <div className={cn('font-bold text-foreground', valueSizes[size])}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {(change !== undefined || changeLabel) && (
        <div className="flex items-center mt-1 text-xs">
          {change !== undefined && (
            <span className={cn(
              'font-medium',
              change > 0 ? 'text-green-600 dark:text-green-400' :
              change < 0 ? 'text-red-600 dark:text-red-400' :
              'text-muted-foreground'
            )}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
          {changeLabel && (
            <span className="text-muted-foreground ml-1">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}