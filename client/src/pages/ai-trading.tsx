import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProCard, MetricTile } from '@/components/ui/pro-card';
import { TradingChart } from '@/components/charts/trading-chart';
import { TopNavigation } from '@/components/layout/top-navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMarketPrices } from '@/hooks/use-market-prices';
import { useState } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Pause,
  Play,
  Settings
} from 'lucide-react';

export default function AITrading() {
  const { toast } = useToast();
  const { getPrice } = useMarketPrices();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD');
  const [riskLevel, setRiskLevel] = useState([3]);
  const [autoTrade, setAutoTrade] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState([10]);
  const [dailyLossLimit, setDailyLossLimit] = useState([500]);
  const [timeframe, setTimeframe] = useState('1h');

  const { data: signalsData } = useQuery({
    queryKey: ['/api/ai/signals'],
    refetchInterval: 30000,
  });

  const { data: strategiesData } = useQuery({
    queryKey: ['/api/strategies'],
    refetchInterval: 60000,
  });

  const signals = (signalsData as any)?.signals || [];
  const strategies = (strategiesData as any)?.strategies || [];

  const generateSignalMutation = useMutation({
    mutationFn: async (data: { symbol: string; timeframe: string; riskLevel: number }) => {
      const response = await apiRequest('POST', '/api/ai/analyze', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'AI Analysis Complete',
        description: 'New trading signal generated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/signals'] });
    },
    onError: () => {
      toast({
        title: 'Analysis Failed',
        description: 'Failed to generate AI trading signal',
        variant: 'destructive',
      });
    }
  });

  const executeSignalMutation = useMutation({
    mutationFn: async (data: { signal: any }) => {
      const { signal } = data;
      
      // Validate signal type before executing
      const validSignals = ['buy', 'sell'];
      if (!validSignals.includes(signal.signal?.toLowerCase())) {
        throw new Error(`Invalid signal type: ${signal.signal}. Expected 'buy' or 'sell'.`);
      }
      
      const response = await apiRequest('POST', '/api/trade', {
        symbol: signal.symbol,
        side: signal.signal.toLowerCase(), // Ensure lowercase 'buy' or 'sell'
        type: 'market',
        amount: '0.001', // Small amount for demo trades
        price: signal.entryPrice,
        isAiGenerated: true
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Trade execution failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Trade Executed',
        description: `AI signal trade executed successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Trade Failed',
        description: error.message || 'Failed to execute trade from signal',
        variant: 'destructive',
      });
    }
  });

  const dismissSignalMutation = useMutation({
    mutationFn: async (signalId: string) => {
      const response = await apiRequest('PUT', `/api/ai/signals/${signalId}/dismiss`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Signal Dismissed',
        description: 'Signal has been marked as inactive',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/signals'] });
    },
    onError: () => {
      toast({
        title: 'Dismiss Failed',
        description: 'Failed to dismiss signal',
        variant: 'destructive',
      });
    }
  });

  const handleGenerateSignal = () => {
    generateSignalMutation.mutate({
      symbol: selectedSymbol,
      timeframe: timeframe,
      riskLevel: riskLevel[0]
    });
  };

  const handleExecuteSignal = (signal: any) => {
    executeSignalMutation.mutate({ signal });
  };

  const handleDismissSignal = (signalId: string) => {
    dismissSignalMutation.mutate(signalId);
  };

  const currentPrice = getPrice(selectedSymbol);

  // Calculate AI performance metrics
  const aiAccuracy = signals.length > 0 ? 
    (signals.filter((s: any) => s.performance === 'profitable').length / signals.length) * 100 : 0;
  const avgConfidence = signals.length > 0 ? 
    signals.reduce((sum: number, s: any) => sum + s.confidence, 0) / signals.length : 0;
  const totalSignals = signals.length;
  const activeStrategies = strategies.filter((s: any) => s.isActive).length;

  return (
    <div className="min-h-screen bg-background" data-testid="ai-trading-page">
      <TopNavigation />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-[calc(100vh-73px)] overflow-y-auto">
            <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="page-title">
            AI Trading Terminal
          </h1>
          <p className="text-muted-foreground mt-1">
            Professional-grade AI signals with institutional risk management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={autoTrade ? 'default' : 'secondary'} className="px-3 py-1">
            {autoTrade ? (
              <>
                <Activity className="w-3 h-3 mr-1" />
                Auto-Trading Active
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Manual Mode
              </>
            )}
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Trading Settings
          </Button>
        </div>
      </div>

      {/* AI Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile
          label="AI Accuracy"
          value={`${aiAccuracy.toFixed(1)}%`}
          change={aiAccuracy > 70 ? 5.2 : -2.1}
          icon={<Brain className="w-4 h-4 text-blue-500" />}
          trend={aiAccuracy > 70 ? 'up' : 'down'}
        />
        <MetricTile
          label="Avg Confidence"
          value={`${avgConfidence.toFixed(0)}%`}
          change={2.4}
          icon={<Target className="w-4 h-4 text-green-500" />}
          trend="up"
        />
        <MetricTile
          label="Total Signals"
          value={totalSignals}
          changeLabel="Today"
          icon={<Zap className="w-4 h-4 text-purple-500" />}
        />
        <MetricTile
          label="Active Strategies"
          value={activeStrategies}
          changeLabel="Running"
          icon={<Activity className="w-4 h-4 text-orange-500" />}
        />
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Professional Trading Chart */}
        <div className="xl:col-span-2">
          <TradingChart
            symbol={selectedSymbol}
            timeframe={timeframe as '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w'}
            onTimeframeChange={setTimeframe}
            height={500}
            showVolume={true}
            showIndicators={true}
            data-testid="trading-chart"
          />
        </div>

        {/* AI Signal Generator & Risk Controls */}
        <div className="space-y-6">
          <ProCard
            title="AI Signal Generator"
            value=""
            icon={<Brain className="w-4 h-4" />}
            variant="signal"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="symbol">Trading Pair</Label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger data-testid="symbol-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTCUSD">BTC/USD</SelectItem>
                    <SelectItem value="ETHUSD">ETH/USD</SelectItem>
                    <SelectItem value="ADAUSD">ADA/USD</SelectItem>
                    <SelectItem value="SOLUSD">SOL/USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Current Price</Label>
                <div className="text-xl font-bold text-foreground" data-testid="current-price">
                  ${currentPrice > 0 ? currentPrice.toLocaleString() : 'Loading...'}
                </div>
              </div>

              <div>
                <Label>Risk Level: {riskLevel[0]}/5</Label>
                <Slider
                  value={riskLevel}
                  onValueChange={setRiskLevel}
                  max={5}
                  min={1}
                  step={1}
                  className="mt-2"
                  data-testid="risk-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>

              <Button 
                onClick={handleGenerateSignal}
                disabled={generateSignalMutation.isPending}
                className="w-full"
                data-testid="generate-signal-btn"
              >
                {generateSignalMutation.isPending ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Market...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate AI Signal
                  </>
                )}
              </Button>
            </div>
          </ProCard>

          {/* Professional Risk Management */}
          <ProCard
            title="Risk Management"
            value=""
            icon={<Shield className="w-4 h-4" />}
            variant="critical"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Trading</Label>
                  <p className="text-xs text-muted-foreground">
                    Execute signals automatically
                  </p>
                </div>
                <Switch 
                  checked={autoTrade} 
                  onCheckedChange={setAutoTrade}
                  data-testid="auto-trade-switch"
                />
              </div>

              {autoTrade && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    Auto-trading is enabled. All signals will be executed automatically within risk limits.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Max Position Size: {maxPositionSize[0]}%</Label>
                <Slider
                  value={maxPositionSize}
                  onValueChange={setMaxPositionSize}
                  max={25}
                  min={1}
                  step={1}
                  className="mt-2"
                  data-testid="position-size-slider"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum portfolio percentage per trade
                </p>
              </div>

              <div>
                <Label>Daily Loss Limit: ${dailyLossLimit[0]}</Label>
                <Slider
                  value={dailyLossLimit}
                  onValueChange={setDailyLossLimit}
                  max={2000}
                  min={100}
                  step={50}
                  className="mt-2"
                  data-testid="loss-limit-slider"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Trading stops if daily loss exceeds this amount
                </p>
              </div>
            </div>
          </ProCard>
        </div>
      </div>

      {/* Active Signals & Strategy Performance */}
      <Tabs defaultValue="signals" className="space-y-4" data-testid="trading-tabs">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signals" data-testid="signals-tab">Active Signals</TabsTrigger>
          <TabsTrigger value="strategies" data-testid="strategies-tab">Strategy Performance</TabsTrigger>
          <TabsTrigger value="backtest" data-testid="backtest-tab">Backtest Results</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4" data-testid="signals-content">
          {signals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Signals</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first AI trading signal to get started
                </p>
                <Button onClick={handleGenerateSignal} data-testid="generate-first-signal">
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Signal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {signals.map((signal: any) => {
                const entryPrice = parseFloat(signal.entryPrice || 0);
                const targetPrice = parseFloat(signal.targetPrice || 0);
                const stopLoss = parseFloat(signal.stopLoss || 0);
                const riskReward = parseFloat(signal.riskReward || 0);
                const indicators = signal.indicators || {};
                
                return (
                  <Card key={signal.id} className="overflow-hidden" data-testid={`signal-card-${signal.symbol}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {signal.signal === 'buy' ? (
                            <div className="p-2 bg-green-500/10 rounded-lg">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                          ) : signal.signal === 'sell' ? (
                            <div className="p-2 bg-red-500/10 rounded-lg">
                              <TrendingDown className="w-5 h-5 text-red-500" />
                            </div>
                          ) : (
                            <div className="p-2 bg-gray-500/10 rounded-lg">
                              <Pause className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg" data-testid={`signal-title-${signal.symbol}`}>
                              {signal.symbol.replace('USD', '/USD')}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {new Date(signal.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={signal.signal === 'buy' ? 'default' : signal.signal === 'sell' ? 'destructive' : 'secondary'}
                          className="text-sm px-3 py-1"
                          data-testid={`signal-badge-${signal.symbol}`}
                        >
                          {signal.signal.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">AI Confidence</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${signal.confidence >= 70 ? 'bg-green-500' : signal.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${signal.confidence}%` }}
                            />
                          </div>
                          <span className="font-bold text-sm" data-testid={`signal-confidence-${signal.symbol}`}>
                            {signal.confidence}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Entry Price</p>
                          <p className="text-lg font-semibold" data-testid={`signal-entry-${signal.symbol}`}>
                            ${entryPrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Target Price</p>
                          <p className="text-lg font-semibold text-green-500" data-testid={`signal-target-${signal.symbol}`}>
                            ${targetPrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Stop Loss</p>
                          <p className="text-lg font-semibold text-red-500" data-testid={`signal-stoploss-${signal.symbol}`}>
                            ${stopLoss.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Risk/Reward</p>
                          <p className="text-lg font-semibold" data-testid={`signal-riskreward-${signal.symbol}`}>
                            1:{riskReward.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {indicators.rsi && (
                        <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground">Technical Indicators</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">RSI:</span>
                              <span className="font-medium">{indicators.rsi.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">MACD:</span>
                              <span className="font-medium">{indicators.macd?.toFixed(2) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SMA(20):</span>
                              <span className="font-medium">${indicators.sma20?.toFixed(2) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Volume:</span>
                              <span className={`font-medium ${indicators.volumeTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {indicators.volumeTrend?.toFixed(1) || '0'}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {signal.reasoning && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">AI Analysis</p>
                          <p className="text-sm text-foreground/80 leading-relaxed" data-testid={`signal-reasoning-${signal.symbol}`}>
                            {signal.reasoning}
                          </p>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <Button 
                          className="flex-1"
                          size="sm"
                          variant={signal.signal === 'buy' ? 'default' : 'destructive'}
                          onClick={() => handleExecuteSignal(signal)}
                          disabled={executeSignalMutation.isPending}
                          data-testid={`execute-signal-btn-${signal.symbol}`}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          {executeSignalMutation.isPending ? 'Executing...' : `Execute ${signal.signal === 'buy' ? 'Buy' : 'Sell'}`}
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismissSignal(signal.id)}
                          disabled={dismissSignalMutation.isPending}
                          data-testid={`dismiss-signal-btn-${signal.symbol}`}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4" data-testid="strategies-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.length === 0 ? (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Strategies</h3>
                  <p className="text-muted-foreground">
                    Create and deploy trading strategies to automate your trading
                  </p>
                </CardContent>
              </Card>
            ) : (
              strategies.map((strategy: any) => (
                <ProCard
                  key={strategy.id}
                  title={strategy.name}
                  value={`+${strategy.performance?.totalReturn || '0.00'}%`}
                  subtitle={`${strategy.symbol} • Win Rate: ${strategy.performance?.winRate || '0'}%`}
                  trend={strategy.performance?.totalReturn > 0 ? 'up' : 'down'}
                  variant="metric"
                >
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={strategy.isActive ? 'default' : 'secondary'} className="text-xs">
                        {strategy.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Trades:</span>
                      <span className="font-medium">{strategy.performance?.totalTrades || 0}</span>
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        {strategy.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </ProCard>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="backtest" className="space-y-4" data-testid="backtest-content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                AI Strategy Backtest Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricTile
                  label="Total Return"
                  value="+24.7%"
                  change={24.7}
                  size="sm"
                />
                <MetricTile
                  label="Sharpe Ratio"
                  value="1.85"
                  change={12.3}
                  size="sm"
                />
                <MetricTile
                  label="Max Drawdown"
                  value="-8.2%"
                  change={-8.2}
                  size="sm"
                />
                <MetricTile
                  label="Win Rate"
                  value="68.4%"
                  change={5.1}
                  size="sm"
                />
              </div>
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Comprehensive backtest results with 12 months of historical data
                  <br />
                  <span className="text-xs">Last updated: {new Date().toLocaleDateString()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}