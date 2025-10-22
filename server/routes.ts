import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { LiquidationService } from "./services/liquidationService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Create WebSocket server on /ws path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  // Initialize liquidation service
  const liquidationService = new LiquidationService(wss);

  // REST API endpoints
  app.get('/api/liquidations/recent', (req, res) => {
    try {
      const recentLiquidations = liquidationService.getRecentLiquidations();
      res.json({ success: true, data: recentLiquidations });
    } catch (error) {
      console.error('Error fetching recent liquidations:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch liquidations' });
    }
  });

  app.get('/api/market/stats', (req, res) => {
    try {
      const stats = liquidationService.getMarketStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching market stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch market stats' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ 
      success: true, 
      message: 'Liquidation service is running',
      timestamp: Date.now()
    });
  });

  return httpServer;
}
