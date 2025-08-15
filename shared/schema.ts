import { z } from "zod";

export const liquidationSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  symbol: z.string(),
  exchange: z.string(),
  side: z.enum(['buy', 'sell', 'long', 'short']),
  size: z.number(),
  price: z.number(),
  value: z.number(),
});

export const marketStatsSchema = z.object({
  totalLongs: z.number(),
  totalShorts: z.number(),
  activeLiquidations: z.number(),
  longShortRatio: z.object({
    longs: z.number(),
    shorts: z.number(),
  }),
  volumeHistory: z.array(z.object({
    timestamp: z.number(),
    longs: z.number(),
    shorts: z.number(),
  })),
});

export type Liquidation = z.infer<typeof liquidationSchema>;
export type MarketStats = z.infer<typeof marketStatsSchema>;

export interface LiquidationBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  velocity: number;
  rotation: number;
  rotationSpeed: number;
  coin: string;
  isLong: boolean;
  amount: number;
  price: number;
  opacity: number;
  isExploding: boolean;
  explosionTime: number;
  isCaught: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  totalCaught: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
}
