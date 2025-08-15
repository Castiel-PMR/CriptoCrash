import React from 'react';
import { MarketStats } from '@shared/schema';

interface StatsHeaderProps {
  stats: MarketStats;
  isConnected: boolean;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

export function StatsHeader({ stats, isConnected, timeframe, onTimeframeChange }: StatsHeaderProps) {
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
      <div className="container mx-auto px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-3 lg:space-y-0">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-8 w-full lg:w-auto">
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-accent-blue to-accent-yellow bg-clip-text text-transparent">
              CryptoLiquidations
            </h1>
            <div className="flex items-center space-x-4 lg:space-x-6 overflow-x-auto w-full lg:w-auto">
              <div className="text-center flex-shrink-0">
                <div className="text-xs lg:text-sm text-gray-400">Лонги</div>
                <div className="text-lg lg:text-xl font-mono font-bold text-long-red stats-glow">
                  {formatCurrency(stats.totalLongs)}
                </div>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="text-xs lg:text-sm text-gray-400">Шорты</div>
                <div className="text-lg lg:text-xl font-mono font-bold text-short-green stats-glow">
                  {formatCurrency(stats.totalShorts)}
                </div>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="text-xs lg:text-sm text-gray-400">Активных</div>
                <div className="text-lg lg:text-xl font-mono font-bold text-accent-blue stats-glow">
                  {stats.activeLiquidations}
                </div>
              </div>
              
              {/* Timeframe Selector */}
              {timeframe && onTimeframeChange && (
                <div className="flex items-center gap-1 lg:ml-6">
                  <span className="text-xs text-gray-400 font-mono mr-1 lg:mr-2">График:</span>
                  {[
                    { label: '1м', value: '1m' },
                    { label: '5м', value: '5m' },
                    { label: '15м', value: '15m' },
                    { label: '30м', value: '30m' },
                    { label: '1ч', value: '1h' },
                    { label: '4ч', value: '4h' },
                    { label: '1д', value: '1d' }
                  ].map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => onTimeframeChange(tf.value)}
                      className={`
                        px-1.5 lg:px-2 py-1 text-xs font-mono rounded transition-all duration-200 min-h-[44px] lg:min-h-0 flex items-center
                        ${timeframe === tf.value 
                          ? 'bg-accent-blue text-black font-bold' 
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }
                      `}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end w-full lg:w-auto">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full animate-pulse ${
                  isConnected ? 'bg-short-green' : 'bg-long-red'
                }`}
              />
              <span className="text-xs lg:text-sm text-gray-400">
                {isConnected ? 'Подключено' : 'Отключено'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
