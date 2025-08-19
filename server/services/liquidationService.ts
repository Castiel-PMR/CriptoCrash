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
    volumeHistory: [],
  };
  private recentLiquidations: Liquidation[] = [];

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
    this.connectToBinance();
    this.startCoinGlassPolling();
    this.startStatsUpdates();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected to liquidation feed');
      this.clients.add(ws);

      // Send current stats immediately
      ws.send(JSON.stringify({
        type: 'marketStats',
        data: this.marketStats
      }));

      // Send recent liquidations
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
            this.processLiquidation(liquidation);
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

  private parseBinanceLiquidation(data: any): Liquidation {
    return {
      id: `${data.E}-${data.s}-${Math.random()}`,
      timestamp: data.E,
      symbol: data.s,
      exchange: 'binance',
      side: data.S === 'SELL' ? 'long' : 'short',
      size: parseFloat(data.q),
      price: parseFloat(data.p),
      value: parseFloat(data.q) * parseFloat(data.p),
    };
  }

  private async startCoinGlassPolling() {
    const pollCoinGlass = async () => {
      try {
        // 🔹 24h summary
        const response = await fetch('https://open-api.coinglass.com/public/v2/liquidation_vol_chart?interval=24h');
        const data = await response.json();

        if (data.data) {
          const longs = data.data.longVolUsd || 0;
          const shorts = data.data.shortVolUsd || 0;

          // Обновляем суточные данные
          this.marketStats.totalLongs = longs;
          this.marketStats.totalShorts = shorts;

          this.broadcast({
            type: "marketStats",
            data: this.marketStats,
          });
        }
      } catch (error) {
        console.error('Error fetching CoinGlass daily data:', error);
      }
    };

    // Каждые 5 минут
    setInterval(pollCoinGlass, 300000);
    pollCoinGlass(); // Initial call
  }

  private processLiquidation(liquidation: Liquidation) {
    // Add to recent liquidations
    this.recentLiquidations.push(liquidation);
    if (this.recentLiquidations.length > 100) {
      this.recentLiquidations.shift();
    }

    // Не трогаем totalLongs/totalShorts (они = CoinGlass 24h)
    // Но считаем соотношение сделок
    if (liquidation.side === 'long') {
      this.marketStats.longShortRatio.longs++;
    } else {
      this.marketStats.longShortRatio.shorts++;
    }

    this.marketStats.activeLiquidations++;

    // Broadcast to all clients
    this.broadcast({
      type: 'liquidation',
      data: liquidation
    });
  }

  private startStatsUpdates() {
  setInterval(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Сумма ликвидаций за последние сутки
    const dailyLongs = this.recentLiquidations
      .filter(l => l.side === 'long' && now - l.timestamp < dayMs)
      .reduce((sum, l) => sum + l.value, 0);

    const dailyShorts = this.recentLiquidations
      .filter(l => l.side === 'short' && now - l.timestamp < dayMs)
      .reduce((sum, l) => sum + l.value, 0);

    this.marketStats.totalLongs = dailyLongs;
    this.marketStats.totalShorts = dailyShorts;

    // Обновляем историю (для графика)
    this.marketStats.volumeHistory.push({
      timestamp: now,
      longs: dailyLongs,
      shorts: dailyShorts,
    });

    if (this.marketStats.volumeHistory.length > 24) {
      this.marketStats.volumeHistory.shift();
    }

    // Reset activeLiquidations
    this.marketStats.activeLiquidations = Math.max(0, this.marketStats.activeLiquidations - 5);

    this.broadcast({
      type: 'marketStats',
      data: this.marketStats
    });
  }, 5000);
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
