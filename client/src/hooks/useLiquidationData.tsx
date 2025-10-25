import { useState, useEffect, useCallback, useRef } from 'react';
import { Liquidation, MarketStats } from '@shared/schema';

interface UseLiquidationDataReturn {
  liquidations: Liquidation[];
  lastFiveLiquidations: Liquidation[];
  marketStats: MarketStats;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

export function useLiquidationData(): UseLiquidationDataReturn {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
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
  
  // ✅ Refs для правильной очистки
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    // Очищаем предыдущее соединение
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!isMountedRef.current) return;
        console.log('🔌 Connected to liquidation feed');
        setIsConnected(true);
        setConnectionError(null);
      };

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'liquidation':
              const liquidation = message.data;
              if (liquidation && liquidation.symbol && liquidation.value > 0) {
                setLiquidations(prev => {
                  // ✅ Ограничиваем 20 элементов (было 30)
                  const updated = [...prev, liquidation];
                  return updated.slice(-20);
                });
                
                // Обновляем последние 5 ликвидаций ($50K+)
                if (liquidation.value >= 50000) {
                  setLastFiveLiquidations(prev => {
                    const updated = [...prev, liquidation];
                    return updated.slice(-5);
                  });
                }
              }
              break;
              
            case 'marketStats':
              setMarketStats(message.data);
              break;
              
            case 'recentLiquidations':
              const recentLiqs = message.data || [];
              setLiquidations(recentLiqs.slice(-20));
              
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
        if (!isMountedRef.current) return;
        
        console.log('🔌 Disconnected, reconnecting...');
        setIsConnected(false);
        
        // ✅ Переподключение через 3 секунды
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, 3000);
      };

      socket.onerror = (error) => {
        if (!isMountedRef.current) return;
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
        setIsConnected(false);
      };

      wsRef.current = socket;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError('Failed to establish connection');
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, 5000);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    
    // ✅ ПРАВИЛЬНАЯ ОЧИСТКА при unmount
    return () => {
      isMountedRef.current = false;
      
      // Очищаем таймер переподключения
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      // Закрываем WebSocket
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
        console.log('🔌 WebSocket cleaned up');
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionError(null);
    connect();
  }, [connect]);

  return {
    liquidations,
    lastFiveLiquidations,
    marketStats,
    isConnected,
    connectionError,
    reconnect,
  };
}
