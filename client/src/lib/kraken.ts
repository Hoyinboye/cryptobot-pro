// Client-side Kraken functionality (API calls go through backend)
export interface MarketData {
  symbol: string;
  price: string;
  change24h: string;
  volume: string;
  high: string;
  low: string;
}

export async function getMarketTicker(symbol: string): Promise<MarketData> {
  const response = await fetch(`/api/market/ticker/${symbol}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch market data');
  }

  return response.json();
}

export async function getAllTickers(): Promise<Record<string, MarketData>> {
  const response = await fetch('/api/market/tickers');
  
  if (!response.ok) {
    throw new Error('Failed to fetch market data');
  }

  return response.json();
}

export interface TradeOrder {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop-loss';
  amount: string;
  price?: string; // Optional for market orders
  stopLoss?: string;
  takeProfit?: string;
}

export async function placeTrade(order: TradeOrder) {
  const token = localStorage.getItem('firebase-token');
  const response = await fetch('/api/trade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(order)
  });

  if (!response.ok) {
    throw new Error('Trade failed');
  }

  return response.json();
}
