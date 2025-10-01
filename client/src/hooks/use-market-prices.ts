import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './use-websocket';

interface MarketPrice {
  symbol: string;
  price: string;
  change24h: string;
  changePercent: string;
  volume: string;
  timestamp: number;
}

export function useMarketPrices() {
  const { lastMessage, isConnected } = useWebSocket();
  const [prices, setPrices] = useState<{ [symbol: string]: number }>({});
  const [marketData, setMarketData] = useState<{ [symbol: string]: MarketPrice }>({});

  // Fetch initial market data once (WebSocket will provide updates)
  const { data: tickersData } = useQuery({
    queryKey: ['/api/market/tickers'],
    refetchInterval: false, // Disable polling - WebSocket provides real-time updates
    staleTime: Infinity, // Initial data never goes stale
  });

  // Update prices from API data
  useEffect(() => {
    if (tickersData && Array.isArray(tickersData)) {
      const newPrices: { [symbol: string]: number } = {};
      const newMarketData: { [symbol: string]: MarketPrice } = {};
      tickersData.forEach((ticker: MarketPrice) => {
        newPrices[ticker.symbol] = parseFloat(ticker.price);
        newMarketData[ticker.symbol] = ticker;
      });
      setPrices(prev => ({ ...prev, ...newPrices }));
      setMarketData(prev => ({ ...prev, ...newMarketData }));
    }
  }, [tickersData]);

  // Handle WebSocket price updates with real Kraken data
  useEffect(() => {
    if (lastMessage?.type === 'price_update') {
      console.log('[Market Prices] WebSocket update received:', Object.keys(lastMessage.data));
      const data = lastMessage.data;
      const newPrices: { [symbol: string]: number } = {};
      const newMarketData: { [symbol: string]: MarketPrice } = {};
      
      // Process each symbol from WebSocket
      Object.entries(data).forEach(([symbol, priceInfo]: [string, any]) => {
        newPrices[symbol] = priceInfo.price;
        newMarketData[symbol] = {
          symbol,
          price: priceInfo.price.toString(),
          change24h: priceInfo.change24h.toString(),
          changePercent: ((priceInfo.change24h / (priceInfo.price - priceInfo.change24h)) * 100).toFixed(2),
          volume: priceInfo.volume.toString(),
          timestamp: priceInfo.timestamp
        };
      });
      
      console.log('[Market Prices] Updated prices:', Object.keys(newPrices).map(s => `${s}: $${newPrices[s]}`));
      setPrices(prev => ({ ...prev, ...newPrices }));
      setMarketData(prev => ({ ...prev, ...newMarketData }));
    }
  }, [lastMessage]);

  const getPrice = (symbol: string): number => {
    return prices[symbol] || 0;
  };

  const getFormattedPrice = (symbol: string): string => {
    const price = prices[symbol];
    if (!price) return '$0.00';
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getFormattedChange = (symbol: string): string => {
    const data = marketData[symbol];
    if (!data) return '+0.00%';
    
    const changePercent = parseFloat(data.changePercent);
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  return {
    prices,
    marketData,
    getPrice,
    getFormattedPrice,
    getFormattedChange
  };
}