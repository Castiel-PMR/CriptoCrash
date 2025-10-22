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
    volumeHistory: [],   // ✅ оставляем, чтобы фронт не падал
    priceMovementDelta: {
      lastPrice: 0,
      priceChange: 0,
      longsPerPriceUnit: 0,
      shortsPerPriceUnit: 0,
      deltaRatio: 1,
    }
  };

  private recentLiquidations: Liquidation[] = [];
  private statsResetInterval: ReturnType<typeof setInterval> | null = null;
  private statsStartTime: number = Date.now();
  
  // 🔥 НОВОЕ: Трекинг цены и ликвидаций для расчета delta
  private priceTracking = {
    btcPrice: 0,
    startPrice: 0,
    startTime: Date.now(),
    longsInPeriod: 0,
    shortsInPeriod: 0,
  };

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
    this.connectToBinance();
    // 🔥 ПРИМЕЧАНИЕ: Binance не предоставляет публичный REST API для исторических ликвидаций
    // Требуется API ключ. Используем только WebSocket real-time данные.
    // Для хранения истории между перезапусками можно использовать PostgreSQL.
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

  // 🔥 НОВОЕ: Получаем исторические данные по ликвидациям при старте
  private async fetchInitialLiquidations() {
    try {
      console.log('📥 Загрузка исторических ликвидаций...');
      
      // Binance Futures API для получения последних force orders
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
      let totalLoaded = 0;
      
      for (const symbol of symbols) {
        try {
          const url = `https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${symbol}&limit=20`;
          console.log(`  Загрузка ${symbol}...`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            console.log(`  ⚠️ ${symbol}: HTTP ${response.status}`);
            continue;
          }
          
          const orders = await response.json();
          console.log(`  ✓ ${symbol}: получено ${orders.length} ордеров`);
          
          // Преобразуем в наш формат
          for (const order of orders) {
            const liquidation = this.parseBinanceLiquidation(order);
            if (liquidation) {
              this.recentLiquidations.push(liquidation);
              totalLoaded++;
            }
          }
        } catch (err: any) {
          console.error(`  ❌ Ошибка ${symbol}:`, err.message);
        }
      }
      
      // Оставляем только последние 30
      this.recentLiquidations = this.recentLiquidations.slice(-30);
      
      console.log(`✅ Загружено ${totalLoaded} исторических ликвидаций (показываем ${this.recentLiquidations.length})`);
    } catch (error: any) {
      console.error('❌ Ошибка загрузки исторических данных:', error.message);
    }
  }

  private parseBinanceLiquidation(data: any): Liquidation | null {
    // Поддержка двух форматов: WebSocket (data.s) и REST API (data.symbol)
    const symbol = data.s || data.symbol;
    
    // Проверка: символ должен содержать только латиницу, цифры и заканчиваться на USDT, BUSD или USD
    const isValidSymbol = /^[A-Z0-9]+(USDT|BUSD|USD)$/.test(symbol);
    
    if (!isValidSymbol) {
      console.log(`Пропущен невалидный символ: ${symbol}`);
      return null;
    }
    
    // Проверка на корректность числовых значений
    // WebSocket: data.q, REST API: data.origQty
    const quantity = parseFloat(data.q || data.origQty);
    // WebSocket: data.p, REST API: data.price
    const price = parseFloat(data.p || data.price);
    
    if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
      console.log(`Пропущены некорректные данные: ${symbol}, q=${data.q || data.origQty}, p=${data.p || data.price}`);
      return null;
    }
    
    // WebSocket: data.E, REST API: data.time
    const timestamp = data.E || data.time || Date.now();
    // WebSocket: data.S, REST API: data.side
    const side = (data.S || data.side) === 'SELL' ? 'long' : 'short';
    
    return {
      id: `${timestamp}-${symbol}-${Math.random()}`,
      timestamp: timestamp,
      symbol: symbol,
      exchange: 'binance',
      side: side,
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
      this.priceTracking.longsInPeriod += liquidation.value;
    } else {
      this.marketStats.totalShorts += liquidation.value;
      this.marketStats.longShortRatio.shorts++;
      this.priceTracking.shortsInPeriod += liquidation.value;
    }

    this.marketStats.activeLiquidations++;

    // 🔥 НОВОЕ: Трекаем цену BTC для расчета delta (берем BTCUSDT как базовую)
    if (liquidation.symbol === 'BTCUSDT') {
      this.priceTracking.btcPrice = liquidation.price;
      
      // Инициализируем стартовую цену если это первая ликвидация BTC
      if (this.priceTracking.startPrice === 0) {
        this.priceTracking.startPrice = liquidation.price;
        this.priceTracking.startTime = Date.now();
      }
      
      this.calculatePriceMovementDelta();
    }

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

  // 🔥 НОВОЕ: Расчет ликвидаций на единицу движения цены
  private calculatePriceMovementDelta() {
    const currentTime = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    // Пересчитываем каждый час
    if (currentTime - this.priceTracking.startTime >= hourInMs) {
      const priceChange = Math.abs(this.priceTracking.btcPrice - this.priceTracking.startPrice);
      
      // Избегаем деления на 0
      if (priceChange > 10) { // Минимальное движение $10
        const longsPerDollar = this.priceTracking.longsInPeriod / priceChange;
        const shortsPerDollar = this.priceTracking.shortsInPeriod / priceChange;
        
        this.marketStats.priceMovementDelta = {
          lastPrice: this.priceTracking.btcPrice,
          priceChange: this.priceTracking.btcPrice - this.priceTracking.startPrice,
          longsPerPriceUnit: longsPerDollar,
          shortsPerPriceUnit: shortsPerDollar,
          deltaRatio: shortsPerDollar > 0 ? longsPerDollar / shortsPerDollar : 1,
        };
        
        console.log(`💰 Price Delta: BTC ${this.priceTracking.btcPrice.toFixed(0)}, Δ${priceChange.toFixed(0)}, Longs/$ ${longsPerDollar.toFixed(0)}, Shorts/$ ${shortsPerDollar.toFixed(0)}`);
      }
      
      // Сбрасываем трекинг для нового периода
      this.priceTracking.startPrice = this.priceTracking.btcPrice;
      this.priceTracking.startTime = currentTime;
      this.priceTracking.longsInPeriod = 0;
      this.priceTracking.shortsInPeriod = 0;
    }
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
      
      // Сбрасываем трекинг цены
      this.priceTracking.startPrice = this.priceTracking.btcPrice;
      this.priceTracking.startTime = Date.now();
      this.priceTracking.longsInPeriod = 0;
      this.priceTracking.shortsInPeriod = 0;
      
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
