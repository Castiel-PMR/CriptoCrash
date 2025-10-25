/**
 * 📊 Performance Monitor HUD
 * Отображает FPS, Memory, WebSocket статус в реальном времени
 */

import React, { useState, useEffect, useRef } from 'react';

interface PerformanceStats {
  fps: number;
  memoryUsed: number; // MB
  memoryTotal: number; // MB
  particles: number;
  liquidations: number;
  wsConnected: boolean;
}

interface PerformanceHUDProps {
  particles?: number;
  liquidations?: number;
  wsConnected?: boolean;
}

export function PerformanceHUD({ 
  particles = 0, 
  liquidations = 0, 
  wsConnected = false 
}: PerformanceHUDProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    memoryUsed: 0,
    memoryTotal: 0,
    particles,
    liquidations,
    wsConnected,
  });
  
  const [isVisible, setIsVisible] = useState(true);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Обновление FPS и памяти каждую секунду
  useEffect(() => {
    const updateStats = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        // Получаем данные о памяти (только в Chrome)
        const memory = (performance as any).memory;
        const memoryUsed = memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0;
        const memoryTotal = memory ? Math.round(memory.totalJSHeapSize / 1048576) : 0;

        setStats({
          fps,
          memoryUsed,
          memoryTotal,
          particles,
          liquidations,
          wsConnected,
        });
      }

      frameCountRef.current++;
      requestAnimationFrame(updateStats);
    };

    const rafId = requestAnimationFrame(updateStats);
    return () => cancelAnimationFrame(rafId);
  }, [particles, liquidations, wsConnected]);

  // Горячая клавиша для скрытия/показа (F3)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-black/50 text-white px-3 py-1 rounded text-xs hover:bg-black/70"
        >
          Show Stats (F3)
        </button>
      </div>
    );
  }

  // Цвет FPS: зеленый > 50, желтый > 30, красный < 30
  const fpsColor = stats.fps >= 50 ? '#10b981' : stats.fps >= 30 ? '#f59e0b' : '#ef4444';
  
  // Цвет памяти: зеленый < 400MB, желтый < 800MB, красный >= 800MB
  const memoryColor = stats.memoryUsed < 400 ? '#10b981' : stats.memoryUsed < 800 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl font-mono text-xs min-w-[200px]">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">⚡ Performance</span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1">
        {/* FPS */}
        <div className="flex justify-between">
          <span className="text-gray-400">FPS:</span>
          <span style={{ color: fpsColor }} className="font-bold">
            {stats.fps}
          </span>
        </div>

        {/* Memory */}
        <div className="flex justify-between">
          <span className="text-gray-400">Memory:</span>
          <span style={{ color: memoryColor }} className="font-bold">
            {stats.memoryUsed} MB
          </span>
        </div>

        {/* Memory Total */}
        <div className="flex justify-between">
          <span className="text-gray-400">Total:</span>
          <span className="text-gray-300">
            {stats.memoryTotal} MB
          </span>
        </div>

        <div className="border-t border-gray-700 my-2"></div>

        {/* Particles */}
        <div className="flex justify-between">
          <span className="text-gray-400">Particles:</span>
          <span className="text-white">
            {stats.particles}
          </span>
        </div>

        {/* Liquidations */}
        <div className="flex justify-between">
          <span className="text-gray-400">Bags:</span>
          <span className="text-white">
            {stats.liquidations}
          </span>
        </div>

        <div className="border-t border-gray-700 my-2"></div>

        {/* WebSocket Status */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">WebSocket:</span>
          <span className={stats.wsConnected ? 'text-green-400' : 'text-red-400'}>
            {stats.wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      {/* Hint */}
      <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
        Press F3 to toggle
      </div>
    </div>
  );
}
