
import React, { useState, useEffect } from 'react';
import { calculateTolerance } from '../../services/toleranceEngine';
import { ToleranceResult } from '../../types';
import { getIntervalGeometricMean } from '../../services/toleranceConstants';

interface ToleranceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  interval: [number, number];
  toleranceClass: string; // Например "H7"
  onCalculate?: (result: ToleranceResult) => void;
}

export const ToleranceDetailModal: React.FC<ToleranceDetailModalProps> = ({
  isOpen,
  onClose,
  interval,
  toleranceClass,
  onCalculate
}) => {
  const [nominal, setNominal] = useState<number>(() => {
    // Устанавливаем среднее значение интервала как начальное
    const mean = getIntervalGeometricMean(interval[0], interval[1]);
    return Math.round(mean);
  });
  const [result, setResult] = useState<ToleranceResult | null>(null);

  // Парсинг класса допуска
  const parseToleranceClass = (cls: string) => {
    const match = cls.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) return null;
    return {
      letter: match[1],
      quality: parseInt(match[2], 10)
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const parsed = parseToleranceClass(toleranceClass);
    if (!parsed) return;

    const calc = calculateTolerance(nominal, parsed.letter, parsed.quality);
    if (calc) {
      setResult(calc);
      if (onCalculate) {
        onCalculate(calc);
      }
    }
  }, [nominal, toleranceClass, isOpen, onCalculate]);

  // Предотвращение скролла фона при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const parsed = parseToleranceClass(toleranceClass);
  if (!parsed) return null;

  const isHole = parsed.letter === parsed.letter.toUpperCase();
  const typeLabel = isHole ? 'Отверстие' : 'Вал';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95" onClick={onClose}>
      <div className="bg-zinc-900 border border-fanuc-yellow rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <button
            onClick={onClose}
            className="text-white hover:text-fanuc-yellow transition-colors"
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-white">Результаты расчета</h2>
          <div className="w-8"></div> {/* Spacer для центрирования */}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Tolerance Class Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-fanuc-yellow"></div>
              <span className="text-fanuc-yellow font-bold text-lg">{toleranceClass}</span>
            </div>
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-zinc-800 border border-zinc-600 text-fanuc-yellow rounded-lg text-sm font-medium">
                {typeLabel}
              </span>
              <span className="px-3 py-1 bg-zinc-800 border border-zinc-600 text-white rounded-lg text-sm">
                Интервал: {interval[0]} &gt; {interval[1]}
              </span>
            </div>
          </div>

          {/* Nominal Size Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Номинальный размер</label>
            <div className="relative">
              <input
                type="number"
                value={nominal}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0 && value <= 500) {
                    setNominal(value);
                  }
                }}
                className="w-full px-4 py-3 bg-zinc-800 border-2 border-fanuc-yellow text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-fanuc-yellow font-mono text-lg"
                min={interval[0]}
                max={interval[1]}
                step="0.1"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-fanuc-yellow font-mono">
                {toleranceClass} {result && (result.es > 0 ? '+' : '')}{result?.es ? (result.es / 1000).toFixed(3) : '0'}
              </div>
            </div>
          </div>

          {/* Results */}
          {result && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold">Результаты расчета</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Ном */}
                <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-gray-400 text-xs">Ном:</span>
                  </div>
                  <div className="text-fanuc-yellow font-mono font-bold text-lg">
                    {result.nominal.toFixed(3)} мм
                  </div>
                </div>

                {/* Мин */}
                <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-gray-400 text-xs">Мин:</span>
                  </div>
                  <div className="text-fanuc-yellow font-mono font-bold text-lg">
                    {result.min.toFixed(3)} мм
                  </div>
                </div>

                {/* Сред */}
                <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-gray-400 text-xs">Сред:</span>
                  </div>
                  <div className="text-fanuc-yellow font-mono font-bold text-lg">
                    {result.mean.toFixed(3)} мм
                  </div>
                </div>

                {/* Макс */}
                <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-gray-400 text-xs">Макс:</span>
                  </div>
                  <div className="text-fanuc-yellow font-mono font-bold text-lg">
                    {result.max.toFixed(3)} мм
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Button */}
        <div className="p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="w-full bg-fanuc-yellow hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>Готово</span>
          </button>
        </div>
      </div>
    </div>
  );
};
