# 🚀 План полной оптимизации памяти CryptoCrash

## ✅ Выполнено (Сервер)

### 1. Оптимизация расчета Liq Delta
**Проблема:** `calculatePriceMovementDelta()` вызывался на КАЖДОЙ ликвидации BTCUSDT (тысячи раз в час)
```typescript
// ❌ Было: вызов на каждой ликвидации
if (liquidation.symbol === 'BTCUSDT') {
  this.calculatePriceMovementDelta(); // УТЕЧКА!
}

// ✅ Стало: отдельный таймер раз в час
startDeltaCalculation() {
  setTimeout(() => {
    this.calculatePriceMovementDelta();
    setInterval(() => this.calculatePriceMovementDelta(), 60 * 60 * 1000);
  }, 5 * 60 * 1000);
}
```

### 2. Ограничение массива ликвидаций
**Проблема:** `recentLiquidations` рос до 100 элементов
```typescript
// ❌ Было: до 100 ликвидаций
if (this.recentLiquidations.length > 100) {
  this.recentLiquidations.shift();
}

// ✅ Стало: максимум 30
if (this.recentLiquidations.length > 30) {
  this.recentLiquidations.shift();
}
```

### 3. Уменьшение логирования
```typescript
// ❌ Было: каждая 10я ликвидация
if (this.marketStats.activeLiquidations % 10 === 0) { ... }

// ✅ Стало: каждая 100я
if (this.marketStats.activeLiquidations % 100 === 0) { ... }
```

---

## 🔥 Критические проблемы клиента (требуют исправления)

### Проблема #1: WebSocket не закрывается при unmount
**Файл:** `client/src/hooks/useLiquidationData.tsx`

```typescript
// ❌ ТЕКУЩАЯ ПРОБЛЕМА:
useEffect(() => {
  const ws = new WebSocket('ws://localhost:5000/api/liquidations');
  // ... обработчики ...
  
  // ⚠️ return undefined - WebSocket остается открытым!
}, []);

// ✅ ПРАВИЛЬНО:
useEffect(() => {
  const ws = new WebSocket('ws://localhost:5000/api/liquidations');
  
  ws.onmessage = (event) => { /* ... */ };
  ws.onerror = (error) => { /* ... */ };
  ws.onclose = () => { /* ... */ };
  
  return () => {
    console.log('🔌 Closing WebSocket...');
    ws.close();
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
  };
}, []);
```

---

### Проблема #2: requestAnimationFrame не отменяется
**Файл:** `client/src/components/LiquidationCanvas.tsx`

```typescript
// ❌ ТЕКУЩАЯ ПРОБЛЕМА:
const animate = useCallback((currentTime: number) => {
  // ... логика анимации ...
  requestAnimationFrame(animate); // УТЕЧКА!
}, [/* зависимости */]);

useEffect(() => {
  const animationId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationId); // ⚠️ отменяется только первый кадр!
}, [animate]);

// ✅ ПРАВИЛЬНО:
const animate = useCallback((currentTime: number) => {
  // ... логика анимации ...
  animationIdRef.current = requestAnimationFrame(animate);
}, [/* зависимости */]);

useEffect(() => {
  const animationIdRef = { current: 0 };
  animationIdRef.current = requestAnimationFrame(animate);
  
  return () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
  };
}, [animate]);
```

---

### Проблема #3: Свечи не ограничены (массив растет бесконечно)
**Файл:** `client/src/components/LiquidationCanvas.tsx`

```typescript
// ❌ ТЕКУЩАЯ ПРОБЛЕМА:
useEffect(() => {
  const fetchBitcoinData = async () => {
    // ...
    setBitcoinCandles(candles); // Заменяет весь массив
  };
  
  const interval = setInterval(fetchBitcoinData, 10 * 1000);
  return () => clearInterval(interval);
}, [timeframe, chartSymbol]);

// ✅ ПРАВИЛЬНО: Ограничиваем максимум 300 свечей
useEffect(() => {
  const fetchBitcoinData = async () => {
    // ...
    setBitcoinCandles(prev => {
      const combined = [...prev, ...newCandles];
      return combined.slice(-300); // Только последние 300
    });
  };
  
  const interval = setInterval(fetchBitcoinData, 10 * 1000);
  return () => clearInterval(interval);
}, [timeframe, chartSymbol]);
```

---

### Проблема #4: Detached DOM nodes (particles, liquidations)
**Файл:** `client/src/components/LiquidationCanvas.tsx`

```typescript
// ❌ ПРОБЛЕМА: Массивы частиц растут, но DOM-ссылки остаются
state.particles.push(createParticle(...));
state.liquidations.push(createLiquidationBlock(...));

// ✅ РЕШЕНИЕ: Агрессивная очистка по времени
useEffect(() => {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const state = animationStateRef.current;
    
    // Очистка старых частиц (старше 10 сек)
    state.particles = state.particles.filter(p => (now - p.createdAt) < 10000);
    
    // Очистка старых ликвидаций (старше 30 сек)
    state.liquidations = state.liquidations.filter(l => (now - l.createdAt) < 30000);
    
    // Принудительная очистка Set
    if (processedLiquidations.current.size > 200) {
      const entries = Array.from(processedLiquidations.current);
      processedLiquidations.current.clear();
      entries.slice(-100).forEach(e => processedLiquidations.current.add(e));
    }
    
    console.log('🧹 Cleanup:', {
      particles: state.particles.length,
      liquidations: state.liquidations.length,
      processed: processedLiquidations.current.size
    });
  }, 5000); // Каждые 5 секунд
  
  return () => clearInterval(cleanupInterval);
}, []);
```

