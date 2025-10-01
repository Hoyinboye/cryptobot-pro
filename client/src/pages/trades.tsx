import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProCard, MetricTile } from '@/components/ui/pro-card';
import { ProTable, ProTableColumn } from '@/components/ui/pro-table';
import { TopNavigation } from '@/components/layout/top-navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useState, useMemo } from 'react';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  Download,
  Eye,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react';
import {
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Trades() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSymbol, setFilterSymbol] = useState('all');
  const [filterSide, setFilterSide] = useState('all');
  const [filterTimeframe, setFilterTimeframe] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<any>(null);

  // Build query parameters for backend filtering
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (filterSymbol !== 'all') params.append('symbol', filterSymbol);
    if (filterSide !== 'all') params.append('side', filterSide);
    return params.toString();
  }, [page, limit, filterStatus, filterSymbol, filterSide]);

  const { data: tradesData } = useQuery({
    queryKey: ['/api/trades', queryParams],
    queryFn: async () => {
      const token = localStorage.getItem('firebase-token');
      const response = await fetch(`/api/trades?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch trades');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const trades = (tradesData as any)?.trades || [];
  const pagination = (tradesData as any)?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 };

  // Client-side search filter (for search within current page results)
  const filteredTrades = useMemo(() => {
    if (!searchTerm) return trades;
    return trades.filter((trade: any) => 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.id.toString().includes(searchTerm)
    );
  }, [trades, searchTerm]);

  // Calculate comprehensive statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((trade: any) => parseFloat(trade.pnl) > 0);
  const losingTrades = trades.filter((trade: any) => parseFloat(trade.pnl) < 0);
  const breakEvenTrades = trades.filter((trade: any) => parseFloat(trade.pnl) === 0);
  
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const totalPnL = trades.reduce((sum: number, trade: any) => sum + parseFloat(trade.pnl || '0'), 0);
  const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;
  
  const avgWin = winningTrades.length > 0 ? 
    winningTrades.reduce((sum: number, trade: any) => sum + parseFloat(trade.pnl), 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? 
    Math.abs(losingTrades.reduce((sum: number, trade: any) => sum + parseFloat(trade.pnl), 0) / losingTrades.length) : 0;
  
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
  const totalVolume = trades.reduce((sum: number, trade: any) => 
    sum + (parseFloat(trade.amount) * parseFloat(trade.price)), 0);

  // Best and worst trades
  const bestTrade = trades.length > 0 ? trades.reduce((best: any, trade: any) => 
    parseFloat(trade.pnl) > parseFloat(best.pnl || '0') ? trade : best) : null;
  const worstTrade = trades.length > 0 ? trades.reduce((worst: any, trade: any) => 
    parseFloat(trade.pnl) < parseFloat(worst.pnl || '0') ? trade : worst) : null;

  // Symbol performance
  const symbolStats = useMemo(() => {
    const stats: any = {};
    trades.forEach((trade: any) => {
      const symbol = trade.symbol;
      if (!stats[symbol]) {
        stats[symbol] = { 
          trades: 0, 
          pnl: 0, 
          wins: 0, 
          volume: 0,
          avgHoldTime: 0 
        };
      }
      stats[symbol].trades += 1;
      stats[symbol].pnl += parseFloat(trade.pnl || '0');
      stats[symbol].volume += parseFloat(trade.amount) * parseFloat(trade.price);
      if (parseFloat(trade.pnl || '0') > 0) stats[symbol].wins += 1;
    });
    return stats;
  }, [trades]);

  // Table columns
  const tradesColumns: ProTableColumn[] = [
    {
      key: 'createdAt',
      title: 'Date/Time',
      sortable: true,
      width: '140px',
      render: (value: string) => (
        <div>
          <div className="font-medium text-sm">
            {new Date(value).toLocaleDateString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      key: 'symbol',
      title: 'Symbol',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {value.replace('USD', '').slice(0, 2)}
            </span>
          </div>
          <span className="font-medium">{value.replace('USD', '/USD')}</span>
        </div>
      )
    },
    {
      key: 'side',
      title: 'Side',
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === 'buy' ? 'default' : 'destructive'} className="text-xs">
          {value.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      className: 'text-right',
      render: (value: string) => parseFloat(value).toFixed(6)
    },
    {
      key: 'price',
      title: 'Price',
      sortable: true,
      className: 'text-right',
      render: (value: string) => `$${parseFloat(value).toFixed(2)}`
    },
    {
      key: 'total',
      title: 'Total Value',
      sortable: true,
      className: 'text-right',
      render: (value: string, row: any) => {
        const total = parseFloat(row.amount) * parseFloat(row.price);
        return `$${total.toFixed(2)}`;
      }
    },
    {
      key: 'pnl',
      title: 'P&L',
      sortable: true,
      className: 'text-right',
      render: (value: string, row: any) => {
        const pnl = parseFloat(row.pnl || '0');
        return (
          <div className={`${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className="font-medium">${pnl.toFixed(2)}</div>
          </div>
        );
      }
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => {
        const variants: any = {
          completed: 'default',
          pending: 'secondary',
          cancelled: 'destructive',
          failed: 'destructive'
        };
        return (
          <Badge variant={variants[value] || 'secondary'} className="text-xs">
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Badge>
        );
      }
    }
  ];

  const TradeDetailDialog = ({ trade }: { trade: any }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trade Details - #{trade.id}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Symbol</Label>
              <div className="font-medium">{trade.symbol.replace('USD', '/USD')}</div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Side</Label>
              <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                {trade.side.toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Amount</Label>
              <div className="font-medium">{parseFloat(trade.amount).toFixed(6)}</div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Price</Label>
              <div className="font-medium">${parseFloat(trade.price).toFixed(2)}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Total Value</Label>
              <div className="font-medium">
                ${(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">P&L</Label>
              <div className={`font-medium ${parseFloat(trade.pnl || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${parseFloat(trade.pnl || '0').toFixed(2)}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <div className="font-medium">{trade.status}</div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Date</Label>
              <div className="font-medium">
                {new Date(trade.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background" data-testid="trades-page">
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
            Trade History
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive trading performance analysis and history
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProCard
          title="Total P&L"
          value={`$${totalPnL.toFixed(2)}`}
          change={totalPnL > 0 ? 15.2 : -8.4}
          changeType="percentage"
          trend={totalPnL >= 0 ? 'up' : 'down'}
          icon={<DollarSign className="w-5 h-5" />}
          variant="metric"
          data-testid="total-pnl-card"
        />
        
        <ProCard
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          change={winRate > 50 ? 5.2 : -2.8}
          changeType="percentage"
          trend={winRate > 50 ? 'up' : 'down'}
          icon={<Target className="w-5 h-5" />}
          data-testid="win-rate-card"
        />
        
        <ProCard
          title="Total Trades"
          value={totalTrades}
          subtitle={`${winningTrades.length}W / ${losingTrades.length}L`}
          icon={<Activity className="w-5 h-5" />}
          data-testid="total-trades-card"
        />
        
        <ProCard
          title="Avg Trade"
          value={`$${avgTrade.toFixed(2)}`}
          change={avgTrade > 0 ? 8.7 : -12.3}
          changeType="percentage"
          trend={avgTrade >= 0 ? 'up' : 'down'}
          icon={<BarChart3 className="w-5 h-5" />}
          data-testid="avg-trade-card"
        />
      </div>

      {/* Advanced Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Profit Factor"
          value={profitFactor.toFixed(2)}
          change={profitFactor > 1 ? 12.5 : -8.2}
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          trend={profitFactor > 1 ? 'up' : 'down'}
        />
        <MetricTile
          label="Avg Win"
          value={`$${avgWin.toFixed(2)}`}
          changeLabel="per win"
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        />
        <MetricTile
          label="Avg Loss"
          value={`$${avgLoss.toFixed(2)}`}
          changeLabel="per loss"
          icon={<TrendingDown className="w-4 h-4 text-red-500" />}
        />
        <MetricTile
          label="Total Volume"
          value={`$${(totalVolume / 1000).toFixed(0)}K`}
          change={23.4}
          icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
          trend="up"
        />
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label className="text-sm font-medium">Search</Label>
              <Input
                placeholder="Symbol or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-input"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Symbol</Label>
              <Select value={filterSymbol} onValueChange={setFilterSymbol}>
                <SelectTrigger data-testid="symbol-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  <SelectItem value="BTCUSD">BTC/USD</SelectItem>
                  <SelectItem value="ETHUSD">ETH/USD</SelectItem>
                  <SelectItem value="ADAUSD">ADA/USD</SelectItem>
                  <SelectItem value="SOLUSD">SOL/USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Side</Label>
              <Select value={filterSide} onValueChange={setFilterSide}>
                <SelectTrigger data-testid="side-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sides</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Time Range</Label>
              <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
                <SelectTrigger data-testid="timeframe-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterSymbol('all');
                  setFilterSide('all');
                  setFilterTimeframe('all');
                }}
                data-testid="clear-filters-btn"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trades" className="space-y-4" data-testid="trades-tabs">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trades" data-testid="trades-tab">All Trades ({filteredTrades.length})</TabsTrigger>
          <TabsTrigger value="performance" data-testid="performance-tab">Performance Analysis</TabsTrigger>
          <TabsTrigger value="symbols" data-testid="symbols-tab">Symbol Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4" data-testid="trades-content">
          <ProTable
            data={filteredTrades}
            columns={tradesColumns}
            searchable={false}
            exportable={true}
            onExport={() => console.log('Export trades')}
            pagination={{
              page,
              pageSize: limit,
              total: pagination.total,
              onPageChange: setPage
            }}
            actions={(row) => (
              <>
                <DropdownMenuItem onClick={() => setSelectedTrade(row)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Export Trade
                </DropdownMenuItem>
              </>
            )}
            emptyState={
              <div className="text-center py-12">
                <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {trades.length === 0 ? 'No trades yet' : 'No trades match your filters'}
                </h3>
                <p className="text-muted-foreground">
                  {trades.length === 0 ? 'Start trading to see your transaction history' : 'Try adjusting your filters'}
                </p>
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4" data-testid="performance-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Best & Worst Trades */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Best Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  {bestTrade ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="font-medium">{bestTrade.symbol.replace('USD', '/USD')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">P&L:</span>
                        <span className="font-medium text-green-600">
                          +${parseFloat(bestTrade.pnl).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="text-sm">{new Date(bestTrade.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No profitable trades yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Worst Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  {worstTrade ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="font-medium">{worstTrade.symbol.replace('USD', '/USD')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">P&L:</span>
                        <span className="font-medium text-red-600">
                          ${parseFloat(worstTrade.pnl).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="text-sm">{new Date(worstTrade.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No losing trades yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trading Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trading Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MetricTile
                    label="Winning Trades"
                    value={winningTrades.length}
                    change={winRate}
                    size="sm"
                  />
                  <MetricTile
                    label="Losing Trades"
                    value={losingTrades.length}
                    change={100 - winRate}
                    size="sm"
                  />
                  <MetricTile
                    label="Break Even"
                    value={breakEvenTrades.length}
                    changeLabel="trades"
                    size="sm"
                  />
                  <MetricTile
                    label="Largest Win"
                    value={bestTrade ? `$${parseFloat(bestTrade.pnl).toFixed(0)}` : '$0'}
                    changeLabel=""
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="symbols" className="space-y-4" data-testid="symbols-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(symbolStats).length === 0 ? (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="text-center py-12">
                  <PieChart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No trading data available</h3>
                  <p className="text-muted-foreground">Start trading to see symbol performance breakdown</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(symbolStats).map(([symbol, stats]: [string, any]) => (
                <ProCard
                  key={symbol}
                  title={symbol.replace('USD', '/USD')}
                  value={`$${stats.pnl.toFixed(2)}`}
                  subtitle={`${stats.trades} trades • ${((stats.wins / stats.trades) * 100).toFixed(1)}% win rate`}
                  trend={stats.pnl >= 0 ? 'up' : 'down'}
                  change={(stats.pnl / stats.volume) * 100}
                  changeType="percentage"
                  variant="metric"
                >
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Volume:</span>
                      <span className="font-medium">${(stats.volume / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Avg P&L:</span>
                      <span className="font-medium">${(stats.pnl / stats.trades).toFixed(2)}</span>
                    </div>
                  </div>
                </ProCard>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Trade Detail Dialog */}
      {selectedTrade && <TradeDetailDialog trade={selectedTrade} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}