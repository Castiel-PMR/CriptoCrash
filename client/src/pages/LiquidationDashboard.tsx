import React, { useState } from 'react';
import { LiquidationCanvas } from '../components/LiquidationCanvas';
import { StatsHeader } from '../components/StatsHeader';
import { LiveStatsPanel } from '../components/LiveStatsPanel';
import { MarketSentiment } from '../components/MarketSentiment';
import { useLiquidationData } from '../hooks/useLiquidationData';
import { Pause, Play, Settings, RefreshCw } from 'lucide-react';

export default function LiquidationDashboard() {
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [minLiquidationAmount, setMinLiquidationAmount] = useState(1000); // Default $1K minimum
  const [timeframe, setTimeframe] = useState('1m'); // Default 1-minute timeframe

  const [chartOpacity, setChartOpacity] = useState(100); // Opacity in percentage
  
  const { 
    liquidations, 
    marketStats, 
    isConnected, 
    connectionError,
    reconnect 
  } = useLiquidationData();

  // Filter liquidations based on minimum amount
  const filteredLiquidations = liquidations.filter(liq => liq.value >= minLiquidationAmount);

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
      
      {/* Main Layout with Sidebar */}
      <div className="flex h-screen pt-20">
        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          <LiquidationCanvas 
            liquidations={filteredLiquidations}
            isPaused={isPaused}
            chartOpacity={chartOpacity}
            timeframe={timeframe}
          />
        </div>
        
        {/* Right Sidebar */}
        <div className="w-80 bg-cyber-gray/95 backdrop-blur-md border-l border-cyber-border p-4 space-y-4 overflow-y-auto">
          {/* Liquidation Filter Panel */}
          <div className="bg-cyber-dark/50 rounded-lg border border-cyber-border p-4">
            <h3 className="text-lg font-semibold mb-3 text-accent-yellow">Liquidation Filter</h3>
            <div className="space-y-3">
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
                  min="1000"
                  max="10000000"
                  step="1000"
                  value={minLiquidationAmount}
                  onChange={(e) => setMinLiquidationAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-cyber-border rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$1K</span>
                  <span>$10M</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                Showing: {filteredLiquidations.length} of {liquidations.length} liquidations
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
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
                <button 
                  onClick={() => setMinLiquidationAmount(1000000)}
                  className={`px-2 py-1 rounded text-center transition-colors ${
                    minLiquidationAmount === 1000000 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-cyber-border text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  $1M
                </button>
              </div>
            </div>
          </div>
          
          {/* Recent Liquidations */}
          <LiveStatsPanel recentLiquidations={filteredLiquidations} />
          
          {/* Market Sentiment */}
          <MarketSentiment stats={marketStats} />
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
            onClick={handleTogglePause}
            className="bg-accent-blue hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
          
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
                  min="1000"
                  max="10000000"
                  step="1000"
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



              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Прозрачность графика: {chartOpacity}%
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
                  <p><strong>Filter:</strong> Above ${minLiquidationAmount >= 1000000 
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
