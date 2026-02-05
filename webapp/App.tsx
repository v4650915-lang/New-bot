import React, { useState } from 'react';
import Calculator from './components/Calculator';
import EngineeringPanel from './components/EngineeringPanel';
import GCodeFrame from './components/GCodeFrame';
import { ScrewHead, ToggleSwitch, InfoPlate, LED } from './components/IndustrialComponents';
import { AppMode } from './types';

export default function App() {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CALCULATOR);

  // Handler for engineering module toggle
  const toggleEngineering = () => {
    setActiveMode(prev => prev === AppMode.ENGINEERING ? AppMode.CALCULATOR : AppMode.ENGINEERING);
  };

  // Handler for G-Code module toggle
  const toggleGCode = () => {
    setActiveMode(prev => prev === AppMode.G_CODE ? AppMode.CALCULATOR : AppMode.G_CODE);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-8 font-sans selection:bg-fanuc-yellow selection:text-black">

      {/* Main CNC Chassis */}
      <div className="bg-fanuc-yellow w-full max-w-5xl rounded-lg p-2 shadow-machine border-t border-white/20 relative">

        {/* Chassis Screws */}
        <ScrewHead className="absolute top-2 left-2" />
        <ScrewHead className="absolute top-2 right-2" />
        <ScrewHead className="absolute bottom-2 left-2" />
        <ScrewHead className="absolute bottom-2 right-2" />

        {/* Inner Panel (Grey Metal) */}
        <div className="bg-zinc-800 rounded p-3 sm:p-4 md:p-6 lg:p-8 border-2 sm:border-4 border-zinc-700 h-full flex flex-col shadow-inner">

          {/* Header / Branding */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 sm:mb-6 md:mb-8 border-b-2 border-zinc-600 pb-2 sm:pb-3 md:pb-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-red-600 flex items-center justify-center rounded-full border-2 sm:border-4 border-zinc-400 shadow-md">
                <span className="text-white font-black italic text-sm sm:text-base md:text-lg transform -skew-x-12">F</span>
              </div>
              <div>
                <h1 className="text-zinc-200 font-black text-lg sm:text-xl md:text-2xl tracking-widest uppercase italic">FANUC-STYLE</h1>
                <span className="text-fanuc-yellow font-mono text-[10px] sm:text-xs md:text-sm tracking-[0.2em] sm:tracking-[0.3em]">ИНЖЕНЕРНЫЙ МОДУЛЬ V.2.5</span>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-4 md:mt-0 items-center flex-wrap justify-center">
              <InfoPlate text="СЕРИЯ 0i-MODEL F" />
              <div className="flex gap-2">
                <LED on={true} label="СЕТЬ" />
                <LED on={activeMode === AppMode.ENGINEERING} color="red" label="БУСТ" />
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Left: Mode Control Side Panel */}
            <div
              className="lg:w-32 flex lg:flex-col flex-row gap-6 items-center justify-center bg-zinc-900 p-4 rounded border-2 border-zinc-700 shadow-md relative overflow-hidden"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)
                `,
                backgroundSize: '20px 20px'
              }}
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none texture-ripple"></div>
              <ToggleSwitch
                checked={activeMode === AppMode.ENGINEERING}
                onChange={toggleEngineering}
                disabled={activeMode === AppMode.G_CODE}
                label="БУСТ"
              />
              <div className="h-px w-full bg-zinc-700 my-2 hidden lg:block"></div>
              {/* G-CODE Toggle Switch (Replaces Dial) */}
              <ToggleSwitch
                checked={activeMode === AppMode.G_CODE}
                onChange={toggleGCode}
                disabled={activeMode === AppMode.ENGINEERING}
                label="G КОД"
              />
            </div>
          </div>

          {/* Right: Dynamic Work Area */}
          <div className="flex-1 min-h-[400px] sm:min-h-[500px] flex">
            <div className="w-full relative">
              {/* This container manages the switching with a slight fade effect could be added here */}
              {activeMode === AppMode.CALCULATOR && <Calculator />}
              {activeMode === AppMode.ENGINEERING && <EngineeringPanel />}
              {activeMode === AppMode.G_CODE && <GCodeFrame />}
            </div>
          </div>

        </div>

        {/* Footer Warning Label */}
        <div className="mt-4 sm:mt-6 md:mt-8 flex justify-center opacity-60">
          <div className="bg-yellow-600/20 border border-yellow-600/50 px-2 sm:px-4 py-1 rounded text-yellow-600 text-[10px] sm:text-xs font-mono flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-xl">⚠</span>
            <span className="text-center">ВНИМАНИЕ: ПРОВЕРЯЙТЕ РЕЗУЛЬТАТЫ ВЫЧИСЛЕНИЙ ПЕРЕД ПРИМЕНЕНИЕМ НА ПРОИЗВОДСТВЕ</span>
          </div>
        </div>

      </div>
    </div>
  );
}
