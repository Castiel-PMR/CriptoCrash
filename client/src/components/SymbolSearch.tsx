import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';

interface SymbolSearchProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

// Популярные фьючерсные пары с Binance (топ 20)
const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'ADAUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'MATICUSDT',
  'DOTUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'UNIUSDT',
  'ATOMUSDT',
  'LTCUSDT',
  'ETCUSDT',
  'TRXUSDT',
  'NEARUSDT',
  'APTUSDT',
  'ARBUSDT',
  'OPUSDT',
];

export function SymbolSearch({ selectedSymbol, onSymbolChange }: SymbolSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [allSymbols, setAllSymbols] = useState<string[]>(POPULAR_SYMBOLS);
  const [filteredSymbols, setFilteredSymbols] = useState<string[]>(POPULAR_SYMBOLS);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔥 Загрузка всех доступных фьючерсных символов с Binance
  useEffect(() => {
    const fetchAllSymbols = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const data = await response.json();
        
        // Фильтруем только USDT пары с активным статусом
        const usdtSymbols = data.symbols
          .filter((s: any) => 
            s.symbol.endsWith('USDT') && 
            s.status === 'TRADING' &&
            s.contractType === 'PERPETUAL' &&
            /^[A-Z0-9]+USDT$/.test(s.symbol) // Только латиница и цифры
          )
          .map((s: any) => s.symbol)
          .sort(); // Сортируем по алфавиту
        
        setAllSymbols(usdtSymbols);
        console.log(`Загружено ${usdtSymbols.length} фьючерсных символов`);
      } catch (error) {
        console.error('Ошибка загрузки символов:', error);
        // Fallback на популярные символы
        setAllSymbols(POPULAR_SYMBOLS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllSymbols();
  }, []);

  // Фильтрация символов при изменении поискового запроса
  useEffect(() => {
    if (searchTerm.trim() === '') {
      // Если поиск пустой, показываем популярные сверху + все остальные
      const otherSymbols = allSymbols.filter(s => !POPULAR_SYMBOLS.includes(s));
      setFilteredSymbols([...POPULAR_SYMBOLS, ...otherSymbols]);
    } else {
      const term = searchTerm.toUpperCase().replace('USDT', '');
      const filtered = allSymbols.filter(symbol => 
        symbol.includes(term)
      );
      setFilteredSymbols(filtered);
    }
  }, [searchTerm, allSymbols]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSymbolSelect = (symbol: string) => {
    onSymbolChange(symbol);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredSymbols(POPULAR_SYMBOLS);
  };

  // Форматирование для отображения (убираем USDT)
  const formatSymbol = (symbol: string) => {
    return symbol.replace('USDT', '');
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Кнопка выбора символа */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-cyber-gray/80 hover:bg-cyber-gray border border-cyber-border rounded-lg transition-all duration-200 group"
      >
        <Search className="w-4 h-4 text-gray-400 group-hover:text-accent-blue transition-colors" />
        <span className="font-mono font-bold text-accent-yellow">
          {formatSymbol(selectedSymbol)}
        </span>
        <span className="text-xs text-gray-500">Chart</span>
      </button>

      {/* Выпадающий список с поиском */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-cyber-gray border border-cyber-border rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Поле поиска */}
          <div className="p-3 border-b border-cyber-border">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symbol..."
                className="w-full px-3 py-2 pl-9 pr-8 bg-cyber-dark text-white rounded-lg border border-cyber-border focus:border-accent-blue focus:outline-none text-sm font-mono"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Список символов */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <div className="animate-spin w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Загрузка символов...</p>
              </div>
            ) : filteredSymbols.length > 0 ? (
              <div className="p-2 space-y-1">
                {/* Популярные символы (если нет поиска) */}
                {searchTerm.trim() === '' && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-bold text-gray-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      ПОПУЛЯРНЫЕ
                    </div>
                    {POPULAR_SYMBOLS.map((symbol) => (
                      <button
                        key={symbol}
                        onClick={() => handleSymbolSelect(symbol)}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg transition-all duration-200 font-mono text-sm
                          ${selectedSymbol === symbol 
                            ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50' 
                            : 'hover:bg-cyber-border text-gray-300 hover:text-white'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{formatSymbol(symbol)}</span>
                          <span className="text-xs text-gray-500">USDT</span>
                        </div>
                      </button>
                    ))}
                    
                    {/* Все остальные символы */}
                    {filteredSymbols.length > POPULAR_SYMBOLS.length && (
                      <>
                        <div className="px-3 py-1.5 mt-2 text-xs font-bold text-gray-400">
                          ВСЕ СИМВОЛЫ ({filteredSymbols.length - POPULAR_SYMBOLS.length})
                        </div>
                        {filteredSymbols
                          .filter(s => !POPULAR_SYMBOLS.includes(s))
                          .map((symbol) => (
                            <button
                              key={symbol}
                              onClick={() => handleSymbolSelect(symbol)}
                              className={`
                                w-full text-left px-3 py-2 rounded-lg transition-all duration-200 font-mono text-sm
                                ${selectedSymbol === symbol 
                                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50' 
                                  : 'hover:bg-cyber-border text-gray-300 hover:text-white'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{formatSymbol(symbol)}</span>
                                <span className="text-xs text-gray-500">USDT</span>
                              </div>
                            </button>
                          ))}
                      </>
                    )}
                  </>
                )}
                
                {/* Результаты поиска */}
                {searchTerm.trim() !== '' && filteredSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => handleSymbolSelect(symbol)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg transition-all duration-200 font-mono text-sm
                      ${selectedSymbol === symbol 
                        ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50' 
                        : 'hover:bg-cyber-border text-gray-300 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{formatSymbol(symbol)}</span>
                      <span className="text-xs text-gray-500">USDT</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Символ не найден</p>
                <p className="text-xs mt-1">Попробуйте другой запрос</p>
              </div>
            )}
          </div>

          {/* Подсказка */}
          <div className="p-2 border-t border-cyber-border bg-cyber-dark/50">
            <p className="text-xs text-gray-500 text-center">
              {isLoading ? 'Загрузка...' : `${allSymbols.length} символов доступно`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
