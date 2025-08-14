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
        const response = await fetch('https://open-api.coinglass.com/public/v2/liquidation_history?interval=1m&limit=50');
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((item: any) => {
            // Process both long and short liquidations
            if (item.longLiquidationUsd > 1000) {
              const liquidation: Liquidation = {
                id: `coinglass-long-${item.createTime}-${item.symbol}`,
                timestamp: item.createTime,
                symbol: item.symbol,
                exchange: 'coinglass',
                side: 'long',
                size: item.longLiquidationUsd / item.price,
                price: item.price,
                value: item.longLiquidationUsd,
              };
              this.processLiquidation(liquidation);
            }

            if (item.shortLiquidationUsd > 1000) {
              const liquidation: Liquidation = {
                id: `coinglass-short-${item.createTime}-${item.symbol}`,
                timestamp: item.createTime,
                symbol: item.symbol,
                exchange: 'coinglass',
                side: 'short',
                size: item.shortLiquidationUsd / item.price,
                price: item.price,
                value: item.shortLiquidationUsd,
              };
              this.processLiquidation(liquidation);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching CoinGlass data:', error);
      }
    };

    // Poll every 30 seconds
    setInterval(pollCoinGlass, 30000);
    pollCoinGlass(); // Initial call
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
      // Update volume history
      const now = Date.now();
      const recentLongs = this.recentLiquidations
        .filter(l => l.side === 'long' && now - l.timestamp < 3600000)
        .reduce((sum, l) => sum + l.value, 0);
      
      const recentShorts = this.recentLiquidations
        .filter(l => l.side === 'short' && now - l.timestamp < 3600000)
        .reduce((sum, l) => sum + l.value, 0);

      this.marketStats.volumeHistory.push({
        timestamp: now,
        longs: recentLongs,
        shorts: recentShorts,
      });

      if (this.marketStats.volumeHistory.length > 24) {
        this.marketStats.volumeHistory.shift();
      }

      // Reset active count periodically
      this.marketStats.activeLiquidations = Math.max(0, this.marketStats.activeLiquidations - 5);

      // Broadcast updated stats
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
