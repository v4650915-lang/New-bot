
import React, { useState, useEffect, useRef } from 'react';
import { parseToleranceString, calculateTolerance } from '../../services/toleranceEngine';
import { ToleranceResult } from '../../types';
import { ToleranceVisualizer } from './ToleranceVisualizer';
import { POPULAR_TOLERANCE_CLASSES } from '../../services/toleranceConstants';

const STORAGE_KEY = 'tolerance_selected_quality';

export const ChatMode: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ query: string; result: ToleranceResult | string | null }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentInput = input.trim();
    setInput('');

    // Check if it's a specific code like 30H7
    const parsed = parseToleranceString(currentInput);
    
    if (parsed) {
      const calc = calculateTolerance(parsed.nominal, parsed.letter, parsed.quality);
      setHistory(prev => [...prev, { query: currentInput, result: calc }]);
      
      // Сохраняем выбранный квалитет в localStorage
      const qualityClass = `${parsed.letter}${parsed.quality}`;
      if (POPULAR_TOLERANCE_CLASSES.includes(qualityClass)) {
        localStorage.setItem(STORAGE_KEY, qualityClass);
      }
    } else {
      // Show error message for invalid input format
      const errorMessage = 'Неверный формат. Введите обозначение допуска в формате: число + буква + квалитет (например, 30H7 или 45k6). Диапазон диаметров: 1-500 мм.';
      setHistory(prev => [...prev, { query: currentInput, result: errorMessage }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-fanuc-yellow rounded-xl overflow-hidden shadow-lg">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center text-gray-400 mt-10 sm:mt-20">
            <div className="text-3xl sm:text-4xl mb-4 text-fanuc-yellow">⚙</div>
            <p className="text-sm sm:text-base">Введите обозначение (например, <span className="font-mono text-fanuc-yellow">30H7</span> или <span className="font-mono text-fanuc-yellow">45k6</span>)</p>
            <p className="text-xs sm:text-sm mt-1">Формат: число + буква + квалитет. Диапазон: 1-500 мм</p>
          </div>
        )}
        {history.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-zinc-800 border border-fanuc-yellow text-fanuc-yellow px-3 sm:px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm text-sm sm:text-base">
                {item.query}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-zinc-800 border border-zinc-600 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tl-none w-full max-w-[90%] shadow-sm">
                {typeof item.result === 'string' ? (
                  <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap text-sm sm:text-base">
                    <div className="text-fanuc-yellow">
                      {item.result}
                    </div>
                  </div>
                ) : item.result === null ? (
                  <div className="text-red-500 text-xs sm:text-sm">
                    Ошибка: Обозначение не найдено в справочнике или вне диапазона (1-500 мм).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 border-b border-zinc-600 pb-1">
                        <span className="text-base sm:text-lg font-bold text-fanuc-yellow">{item.result.nominal}{item.result.letter}{item.result.quality}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.result.type === 'HOLE' ? 'bg-zinc-700 text-fanuc-yellow' : 'bg-zinc-700 text-fanuc-yellow'}`}>
                          {item.result.type === 'HOLE' ? 'Отверстие' : 'Вал'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-1 text-xs sm:text-sm">
                        <span className="text-gray-400">Допуск:</span>
                        <span className="font-mono font-bold text-right text-white">{(item.result.it / 1000).toFixed(3)} мм</span>
                        
                        <span className="text-gray-400">Верхнее (ES/es):</span>
                        <span className="font-mono font-bold text-right text-white">{item.result.es >= 0 ? '+' : ''}{(item.result.es / 1000).toFixed(3)} мм</span>
                        
                        <span className="text-gray-400">Нижнее (EI/ei):</span>
                        <span className="font-mono font-bold text-right text-white">{item.result.ei >= 0 ? '+' : ''}{(item.result.ei / 1000).toFixed(3)} мм</span>
                        
                        <div className="col-span-2 border-t border-zinc-600 my-1"></div>
                        
                        <span className="text-gray-400">Max размер:</span>
                        <span className="font-mono font-bold text-right text-fanuc-yellow">{item.result.max.toFixed(3)} мм</span>
                        
                        <span className="text-gray-400">Min размер:</span>
                        <span className="font-mono font-bold text-right text-fanuc-yellow">{item.result.min.toFixed(3)} мм</span>
                        
                        <span className="text-gray-400">Средний:</span>
                        <span className="font-mono font-bold text-right text-white">{item.result.mean.toFixed(4)} мм</span>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <ToleranceVisualizer result={item.result} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="p-2 sm:p-4 bg-zinc-900 border-t border-zinc-700 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Например: 30k6, 50H7..."
          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-fanuc-yellow transition-all font-mono text-sm sm:text-base placeholder-gray-500 min-h-[44px]"
        />
        <button 
          type="submit"
          className="bg-fanuc-yellow text-black px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-yellow-500 active:bg-yellow-600 transition-colors shadow-sm disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold touch-manipulation"
          disabled={!input.trim()}
        >
          →
        </button>
      </form>
    </div>
  );
};
