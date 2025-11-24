import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Интерфейс свечи
 */
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Интерфейс ликвидации
 */
interface Liquidation {
  id: string;
  timestamp: number;
  symbol: string;
  exchange: string;
  side: 'long' | 'short';
  size: number;
  price: number;
  value: number;
}

/**
 * Пропсы компонента
 */
interface CryptoChartProps {
  symbol?: string;           // Символ монеты (по умолчанию BTCUSDT)
  timeframe?: string;        // Таймфрейм (1m, 5m, 15m, 30m, 1h, 4h, 1d)
  opacity?: number;          // Прозрачность графика (0-100)
  updateInterval?: number;   // Интервал обновления в мс (по умолчанию 1000)
  candleLimit?: number;      // Количество свечей (по умолчанию 60)
  showLiquidations?: boolean; // Показывать ликвидации (по умолчанию false)
  minLiquidationValue?: number; // Минимальная сумма ликвидации в $ (по умолчанию 1)
}

/**
 * Компонент графика криптовалют с данными из Binance API
 * Отображает японские свечи с умным форматированием цены и живым индикатором
 */
export function CryptoChart({
  symbol = 'BTCUSDT',
  timeframe = '15m',
  opacity = 100,
  updateInterval = 1000,
  candleLimit = 60,
  showLiquidations = false,
  minLiquidationValue = 1
}: CryptoChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Умное форматирование цены в зависимости от величины (как на Binance)
  const formatPrice = useCallback((price: number): string => {
    if (!price || !isFinite(price)) return "—";

    // Чем меньше цена — тем больше знаков после запятой
    let decimals: number;

    if (price >= 10000) decimals = 0;        // BTC, ETH (целые)
    else if (price >= 1000) decimals = 1;
    else if (price >= 100) decimals = 2;
    else if (price >= 10) decimals = 3;
    else if (price >= 1) decimals = 4;
    else if (price >= 0.1) decimals = 5;
    else if (price >= 0.01) decimals = 6;
    else if (price >= 0.001) decimals = 7;
    else if (price >= 0.0001) decimals = 8;
    else if (price >= 0.00001) decimals = 9;
    else if (price >= 0.000001) decimals = 10;
    else decimals = 12; // для SHIB, PEPE и других "супер мелких"

    return Number(price).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, []);

  // WebSocket для ликвидаций
  useEffect(() => {
    if (!showLiquidations) return;

    const connectToLiquidations = () => {
      const ws = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 Connected to Binance liquidations');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.o) {
            const order = data.o;
            const orderSymbol = order.s;
            const orderValue = parseFloat(order.q) * parseFloat(order.p);

            // Фильтрация: только нужная монета и минимальная сумма
            if (orderSymbol === symbol && orderValue >= minLiquidationValue) {
              const liquidation: Liquidation = {
                id: `${order.E}-${orderSymbol}-${Math.random()}`,
                timestamp: order.E,
                symbol: orderSymbol,
                exchange: 'binance',
                side: order.S === 'SELL' ? 'long' : 'short',
                size: parseFloat(order.q),
                price: parseFloat(order.p),
                value: orderValue,
              };

              setLiquidations(prev => {
                const updated = [...prev, liquidation];
                // Храним последние 20 ликвидаций
                return updated.slice(-20);
              });

              console.log(`💥 Liquidation: ${liquidation.side.toUpperCase()} $${liquidation.value.toFixed(2)} at $${liquidation.price}`);
            }
          }
        } catch (error) {
          console.error('Error parsing liquidation:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Disconnected from liquidations, reconnecting...');
        setTimeout(connectToLiquidations, 5000);
      };
    };

    connectToLiquidations();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [showLiquidations, symbol, minLiquidationValue]);

  // Fetch данных с Binance API
  useEffect(() => {
    const fetchCandleData = async () => {
      try {
        let data: any[] = [];

        // 1️⃣ Основной запрос — Futures API
        let response = await fetch(
          `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${timeframe}&limit=${candleLimit}`
        );
        data = await response.json();

        // 2️⃣ Если ошибка — fallback на Spot API
        if (!Array.isArray(data) || data.length === 0 || (data as any).code) {
          console.warn(`⚠️ Futures data empty/error for ${symbol}, trying Spot API...`);
          response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${candleLimit}`
          );
          data = await response.json();
        }

        // 3️⃣ Проверка на валидность данных
        if (!Array.isArray(data) || data.length === 0 || (data as any).code) {
          console.error(`❌ No data available for ${symbol}`);
          return;
        }

        // 4️⃣ Конвертация и фильтрация
        const validCandles = data
          .map((kline: any[]) => ({
            timestamp: kline[0],
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
          }))
          .filter(c => {
            const isEmpty = c.open === c.close && c.high === c.low && c.volume === 0;
            const isValid = !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close);
            return !isEmpty && isValid;
          });

        // 5️⃣ Минимальная проверка
        if (validCandles.length < 5) {
          console.warn(`⚠️ Too few valid candles for ${symbol}: ${validCandles.length}`);
          return;
        }

        setCandles(validCandles);
        setLastUpdateTime(Date.now());
        console.log(`✅ ${symbol}: ${validCandles.length} candles (${timeframe})`);
      } catch (error) {
        console.error(`❌ Error loading ${symbol}:`, error);
      }
    };

    fetchCandleData();
    const interval = setInterval(fetchCandleData, updateInterval);
    return () => clearInterval(interval);
  }, [symbol, timeframe, candleLimit, updateInterval]);

  // Отрисовка графика
  const drawChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (candles.length === 0) return;

    // Найти min/max цены
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;

    if (priceRange === 0) return;

    ctx.save();

    // Резерв для шкалы цен справа
    const scaleWidth = 80;
    const chartWidth = width - scaleWidth;

    // Настройка прозрачности
    ctx.globalAlpha = opacity / 100;

    const candleWidth = Math.max(6, chartWidth / candles.length * 0.7);
    const candleSpacing = chartWidth / candles.length;

    // Оптимизация: рисуем каждую вторую свечу если их больше 100
    const drawStep = candles.length > 100 ? 2 : 1;

    const margin = height * 0.1;
    const chartHeight = height - 2 * margin;

    // Рисуем свечи
    candles.forEach((candle, index) => {
      if (index % drawStep !== 0) return;
      const x = (index + 0.5) * candleSpacing;

      const openY = margin + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = margin + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const highY = margin + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = margin + ((maxPrice - candle.low) / priceRange) * chartHeight;

      const isGreen = candle.close >= candle.open;

      // Цвета (монохромный стиль)
      if (isGreen) {
        ctx.strokeStyle = '#888888';
        ctx.fillStyle = '#0a0a0a';
      } else {
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#333333';
      }

      // Тени (wicks)
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Тело свечи
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      if (bodyHeight < 3) {
        // Doji
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x - candleWidth / 2, openY);
        ctx.lineTo(x + candleWidth / 2, openY);
        ctx.stroke();
      } else {
        if (isGreen) {
          ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        } else {
          ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        }
      }
    });

    // Шкала цен справа
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#333333';
    ctx.fillRect(chartWidth, 0, scaleWidth, height);

    // Вертикальная линия-разделитель
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();

    // Метки цен (8 уровней)
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#888888';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    const priceStep = priceRange / 7;
    for (let i = 0; i <= 7; i++) {
      const price = minPrice + i * priceStep;
      const y = margin + chartHeight - (i * chartHeight) / 7;

      ctx.fillText(formatPrice(price), chartWidth + scaleWidth - 5, y + 4);

      // Маленькие тики
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(chartWidth + 2, y);
      ctx.lineTo(chartWidth + 8, y);
      ctx.stroke();
      ctx.globalAlpha = 0.7;
    }

    // Индикатор текущей цены
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      const currentPrice = lastCandle.close;
      const currentPriceY = margin + ((maxPrice - currentPrice) / priceRange) * chartHeight;

      // Линия текущей цены
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(chartWidth, currentPriceY);
      ctx.lineTo(chartWidth + scaleWidth, currentPriceY);
      ctx.stroke();

      // Метка с ценой
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatPrice(currentPrice), chartWidth + scaleWidth / 2, currentPriceY + 3);

      // Пульсирующая точка "live"
      const timeSinceUpdate = Date.now() - lastUpdateTime;
      const isRecent = timeSinceUpdate < 20000;
      if (isRecent) {
        const alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(chartWidth - 8, currentPriceY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Отрисовка ликвидаций на графике
    if (showLiquidations && liquidations.length > 0) {
      const now = Date.now();
      
      liquidations.forEach(liq => {
        const age = now - liq.timestamp;
        const maxAge = 30000; // 30 секунд
        
        if (age < maxAge) {
          const priceY = margin + ((maxPrice - liq.price) / priceRange) * chartHeight;
          const fadeAlpha = Math.max(0, 1 - age / maxAge);
          
          // Метка ликвидации
          ctx.globalAlpha = fadeAlpha * 0.8;
          ctx.fillStyle = liq.side === 'long' ? '#ef4444' : '#10b981';
          
          // Линия через весь график
          ctx.strokeStyle = liq.side === 'long' ? '#ef4444' : '#10b981';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, priceY);
          ctx.lineTo(chartWidth, priceY);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Значок на шкале
          ctx.globalAlpha = fadeAlpha;
          const iconSize = 12;
          ctx.beginPath();
          ctx.arc(chartWidth + scaleWidth - 20, priceY, iconSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Текст
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            liq.side === 'long' ? 'L' : 'S',
            chartWidth + scaleWidth - 20,
            priceY + 3
          );
          
          // Сумма ликвидации рядом
          ctx.globalAlpha = fadeAlpha * 0.7;
          ctx.fillStyle = '#ffffff';
          ctx.font = '7px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          const valueText = liq.value >= 1000 
            ? `$${(liq.value / 1000).toFixed(1)}K`
            : `$${liq.value.toFixed(0)}`;
          ctx.fillText(valueText, chartWidth + scaleWidth - 12, priceY - 10);
        }
      });
    }

    ctx.restore();
  }, [candles, opacity, formatPrice, lastUpdateTime, showLiquidations, liquidations]);

  // Обновление размера canvas
  const updateCanvasSize = useCallback(() => {
    if (!canvasRef.current) return;

    const parent = canvasRef.current.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    setCanvasSize({ width, height });

    canvasRef.current.width = width;
    canvasRef.current.height = height;
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Анимационный цикл
  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawChart(ctx, canvas.width, canvas.height);

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [drawChart]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ outline: 'none' }}
      />
    </div>
  );
}

export default CryptoChart;

// ---- Standalone wrapper with controls (symbol and timeframe) ----
// Use this component if you want everything in a single file without wiring props.
export function CryptoChartStandalone() {
  // Popular symbols for quick selection
  const popularSymbols = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'TRXUSDT', 'TONUSDT', 'LINKUSDT'
  ];

  const timeframes = ['1m','5m','15m','30m','1h','4h','1d'];

  const [symbol, setSymbol] = React.useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = React.useState<string>('15m');
  const [opacity, setOpacity] = React.useState<number>(100);
  const [candleLimit, setCandleLimit] = React.useState<number>(60);
  const [updateInterval, setUpdateInterval] = React.useState<number>(10000);
  const [showLiquidations, setShowLiquidations] = React.useState<boolean>(false);
  const [minLiquidationValue, setMinLiquidationValue] = React.useState<number>(1000);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#0b0b0b',
          color: '#eaeaea',
        }}
      >
        {/* Symbol selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Symbol</label>
          <input
            list="symbols"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="BTCUSDT"
            style={{
              background: '#141414',
              border: '1px solid #222',
              color: '#eaeaea',
              padding: '6px 8px',
              borderRadius: 6,
              width: 160,
              outline: 'none',
            }}
          />
          <datalist id="symbols">
            {popularSymbols.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* Timeframe selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>TF</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{
              background: '#141414',
              border: '1px solid #222',
              color: '#eaeaea',
              padding: '6px 8px',
              borderRadius: 6,
            }}
          >
            {timeframes.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>

        {/* Opacity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Opacity</label>
          <input
            type="range"
            min={10}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
          <span style={{ fontSize: 12, opacity: 0.7 }}>{opacity}%</span>
        </div>

        {/* Candle count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Candles</label>
          <select
            value={candleLimit}
            onChange={(e) => setCandleLimit(Number(e.target.value))}
            style={{
              background: '#141414',
              border: '1px solid #222',
              color: '#eaeaea',
              padding: '6px 8px',
              borderRadius: 6,
            }}
          >
            {[30, 60, 90, 120, 180, 240].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Update interval */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Update</label>
          <select
            value={updateInterval}
            onChange={(e) => setUpdateInterval(Number(e.target.value))}
            style={{
              background: '#141414',
              border: '1px solid #222',
              color: '#eaeaea',
              padding: '6px 8px',
              borderRadius: 6,
            }}
          >
            {[
              { label: '5s', value: 5000 },
              { label: '10s', value: 10000 },
              { label: '15s', value: 15000 },
              { label: '30s', value: 30000 },
            ].map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Liquidations toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Liquidations</label>
          <input
            type="checkbox"
            checked={showLiquidations}
            onChange={(e) => setShowLiquidations(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
        </div>

        {/* Min liquidation value */}
        {showLiquidations && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Min $</label>
            <select
              value={minLiquidationValue}
              onChange={(e) => setMinLiquidationValue(Number(e.target.value))}
              style={{
                background: '#141414',
                border: '1px solid #222',
                color: '#eaeaea',
                padding: '6px 8px',
                borderRadius: 6,
              }}
            >
              {[
                { label: '$1', value: 1 },
                { label: '$10', value: 10 },
                { label: '$100', value: 100 },
                { label: '$500', value: 500 },
                { label: '$1K', value: 1000 },
                { label: '$5K', value: 5000 },
                { label: '$10K', value: 10000 },
                { label: '$50K', value: 50000 },
                { label: '$100K', value: 100000 },
              ].map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <CryptoChart
          symbol={symbol}
          timeframe={timeframe}
          opacity={opacity}
          candleLimit={candleLimit}
          updateInterval={updateInterval}
          showLiquidations={showLiquidations}
          minLiquidationValue={minLiquidationValue}
        />
      </div>
    </div>
  );
}
