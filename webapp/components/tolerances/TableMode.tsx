
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { calculateTolerance } from '../../services/toleranceEngine';
import { getDiameterIntervals, getIntervalGeometricMean, POPULAR_TOLERANCE_CLASSES } from '../../services/toleranceConstants';
import { ToleranceDetailModal } from './ToleranceDetailModal';

interface CellData {
  es: number; // верхнее отклонение в мкм
  ei: number; // нижнее отклонение в мкм
}

const STORAGE_KEY = 'tolerance_selected_quality';
const DEFAULT_QUALITY = 'A4';

export const TableMode: React.FC = () => {
  const [selectedCell, setSelectedCell] = useState<{ interval: [number, number]; toleranceClass: string } | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>(DEFAULT_QUALITY);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const qualityHeaderRefs = useRef<Record<string, HTMLTableCellElement>>({});

  const intervals = useMemo(() => getDiameterIntervals(), []);
  
  // Загрузка сохраненного квалитета из localStorage при монтировании
  useEffect(() => {
    const savedQuality = localStorage.getItem(STORAGE_KEY);
    if (savedQuality && POPULAR_TOLERANCE_CLASSES.includes(savedQuality)) {
      setSelectedQuality(savedQuality);
    } else {
      setSelectedQuality(DEFAULT_QUALITY);
      localStorage.setItem(STORAGE_KEY, DEFAULT_QUALITY);
    }
  }, []);

  // Прокрутка к выбранной колонке после рендеринга
  useEffect(() => {
    if (selectedQuality && tableContainerRef.current) {
      const headerElement = qualityHeaderRefs.current[selectedQuality];
      if (headerElement) {
        // Используем requestAnimationFrame для более плавной прокрутки без задержки
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            headerElement.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
          });
        });
      }
    }
  }, [selectedQuality]);
  
  // Вычисляем данные для всех ячеек
  const cellData = useMemo(() => {
    const data: Record<string, Record<string, CellData>> = {};
    
    intervals.forEach(({ range }) => {
      const intervalKey = `${range[0]}-${range[1]}`;
      data[intervalKey] = {};
      
      POPULAR_TOLERANCE_CLASSES.forEach(toleranceClass => {
        // Парсим класс допуска
        const match = toleranceClass.match(/^([A-Za-z]+)(\d+)$/);
        if (!match) return;
        
        const letter = match[1];
        const quality = parseInt(match[2], 10);
        
        // Используем геометрическое среднее интервала для расчета
        const geometricMean = getIntervalGeometricMean(range[0], range[1]);
        const result = calculateTolerance(geometricMean, letter, quality);
        
        if (result) {
          data[intervalKey][toleranceClass] = {
            es: result.es,
            ei: result.ei
          };
        }
      });
    });
    
    return data;
  }, [intervals]);

  const handleCellClick = (interval: [number, number], toleranceClass: string) => {
    setSelectedCell({ interval, toleranceClass });
    // Сохраняем выбранный квалитет при клике на ячейку
    if (toleranceClass !== selectedQuality) {
      setSelectedQuality(toleranceClass);
      localStorage.setItem(STORAGE_KEY, toleranceClass);
    }
  };

  const handleHeaderClick = (quality: string) => {
    // Сохраняем выбранный квалитет при клике на заголовок
    setSelectedQuality(quality);
    localStorage.setItem(STORAGE_KEY, quality);
    
    // Прокрутка к колонке
    const headerElement = qualityHeaderRefs.current[quality];
    if (headerElement) {
      headerElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  const handleCloseModal = () => {
    setSelectedCell(null);
  };

  return (
    <>
      <div className="bg-zinc-900 border border-fanuc-yellow rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
        {/* Контейнер таблицы с фиксированной высотой для контролируемого скролла */}
        <div 
          ref={tableContainerRef}
          className="overflow-auto" 
          style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto', 
            overflowX: 'auto', 
            border: '1px solid #444',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
            {/* Sticky Header - всегда видим при скролле вниз */}
            <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1a1a1a', minHeight: '45px' }}>
                <tr>
                  {/* Угловая ячейка - sticky по обеим осям с z-index: 30 */}
                  <th 
                    className="sticky left-0 top-0 text-[10px] font-bold text-fanuc-yellow border border-zinc-600 z-[30] whitespace-nowrap text-left"
                    style={{ 
                      position: 'sticky', 
                      left: 0, 
                      top: 0, 
                      backgroundColor: '#1a1a1a', 
                      width: 'fit-content', 
                      minWidth: '80px',
                      padding: '8px 4px'
                    }}
                  >
                    Ø (mm)
                  </th>
                    {/* Колонки с классами допусков - sticky top, z-index: 20, шире и заметнее */}
                    {POPULAR_TOLERANCE_CLASSES.map(cls => (
                      <th 
                        key={cls}
                        ref={(el) => {
                          if (el) {
                            qualityHeaderRefs.current[cls] = el;
                          }
                        }}
                        onClick={() => handleHeaderClick(cls)}
                        className={`sticky top-0 font-bold text-fanuc-yellow text-center border border-zinc-600 z-[20] whitespace-nowrap cursor-pointer hover:bg-zinc-800 transition-colors ${
                          cls === selectedQuality ? 'ring-2 ring-fanuc-yellow' : ''
                        }`}
                        style={{ 
                          position: 'sticky', 
                          top: 0, 
                          backgroundColor: '#1a1a1a',
                          minWidth: '100px',
                          fontSize: '1.1rem',
                          padding: '8px 4px'
                        }}
                      >
                        {cls}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {intervals.map(({ label, range }, index) => {
                    const intervalKey = `${range[0]}-${range[1]}`;
                    // Зебра - чередование цветов строк
                    const isEven = index % 2 === 0;
                    const rowBg = isEven ? 'bg-zinc-900' : 'bg-zinc-800';
                    
                    return (
                      <tr key={intervalKey} className={`${rowBg} hover:bg-zinc-700 transition-colors`}>
                        {/* Sticky Column - первый столбец с диаметрами, z-index: 10 */}
                        <td 
                          className={`sticky left-0 ${rowBg} font-mono font-semibold text-white text-xs border border-zinc-600 z-[10] whitespace-nowrap text-left`}
                          style={{ 
                            position: 'sticky', 
                            left: 0, 
                            backgroundColor: '#1a1a1a', 
                            width: 'fit-content', 
                            minWidth: '80px',
                            padding: '8px 4px'
                          }}
                        >
                          {label}
                        </td>
                        {/* Ячейки с отклонениями - моноширинный шрифт, padding 8px 4px */}
                        {POPULAR_TOLERANCE_CLASSES.map(toleranceClass => {
                          const cell = cellData[intervalKey]?.[toleranceClass];
                          if (!cell) {
                            return (
                              <td 
                                key={toleranceClass}
                                className={`${rowBg} text-center text-gray-500 font-mono border border-zinc-600`}
                                style={{
                                  minWidth: '100px',
                                  padding: '8px 4px',
                                  fontFamily: 'monospace'
                                }}
                              >
                                -
                              </td>
                            );
                          }
                          
                          const esMm = (cell.es / 1000).toFixed(3);
                          const eiMm = (cell.ei / 1000).toFixed(3);
                          
                          return (
                            <td
                              key={toleranceClass}
                              onClick={() => handleCellClick(range, toleranceClass)}
                              className={`${rowBg} text-center font-mono text-white font-bold cursor-pointer hover:bg-zinc-700 active:bg-zinc-600 transition-colors border border-zinc-600 hover:border-fanuc-yellow touch-manipulation ${
                                toleranceClass === selectedQuality ? 'ring-1 ring-fanuc-yellow' : ''
                              }`}
                              title={`${toleranceClass} для ${label}`}
                              style={{
                                minWidth: '100px',
                                padding: '8px 4px',
                                fontFamily: 'monospace'
                              }}
                            >
                              {/* Компактное отображение: оба значения вертикально, моноширинный шрифт для выравнивания десятичных точек */}
                              <div className="flex flex-col items-center space-y-0 leading-tight">
                                <span className={`${cell.es >= 0 ? 'text-fanuc-yellow' : 'text-red-400'} font-bold text-sm font-mono`}>
                                  {cell.es >= 0 ? '+' : ''}{esMm}
                                </span>
                                <span className={`${cell.ei >= 0 ? 'text-fanuc-yellow' : 'text-red-400'} font-bold text-sm font-mono`}>
                                  {cell.ei >= 0 ? '+' : ''}{eiMm}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
            </table>
        </div>
        
        <div className="p-3 sm:p-4 bg-zinc-800 border-t border-zinc-700 text-xs sm:text-sm text-gray-400 italic">
          * Значения рассчитаны по формулам ISO 286 / ГОСТ 25346. В некоторых квалитетах возможны округления согласно стандарту.
        </div>
      </div>

      {/* Модальное окно */}
      {selectedCell && (
        <ToleranceDetailModal
          isOpen={!!selectedCell}
          onClose={handleCloseModal}
          interval={selectedCell.interval}
          toleranceClass={selectedCell.toleranceClass}
        />
      )}
    </>
  );
};
