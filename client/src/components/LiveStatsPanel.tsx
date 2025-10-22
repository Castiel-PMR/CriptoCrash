import React from 'react';
import { Liquidation } from '@shared/schema';

interface LiveStatsPanelProps {
  recentLiquidations: Liquidation[];
}

export function LiveStatsPanel({ recentLiquidations }: LiveStatsPanelProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  // 🔥 ИСПРАВЛЕНО: Показываем ровно 5 последних (не фильтруем, не обрезаем)
  // Данные приходят уже готовые из lastFiveLiquidations
  const displayLiquidations = recentLiquidations.slice(0, 5).reverse();

  return (
    <div className="bg-cyber-gray/90 backdrop-blur-md rounded-lg border border-cyber-border p-4 w-64">
      <h3 className="text-base font-semibold mb-3 text-accent-blue flex items-center gap-2">
        💎 Крупные ликвидации
        <span className="text-xs text-gray-400">$50K+</span>
      </h3>
      <div className="space-y-2 text-sm font-mono">
        {displayLiquidations.length > 0 ? (
          displayLiquidations.map((liquidation) => (
            <div 
              key={liquidation.id} 
              className="flex justify-between items-center py-1 border-b border-cyber-border/50"
            >
              <span className="text-accent-yellow font-semibold">
                {liquidation.symbol.replace('USDT', '').replace('USD', '')}
              </span>
              <span className={liquidation.side === 'long' ? 'text-long-red' : 'text-short-green'}>
                {liquidation.side === 'long' ? '-' : '+'}
                {formatCurrency(liquidation.value)}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            Waiting for liquidation data...
          </div>
        )}
      </div>
    </div>
  );
}
