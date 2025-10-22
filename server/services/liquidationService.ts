import { WebSocketServer, WebSocket } from 'ws';
import { Liquidation, MarketStats } from '@shared/schema';

export class LiquidationService {
  private clients: Set<WebSocket> = new Set();
  private binanceWs: WebSocket | null = null;
  private marketStats: MarketStats = {
    totalLongs: 0,
    totalShorts: 0,
    activeLiquidations: 0,
    longShortRatio: { longs: 0, shorts: 0 },
    volumeHistory: []   // ✅ оставляем, чтобы фронт не падал
  };

  private recentLiquidations: Liquidation[] = [];
  private statsResetInterval: ReturnType<typeof setInterval> | null = null;
  private statsStartTime: number = Date.now();

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
    this.connectToBinance();
    this.startStatsUpdates();
    this.startStatsReset();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected to liquidation feed');
      this.clients.add(ws);

      // Отправляем текущие статистики сразу
      ws.send(JSON.stringify({
        type: 'marketStats',
        data: this.marketStats
      }));

      // Отправляем последние ликвидации
      ws.send(JSON.stringify({
        type: 'recentLiquidations',
        data: this.recentLiquidations.slice(-10)
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('Client disconnected from liquidation feed');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private connectToBinance() {
    const binanceUrl = 'wss://fstream.binance.com/ws/!forceOrder@arr';
    
    try {
      this.binanceWs = new WebSocket(binanceUrl);

      this.binanceWs.on('open', () => {
        console.log('Connected to Binance liquidation stream');
      });

      this.binanceWs.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.o) {
            const liquidation = this.parseBinanceLiquidation(message.o);
            // Обрабатываем только валидные ликвидации
            if (liquidation) {
              this.processLiquidation(liquidation);
            }
          }
        } catch (error) {
          console.error('Error parsing Binance message:', error);
        }
      });

      this.binanceWs.on('error', (error) => {
        console.error('Binance WebSocket error:', error);
        setTimeout(() => this.connectToBinance(), 5000);
      });

      this.binanceWs.on('close', () => {
        console.log('Binance connection closed, reconnecting...');
        setTimeout(() => this.connectToBinance(), 5000);
      });
    } catch (error) {
      console.error('Failed to connect to Binance:', error);
      setTimeout(() => this.connectToBinance(), 5000);
    }
  }

  private parseBinanceLiquidation(data: any): Liquidation | null {
    // Фильтруем только нормальные крипто пары (латиница + USDT/BUSD)
    const symbol = data.s;
    
    // Проверка: символ должен содержать только латиницу, цифры и заканчиваться на USDT, BUSD или USD
    const isValidSymbol = /^[A-Z0-9]+(USDT|BUSD|USD)$/.test(symbol);
    
    if (!isValidSymbol) {
      console.log(`Пропущен невалидный символ: ${symbol}`);
      return null;
    }
    
    // Проверка на корректность числовых значений
    const quantity = parseFloat(data.q);
    const price = parseFloat(data.p);
    
    if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
      console.log(`Пропущены некорректные данные: ${symbol}, q=${data.q}, p=${data.p}`);
      return null;
    }
    
    return {
      id: `${data.E}-${data.s}-${Math.random()}`,
      timestamp: data.E,
      symbol: data.s,
      exchange: 'binance',
      side: data.S === 'SELL' ? 'long' : 'short',
      size: quantity,
      price: price,
      value: quantity * price,
    };
  }

  private processLiquidation(liquidation: Liquidation) {
    // Добавляем в список последних ликвидаций
    this.recentLiquidations.push(liquidation);
    if (this.recentLiquidations.length > 100) {
      this.recentLiquidations.shift();
    }

    // Обновляем статистику
    if (liquidation.side === 'long') {
      this.marketStats.totalLongs += liquidation.value;
      this.marketStats.longShortRatio.longs++;
    } else {
      this.marketStats.totalShorts += liquidation.value;
      this.marketStats.longShortRatio.shorts++;
    }

    this.marketStats.activeLiquidations++;

    // Логирование каждой 10-й ликвидации для мониторинга
    if (this.marketStats.activeLiquidations % 10 === 0) {
      console.log(`Обработано ликвидаций: ${this.marketStats.activeLiquidations}, Longs: $${(this.marketStats.totalLongs/1000000).toFixed(2)}M, Shorts: $${(this.marketStats.totalShorts/1000000).toFixed(2)}M`);
    }

    // Отправляем клиентам новую ликвидацию
    this.broadcast({
      type: 'liquidation',
      data: liquidation
    });
  }

  private startStatsUpdates() {
    setInterval(() => {
      // 🔥 оставляем только "живую" механику активных ликвидаций
      this.marketStats.activeLiquidations = Math.max(0, this.marketStats.activeLiquidations - 5);

      this.broadcast({
        type: 'marketStats',
        data: this.marketStats
      });
    }, 60000); // обновление раз в минуту
  }

  private startStatsReset() {
    // Сбрасываем статистику каждые 24 часа для корректного отображения
    this.statsResetInterval = setInterval(() => {
      console.log('Сброс статистики за 24 часа');
      console.log(`Было: Longs=${this.marketStats.totalLongs.toFixed(2)}, Shorts=${this.marketStats.totalShorts.toFixed(2)}`);
      
      // Сбрасываем накопленные значения
      this.marketStats.totalLongs = 0;
      this.marketStats.totalShorts = 0;
      this.marketStats.longShortRatio.longs = 0;
      this.marketStats.longShortRatio.shorts = 0;
      this.statsStartTime = Date.now();
      
      this.broadcast({
        type: 'marketStats',
        data: this.marketStats
      });
    }, 24 * 60 * 60 * 1000); // каждые 24 часа
  }

  private broadcast(message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public getRecentLiquidations() {
    return this.recentLiquidations.slice(-50);
  }

  public getMarketStats() {
    return this.marketStats;
  }
}
