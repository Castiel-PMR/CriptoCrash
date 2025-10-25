/**
 * 🔧 Web Worker для обработки WebSocket данных
 * Цель: Разгрузить главный поток от обработки ликвидаций
 */

import type { Liquidation, MarketStats } from '@shared/schema';

interface WorkerMessage {
  type: 'init' | 'close' | 'stats';
  data?: any;
}

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;

// Подключение к WebSocket серверу
function connectWebSocket(url: string) {
  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('🔌 Worker: WebSocket connected');
      self.postMessage({ type: 'connected' });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Передаем данные в главный поток
        self.postMessage({
          type: message.type,
          data: message.data,
        });
      } catch (error) {
        console.error('Worker: Parse error', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Worker: WebSocket error', error);
      self.postMessage({ type: 'error', data: error });
    };

    ws.onclose = () => {
      console.log('Worker: WebSocket closed, reconnecting...');
      self.postMessage({ type: 'disconnected' });
      
      // Переподключение через 3 секунды
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = self.setTimeout(() => {
        connectWebSocket(url);
      }, 3000) as unknown as number;
    };
  } catch (error) {
    console.error('Worker: Connection error', error);
  }
}

// Закрытие соединения
function closeWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  
  console.log('🔌 Worker: WebSocket closed');
}

// Обработка сообщений от главного потока
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      connectWebSocket(data.url);
      break;
      
    case 'close':
      closeWebSocket();
      break;
      
    default:
      console.warn('Worker: Unknown message type', type);
  }
});

// Очистка при завершении Worker
self.addEventListener('error', (event) => {
  console.error('Worker: Error', event);
  closeWebSocket();
});
