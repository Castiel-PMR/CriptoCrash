import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketStats } from "@shared/schema";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface MarketSentimentProps {
  stats: MarketStats;
}

export function MarketSentiment({ stats }: MarketSentimentProps) {
  const delta = stats.priceMovementDelta;
  
  // Fallback на старую метрику если delta еще не рассчитана
  if (!delta || delta.priceChange === 0) {
    const totalRatio = stats.longShortRatio.longs + stats.longShortRatio.shorts;
    const longPercentage = totalRatio > 0 
      ? (stats.longShortRatio.longs / totalRatio) * 100 
      : 50;
    const shortPercentage = 100 - longPercentage;

    return (
      <Card className="bg-gray-900/50 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2 text-base">
            <Activity className="w-4 h-4" />
            🔥 Liq Delta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-red-400">Longs</span>
                <span className="text-red-400 font-mono">{longPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${longPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-400">Shorts</span>
                <span className="text-green-400 font-mono">{shortPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${shortPercentage}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                Collecting price movement data...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🔥 НОВАЯ МЕТРИКА: Ликвидации на единицу движения цены
  const priceDirection = delta.priceChange > 0 ? 'up' : 'down';
  const isLongsStronger = delta.deltaRatio > 1;
  
  // Нормализуем для отображения (0-100%)
  const maxValue = Math.max(delta.longsPerPriceUnit, delta.shortsPerPriceUnit);
  const longsPercentage = maxValue > 0 ? (delta.longsPerPriceUnit / maxValue) * 100 : 0;
  const shortsPercentage = maxValue > 0 ? (delta.shortsPerPriceUnit / maxValue) * 100 : 0;

  return (
    <Card className="bg-gray-900/50 border-red-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-400 flex items-center gap-2 text-base">
          <Activity className="w-4 h-4" />
          🔥 Liq Delta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Информация о движении цены */}
          <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              {priceDirection === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-gray-400">BTC Price</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-white">
                ${delta.lastPrice.toFixed(0)}
              </div>
              <div className={`text-xs font-mono ${priceDirection === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {priceDirection === 'up' ? '+' : ''}{delta.priceChange.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Longs per Price Unit */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-red-400">Longs / $1 move</span>
              <span className="text-red-400 font-mono">
                ${(delta.longsPerPriceUnit / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${longsPercentage}%` }}
              />
            </div>
          </div>

          {/* Shorts per Price Unit */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-green-400">Shorts / $1 move</span>
              <span className="text-green-400 font-mono">
                ${(delta.shortsPerPriceUnit / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${shortsPercentage}%` }}
              />
            </div>
          </div>

          {/* Интерпретация */}
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Ratio:</span>
              <span className={`font-mono font-bold ${isLongsStronger ? 'text-red-400' : 'text-green-400'}`}>
                {delta.deltaRatio.toFixed(2)}x
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isLongsStronger ? (
                <span className="text-red-400">
                  🔥 More longs liquidated per price move
                </span>
              ) : (
                <span className="text-green-400">
                  🔥 More shorts liquidated per price move
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
