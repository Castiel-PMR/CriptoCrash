import React from 'react';
import { MarketStats } from '@shared/schema';

interface StatsHeaderProps {
  stats: MarketStats;
  isConnected: boolean;
  animationSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export function StatsHeader({ stats, isConnected, animationSpeed, onSpeedChange }: StatsHeaderProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-cyber-gray/90 backdrop-blur-md border-b border-cyber-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-blue to-accent-yellow bg-clip-text text-transparent">
              CryptoLiquidations
            </h1>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-400">Total Longs</div>
                <div className="text-xl font-mono font-bold text-long-red stats-glow">
                  {formatCurrency(stats.totalLongs)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Total Shorts</div>
                <div className="text-xl font-mono font-bold text-short-green stats-glow">
                  {formatCurrency(stats.totalShorts)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Active Feed</div>
                <div className="text-xl font-mono font-bold text-accent-blue stats-glow">
                  {stats.activeLiquidations}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full animate-pulse ${
                  isConnected ? 'bg-short-green' : 'bg-long-red'
                }`}
              />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Live Feed' : 'Disconnected'}
              </span>
            </div>
            
            {/* Speed Control */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Speed:</label>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.5" 
                value={animationSpeed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-20 h-2 bg-cyber-border rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm text-gray-400 min-w-[2rem]">{animationSpeed}x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
