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

  private processLiquidation(liquidation: Liquidation) {
    // Add to recent liquidations
    this.recentLiquidations.push(liquidation);
    if (this.recentLiquidations.length > 100) {
      this.recentLiquidations.shift();
    }

    // Update stats
    if (liquidation.side === 'long') {
      this.marketStats.totalLongs += liquidation.value;
      this.marketStats.longShortRatio.longs++;
    } else {
      this.marketStats.totalShorts += liquidation.value;
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

      // оставляем только ликвидации за последние 24ч
      this.recentLiquidations = this.recentLiquidations.filter(
        l => now - l.timestamp < 86400000
      );

      // считаем ликвидации за последний час
      const lastHour = this.recentLiquidations.filter(
        l => now - l.timestamp < 3600000
      );

      const recentLongs = lastHour
        .filter(l => l.side === 'long')
        .reduce((sum, l) => sum + l.value, 0);

      const recentShorts = lastHour
        .filter(l => l.side === 'short')
        .reduce((sum, l) => sum + l.value, 0);

      // 🔹 количество активных ликвидаций за час
      this.marketStats.activeLiquidations = lastHour.length;

      this.marketStats.volumeHistory.push({
        timestamp: now,
        longs: recentLongs,
        shorts: recentShorts,
      });

      // храним только 24ч (1440 точек по 1м)
      if (this.marketStats.volumeHistory.length > 1440) {
        this.marketStats.volumeHistory.shift();
      }

      this.broadcast({
        type: 'marketStats',
        data: this.marketStats
      });
    }, 60000); // раз в минуту
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