---

### Проблема #5: Анонимные функции в useCallback
**Файл:** `client/src/components/LiquidationCanvas.tsx`

```typescript
// ❌ ПРОБЛЕМА: Пересоздается при каждом рендере
const formatPrice = useCallback((price: number): string => {
  // ... логика ...
}, []); // ⚠️ Зависимости пустые, но функция пересоздается

// ✅ РЕШЕНИЕ: useMemo для стабильных функций
const formatPrice = useMemo(() => {
  return (price: number): string => {
    if (!price || !isFinite(price)) return "—";
    // ... логика форматирования ...
    return price.toLocaleString(/* ... */);
  };
}, []); // Создается один раз
```

---

### Проблема #6: Canvas не очищается полностью
**Файл:** `client/src/components/LiquidationCanvas.tsx`

```typescript
// ❌ ПРОБЛЕМА: ctx.clearRect не освобождает память
const animate = useCallback((currentTime: number) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ... отрисовка ...
}, []);

// ✅ РЕШЕНИЕ: Пересоздавать canvas периодически
useEffect(() => {
  const canvasRecreateInterval = setInterval(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Сброс canvas (очистка GPU памяти)
    const parent = canvas.parentElement;
    if (parent) {
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height;
      newCanvas.className = canvas.className;
      parent.replaceChild(newCanvas, canvas);
      canvasRef.current = newCanvas;
    }
  }, 5 * 60 * 1000); // Каждые 5 минут
  
  return () => clearInterval(canvasRecreateInterval);
}, []);
```

---

### Проблема #7: Логирование в console удерживает ссылки
**Все файлы**

```typescript
// ❌ ПРОБЛЕМА: DevTools удерживает все объекты в логах
console.log('Liquidation:', liquidation); // Объект остается в памяти!
console.log(`Обновлены данные:`, candles); // Массив остается!

// ✅ РЕШЕНИЕ: Логировать только примитивы в production
const isDev = import.meta.env.DEV;

if (isDev) {
  console.log('Liquidation:', liquidation);
}

// Или упрощать логи:
console.log(`Liquidation: ${liquidation.symbol} $${liquidation.value.toFixed(0)}`);
```

---

## 📊 Проверка результата

### 1. Мониторинг памяти в коде
```typescript
// Добавить в любой компонент:
useEffect(() => {
  const memoryInterval = setInterval(() => {
    if (performance.memory) {
      const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
      const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
      console.log(`📊 Memory: ${used} MB / ${total} MB`);
    }
  }, 10000); // Каждые 10 секунд
  
  return () => clearInterval(memoryInterval);
}, []);
```

### 2. Chrome DevTools: Heap Snapshot
1. Откройте DevTools → Memory
2. Take snapshot (начальный)
3. Работайте 5-10 минут
4. Take snapshot (после работы)
5. Сравните: не должно быть роста в Detached nodes

### 3. Performance Monitor
```
Chrome DevTools → More tools → Performance monitor
Следите за:
- JS heap size (не должен расти > 500 MB)
- DOM Nodes (не должен расти > 5000)
- JS event listeners (не должен расти)
```

---

## 🎯 Целевые метрики

| Метрика | До оптимизации | После оптимизации |
|---------|----------------|-------------------|
| **JS Heap** | 2.2 GB | < 500 MB |
| **DOM Nodes** | 10,000+ | < 3,000 |
| **Detached Nodes** | 500+ | 0-10 |
| **Event Listeners** | 200+ | < 50 |
| **WebSocket connections** | Не закрываются | Закрываются |
| **RequestAnimationFrame** | Накапливаются | Отменяются |

---

## 🔧 Следующие шаги

1. ✅ **Сервер оптимизирован** (Liq Delta, массивы, логи)
2. ⏳ **Клиент требует исправления:**
   - WebSocket cleanup
   - requestAnimationFrame cleanup
   - Ограничение свечей (300 max)
   - Агрессивная очистка particles/liquidations
   - Уменьшение логирования
   - useMemo для стабильных функций
   - Периодическая пересборка canvas

3. 🧪 **Тестирование:**
   - Запустить на 30+ минут
   - Проверить Heap Snapshot
   - Проверить Performance Monitor
   - Убедиться: нет Detached nodes

---

## 📚 Дополнительные ресурсы

- [React Memory Leaks Guide](https://dev.to/arnonate/common-react-memory-leaks-3c7j)
- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
- [WebSocket Best Practices](https://javascript.info/websocket)
- [Canvas Memory Management](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
