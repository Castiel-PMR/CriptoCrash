import { useState, useEffect, useCallback } from 'react';
import { Liquidation, MarketStats } from '@shared/schema';

interface UseLiquidationDataReturn {
  liquidations: Liquidation[];
  lastFiveLiquidations: Liquidation[]; // 🔥 НОВОЕ: Последние 5 ликвидаций (не стираются)
  marketStats: MarketStats;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

export function useLiquidationData(): UseLiquidationDataReturn {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  // 🔥 НОВОЕ: Отдельное хранилище для последних 5 ликвидаций (не стираются)
  const [lastFiveLiquidations, setLastFiveLiquidations] = useState<Liquidation[]>([]);
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
              // Дополнительная валидация на клиенте
              const liquidation = message.data;
              if (liquidation && liquidation.symbol && liquidation.value > 0) {
                setLiquidations(prev => {
                  const updated = [...prev, liquidation];
                  // 🔥 ОПТИМИЗАЦИЯ: Храним только 30 последних (было 100)
                  return updated.slice(-30);
                });
                
                // 🔥 НОВОЕ: Обновляем последние 5 ликвидаций (только $50K+)
                if (liquidation.value >= 50000) {
                  setLastFiveLiquidations(prev => {
                    const updated = [...prev, liquidation];
                    return updated.slice(-5); // Всегда последние 5 крупных
                  });
                }
              }
              break;
              
            case 'marketStats':
              setMarketStats(message.data);
              break;
              
            case 'recentLiquidations':
              const recentLiqs = message.data || [];
              setLiquidations(recentLiqs);
              // 🔥 НОВОЕ: Инициализируем последние 5 (только $50K+)
              if (recentLiqs.length > 0) {
                const filtered50k = recentLiqs.filter((liq: Liquidation) => liq.value >= 50000);
                setLastFiveLiquidations(filtered50k.slice(-5));
              }
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
    lastFiveLiquidations, // 🔥 НОВОЕ: Возвращаем последние 5
    marketStats,
    isConnected,
    connectionError,
    reconnect,
  };
}
