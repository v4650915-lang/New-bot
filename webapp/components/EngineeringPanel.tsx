import React, { useState } from 'react';
import { IndustrialButton } from './IndustrialComponents';
import G12PolyhedronWrapper from './G12PolyhedronWrapper';
import TolerancesApp from './TolerancesApp';

const EngineeringPanel: React.FC = () => {
  const [showG121, setShowG121] = useState(false);
  const [showTolerances, setShowTolerances] = useState(false);

  const handleG121 = () => {
    setShowG121(true);
  };

  const handleBack = () => {
    setShowG121(false);
    setShowTolerances(false);
  };

  const handleRectangular = () => {
    // TODO: Реализовать функциональность Прямоугольный/Треугольник
    console.log('Прямоугольный - ТРЕУГОЛЬНИК');
  };

  const handleTolerances = () => {
    setShowTolerances(true);
  };

  const handleChamfers = () => {
    // TODO: Реализовать функциональность ФАСКИ И ПРИТУПЛЕНИЯ
    console.log('ФАСКИ И ПРИТУПЛЕНИЯ');
  };

  // Если показываем допуски, рендерим TolerancesApp
  if (showTolerances) {
    return <TolerancesApp onBack={handleBack} />;
  }

  // Если показываем G12.1, рендерим обертку
  if (showG121) {
    return (
      <div className="flex flex-col h-full bg-zinc-900 p-4 border-2 border-zinc-700 rounded shadow-inner relative overflow-hidden">
        <G12PolyhedronWrapper onBack={handleBack} />
      </div>
    );
  }

  // Иначе показываем список модулей
  return (
    <div 
      className="flex flex-col h-full bg-zinc-900 p-4 border-2 border-zinc-700 rounded shadow-inner relative overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)
        `,
        backgroundSize: '20px 20px'
      }}
    >
      {/* Дополнительный слой текстуры для эффекта "рябчика" */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0),
            radial-gradient(circle at 18px 18px, rgba(255,255,255,0.08) 1px, transparent 0)
          `,
          backgroundSize: '20px 20px, 25px 25px',
          backgroundPosition: '0 0, 10px 10px'
        }}
      />
      
      <div className="flex-1 flex flex-col gap-4 justify-center relative z-10">
        {/* Кнопки в стиле калькулятора */}
        <div className="grid grid-cols-1 gap-4">
          <IndustrialButton 
            label="G12.1" 
            subLabel="МНОГОГРАННИК"
            onClick={handleG121}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />
          
          <IndustrialButton 
            label="Прямоугольный" 
            subLabel="ТРЕУГОЛЬНИК"
            onClick={handleRectangular}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />
          
          <IndustrialButton 
            label="ДОПУСКИ" 
            onClick={handleTolerances}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />
          
          <IndustrialButton 
            label="ФАСКИ И" 
            subLabel="ПРИТУПЛЕНИЯ"
            onClick={handleChamfers}
            className="bg-zinc-800 text-zinc-100 border-2 border-zinc-600 h-20 text-xl font-bold shadow-lg hover:bg-zinc-700 hover:border-fanuc-yellow hover:shadow-[0_0_12px_rgba(255,236,0,0.6)] transition-all duration-200"
          />
        </div>
      </div>
    </div>
  );
};

export default EngineeringPanel;
