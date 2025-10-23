import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SymbolSearchProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

// Популярные фьючерсные пары с Binance
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
  const [filteredSymbols, setFilteredSymbols] = useState<string[]>(POPULAR_SYMBOLS);
  const containerRef = useRef<HTMLDivElement>(null);

  // Фильтрация символов при изменении поискового запроса
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSymbols(POPULAR_SYMBOLS);
    } else {
      const term = searchTerm.toUpperCase().replace('USDT', '');
      const filtered = POPULAR_SYMBOLS.filter(symbol => 
        symbol.includes(term)
      );
      setFilteredSymbols(filtered);
    }
  }, [searchTerm]);

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
            {filteredSymbols.length > 0 ? (
              <div className="p-2 space-y-1">
                {filteredSymbols.map((symbol) => (
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
              {filteredSymbols.length} символов доступно
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
