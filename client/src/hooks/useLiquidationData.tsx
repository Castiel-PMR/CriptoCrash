import { useState, useEffect, useCallback } from 'react';
import { Liquidation, MarketStats } from '@shared/schema';

interface UseLiquidationDataReturn {
  liquidations: Liquidation[];
  marketStats: MarketStats;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

export function useLiquidationData(): UseLiquidationDataReturn {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalLongs: 0,
    totalShorts: 0,
    activeLiquidations: 0,
    longShortRatio: { longs: 0, shorts: 0 },
    volumeHistory: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Connected to liquidation feed');
        setIsConnected(true);
        setConnectionError(null);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'liquidation':
              setLiquidations(prev => {
                const updated = [...prev, message.data];
                // Keep only last 100 liquidations
                return updated.slice(-100);
              });
              break;
              
            case 'marketStats':
              setMarketStats(message.data);
              break;
              
            case 'recentLiquidations':
              setLiquidations(message.data || []);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('Disconnected from liquidation feed');
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
        setIsConnected(false);
      };

      setWs(socket);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError('Failed to establish connection');
      setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (ws) {
      ws.close();
    }
    setConnectionError(null);
    connect();
  }, [ws, connect]);

  return {
    liquidations,
    marketStats,
    isConnected,
    connectionError,
    reconnect,
  };
}
