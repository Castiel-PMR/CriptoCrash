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
    this.startCoinGlassPolling(); // ✅ берем статистику только отсюда
    this.startStatsUpdates();     // ✅ только обновление ratio + active
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected to liquidation feed');
      this.clients.add(ws);

      ws.send(JSON.stringify({
        type: 'marketStats',
        data: this.marketStats
      }));

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

  // ✅ только CoinGlass обновляет totalLongs/totalShorts
  private async startCoinGlassPolling() {
    const pollCoinGlass = async () => {
      try {
        const response = await fetch(
          'https://open-api.coinglass.com/public/v2/liquidation_vol_chart?interval=24h'
        );
        const data = await response.json();

        if (data.data) {
          const longs = data.data.longVolUsd || 0;
          const shorts = data.data.shortVolUsd || 0;

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

    setInterval(pollCoinGlass, 300000); // каждые 5 мин
    pollCoinGlass();
  }

  private processLiquidation(liquidation: Liquidation) {
    this.recentLiquidations.push(liquidation);
    if (this.recentLiquidations.length > 100) {
      this.recentLiquidations.shift();
    }

    // ✅ считаем только ratio
    if (liquidation.side === 'long') {
      this.marketStats.longShortRatio.longs++;
    } else {
      this.marketStats.longShortRatio.shorts++;
    }

    this.marketStats.activeLiquidations++;

    this.broadcast({
      type: 'liquidation',
      data: liquidation
    });
  }

  // ✅ убрал пересчет totalLongs/totalShorts
  private startStatsUpdates() {
    setInterval(() => {
      const now = Date.now();

      // обновляем историю ratio (не 24h объёмы)
      this.marketStats.volumeHistory.push({
        timestamp: now,
        longs: this.marketStats.longShortRatio.longs,
        shorts: this.marketStats.longShortRatio.shorts,
      });

      if (this.marketStats.volumeHistory.length > 24) {
        this.marketStats.volumeHistory.shift();
      }

      // Reset activeLiquidations постепенно
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
