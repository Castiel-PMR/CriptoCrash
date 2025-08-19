import React from 'react';
import { MarketStats } from '@shared/schema';

interface MarketSentimentProps {
  stats: MarketStats;
}

export function MarketSentiment({ stats }: MarketSentimentProps) {
  const total = stats.longShortRatio.longs + stats.longShortRatio.shorts;
  const longPercentage = total > 0 ? (stats.longShortRatio.longs / total) * 100 : 50;
  const shortPercentage = 100 - longPercentage;

  return (
    <div className="bg-cyber-gray/90 backdrop-blur-md rounded-lg border border-cyber-border p-4 w-64">
      <h3 className="text-lg font-semibold mb-3 text-accent-blue">Market Sentiment</h3>
      <div className="space-y-4">
        {/* Long/Short Ratio */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-long-red">Longs</span>
            <span className="text-short-green">Shorts</span>
          </div>
          <div className="w-full bg-cyber-border rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-long-red to-short-green" 
              style={{
                background: `linear-gradient(90deg, #ef4444 0%, #ef4444 ${longPercentage}%, #10b981 ${longPercentage}%, #10b981 100%)`
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1 text-gray-400">
            <span>{longPercentage.toFixed(0)}%</span>
            <span>{shortPercentage.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
