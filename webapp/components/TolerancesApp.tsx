
import React, { useState, startTransition } from 'react';
import { ChatMode } from './tolerances/ChatMode';
import { TableMode } from './tolerances/TableMode';
import { IndustrialButton } from './IndustrialComponents';

enum ToleranceMode {
  CHAT = 'CHAT',
  TABLE = 'TABLE'
}

interface TolerancesAppProps {
  onBack: () => void;
}

const TolerancesApp: React.FC<TolerancesAppProps> = ({ onBack }) => {
  const [mode, setMode] = useState<ToleranceMode>(ToleranceMode.CHAT);

  return (
    <div className="flex flex-col h-full bg-zinc-900 p-4 border-2 border-zinc-700 rounded shadow-inner relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-4 border-b border-zinc-700 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-fanuc-yellow px-3 sm:px-4 py-2 rounded-lg border border-zinc-600 transition-colors font-bold text-sm sm:text-base touch-manipulation min-h-[44px]"
          >
            ← НАЗАД
          </button>
          <h2 className="text-base sm:text-xl font-bold text-fanuc-yellow">ДОПУСКИ И ПОСАДКИ ЕСКД</h2>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-400 font-mono">
          ГОСТ 25346 / ISO 286
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center mb-4">
        <div className="bg-zinc-800 p-1 rounded-xl flex space-x-1 shadow-inner border border-zinc-600 w-full sm:w-auto">
          <button
            onClick={() => setMode(ToleranceMode.CHAT)}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all min-h-[44px] touch-manipulation ${
              mode === ToleranceMode.CHAT 
                ? 'bg-fanuc-yellow text-black shadow-md' 
                : 'text-gray-400 hover:text-white active:text-white bg-transparent'
            }`}
          >
            ЧАТ-РАСЧЕТ
          </button>
          <button
            onClick={() => {
              // Используем startTransition для плавного переключения без блокировки UI
              startTransition(() => {
                setMode(ToleranceMode.TABLE);
              });
            }}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all min-h-[44px] touch-manipulation ${
              mode === ToleranceMode.TABLE 
                ? 'bg-fanuc-yellow text-black shadow-md' 
                : 'text-gray-400 hover:text-white active:text-white bg-transparent'
            }`}
          >
            ТАБЛИЦА
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {mode === ToleranceMode.CHAT ? <ChatMode /> : <TableMode />}
      </div>
    </div>
  );
};

export default TolerancesApp;
