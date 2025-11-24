import React, { useState, useEffect } from 'react';
import { LiquidationCanvas } from '../components/LiquidationCanvas';
import { StatsHeader } from '../components/StatsHeader';
import { LiveStatsPanel } from '../components/LiveStatsPanel';
import { MarketSentiment } from '../components/MarketSentiment';
import { SymbolSearch } from '../components/SymbolSearch';
import { useLiquidationData } from '../hooks/useLiquidationData';
import { Pause, Play, Settings, RefreshCw } from 'lucide-react';

export default function LiquidationDashboard() {
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [minLiquidationAmount, setMinLiquidationAmount] = useState(1); // Default $1 minimum
  const [timeframe, setTimeframe] = useState('1m'); // Default 1-minute timeframe
  const [chartSymbol, setChartSymbol] = useState('BTCUSDT'); // 🔥 НОВОЕ: Выбранный символ для графика
  const [filterBySymbol, setFilterBySymbol] = useState(false); // 🔥 НОВОЕ: Фильтровать ликвидации по символу графика

  const [chartOpacity, setChartOpacity] = useState(100); // Opacity in percentage
  
  const { 
    liquidations, 
    lastFiveLiquidations, // 🔥 НОВОЕ: Последние 5 ликвидаций
    marketStats, 
    isConnected, 
    connectionError,
    reconnect 
  } = useLiquidationData();

  // Filter liquidations based on minimum amount AND symbol (if enabled)
  const filteredLiquidations = liquidations.filter(liq => {
    const meetsMinAmount = liq.value >= minLiquidationAmount;
    const meetsSymbolFilter = !filterBySymbol || liq.symbol === chartSymbol;
    return meetsMinAmount && meetsSymbolFilter;
  });

  // 🔥 DEBUG: Логируем фильтрацию
  useEffect(() => {
    if (filterBySymbol) {
      console.log(`🎯 Filter active for ${chartSymbol}:`);
      console.log(`  Total liquidations: ${liquidations.length}`);
      console.log(`  Filtered (${chartSymbol}): ${filteredLiquidations.length}`);
      console.log(`  Recent symbols:`, [...new Set(liquidations.slice(-10).map(l => l.symbol))]);
    }
  }, [filterBySymbol, chartSymbol, liquidations, filteredLiquidations.length]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-white font-sans overflow-hidden">

      
      {/* Stats Header */}
      <StatsHeader 
        stats={marketStats}
        isConnected={isConnected}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />
      
      {/* Main Layout with Sidebar - Mobile Responsive */}
      <div className="flex flex-col lg:flex-row h-screen pt-20">
        {/* Main Canvas Area */}
        <div className="flex-1 relative min-h-[60vh] lg:min-h-0">
          {/* 🔥 Symbol Search - левый верхний угол */}
          <div className="absolute top-4 left-4 z-10">
            <SymbolSearch 
              selectedSymbol={chartSymbol}
              onSymbolChange={setChartSymbol}
            />
          </div>
          
          <LiquidationCanvas 
            liquidations={filteredLiquidations}
            isPaused={isPaused}
            chartOpacity={chartOpacity}
            timeframe={timeframe}
            chartSymbol={chartSymbol}
          />
        </div>
        
        {/* Right Sidebar - Mobile Responsive */}
        <div className="w-full lg:w-80 bg-cyber-gray/95 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-cyber-border p-4 space-y-4 overflow-y-auto max-h-[40vh] lg:max-h-none">
          
          {/* 🔥 1. Market Sentiment (Liquidation Delta) - ВВЕРХУ */}
          <MarketSentiment stats={marketStats} />
          
          {/* 🔥 2. Liquidation Filter Panel - ПОСЕРЕДИНЕ */}
          <div className="bg-cyber-dark/50 rounded-lg border border-cyber-border p-4">
            <h3 className="text-lg font-semibold mb-3 text-accent-yellow">Liquidation Filter</h3>
            <div className="space-y-3">
              {/* 🔥 НОВОЕ: Чекбокс фильтра по монете */}
              <div className="flex items-center space-x-2 pb-2 border-b border-cyber-border">
                <input
                  type="checkbox"
                  id="filterBySymbol"
                  checked={filterBySymbol}
                  onChange={(e) => setFilterBySymbol(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-cyber-border border-gray-600 rounded focus:ring-accent-blue cursor-pointer"
                />
                <label htmlFor="filterBySymbol" className="text-sm text-gray-300 cursor-pointer">
                  Track only <span className="text-accent-yellow font-semibold">{chartSymbol}</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Minimum Amount: ${minLiquidationAmount >= 1000000 
                    ? (minLiquidationAmount / 1000000).toFixed(1) + 'M' 
                    : minLiquidationAmount >= 1000 
                    ? (minLiquidationAmount / 1000).toFixed(0) + 'K'
                    : minLiquidationAmount.toFixed(0)
                  }
                </label>
                <input
                  type="range"
                  min="1"
                  max="1000000"
                  step="1"
                  value={minLiquidationAmount}
                  onChange={(e) => setMinLiquidationAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-cyber-border rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$1</span>
                  <span>$1M</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                Showing: <span className="text-accent-blue font-semibold">{filteredLiquidations.length}</span> of {liquidations.length} liquidations
                {filterBySymbol && (
                  <div className="text-accent-yellow mt-1">
                    🎯 Tracking {chartSymbol} only
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => setMinLiquidationAmount(1)}
                  className={`px-2 py-1 rounded text-center transition-colors ${
                    minLiquidationAmount === 1 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-cyber-border text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  $1
                </button>
                <button 
                  onClick={() => setMinLiquidationAmount(100)}
                  className={`px-2 py-1 rounded text-center transition-colors ${
                    minLiquidationAmount === 100 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-cyber-border text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  $100
                </button>
                <button 
                  onClick={() => setMinLiquidationAmount(1000)}
                  className={`px-2 py-1 rounded text-center transition-colors ${
                    minLiquidationAmount === 1000 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-cyber-border text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  $1K
                </button>
                <button 
                  onClick={() => setMinLiquidationAmount(10000)}
                  className={`px-2 py-1 rounded text-center transition-colors ${
                    minLiquidationAmount === 10000 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-cyber-border text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  $10K
                </button>
                <button 
                  onClick={() => setMinLiquidationAmount(50000)}
                  className={`px-2 py-1 rounded text-center transition-colors ${
                    minLiquidationAmount === 50000 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-cyber-border text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  $50K
                </button>
                <button 
                  onClick={() => setMinLiquidationAmount(100000)}
                  className={`px-2 py-1 rounded text-center transition-colors ${
                    minLiquidationAmount === 100000 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-cyber-border text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  $100K
                </button>
              </div>
            </div>
          </div>
          
          {/* 🔥 3. Recent Liquidations (Последние 5) - ВНИЗУ */}
          <LiveStatsPanel recentLiquidations={lastFiveLiquidations} />
        </div>
      </div>
        
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-long-red/90 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-red-400 flex items-center space-x-2">
          <span className="text-sm">{connectionError}</span>
          <button 
            onClick={reconnect}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Floating Action Controls */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col space-y-3">
          <button 
            onClick={handleToggleSettings}
            className="bg-cyber-gray hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center">
          <div className="bg-cyber-gray border border-cyber-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-accent-blue">Settings</h3>
            
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Minimum Liquidation: ${minLiquidationAmount >= 1000000 
                    ? (minLiquidationAmount / 1000000).toFixed(1) + 'M' 
                    : minLiquidationAmount >= 1000 
                    ? (minLiquidationAmount / 1000).toFixed(0) + 'K'
                    : minLiquidationAmount.toFixed(0)
                  }
                </label>
                <input
                  type="range"
                  min="1"
                  max="1000000"
                  step="1"
                  value={minLiquidationAmount}
                  onChange={(e) => setMinLiquidationAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-cyber-border rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pauseAnimation"
                  checked={isPaused}
                  onChange={(e) => setIsPaused(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-cyber-border border-gray-600 rounded focus:ring-accent-blue"
                />
                <label htmlFor="pauseAnimation" className="text-sm text-gray-400">
                  Pause Animation
                </label>
              </div>

              {/* 🔥 НОВОЕ: Чекбокс в настройках тоже */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="filterBySymbolSettings"
                  checked={filterBySymbol}
                  onChange={(e) => setFilterBySymbol(e.target.checked)}
                  className="w-4 h-4 text-accent-blue bg-cyber-border border-gray-600 rounded focus:ring-accent-blue"
                />
                <label htmlFor="filterBySymbolSettings" className="text-sm text-gray-400">
                  Track only {chartSymbol}
                </label>
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Chart Opacity: {chartOpacity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={chartOpacity}
                  onChange={(e) => setChartOpacity(parseInt(e.target.value))}
                  className="w-full h-2 bg-cyber-border rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div className="pt-4 border-t border-cyber-border">
                <div className="text-sm text-gray-400">
                  <p><strong>Connection Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
                  <p><strong>Active Liquidations:</strong> {filteredLiquidations.length} / {liquidations.length}</p>
                  <p><strong>Total Volume:</strong> ${((marketStats.totalLongs + marketStats.totalShorts) / 1000000).toFixed(1)}M</p>
                  <p><strong>Filter:</strong> {filterBySymbol ? chartSymbol + ' - ' : ''}Above ${minLiquidationAmount >= 1000000 
                    ? (minLiquidationAmount / 1000000).toFixed(1) + 'M' 
                    : minLiquidationAmount >= 1000 
                    ? (minLiquidationAmount / 1000).toFixed(0) + 'K'
                    : minLiquidationAmount.toFixed(0)
                  }</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
