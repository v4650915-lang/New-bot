
import React from 'react';
import { ToleranceResult, PartType } from '../../types';

interface Props {
  result: ToleranceResult;
}

export const ToleranceVisualizer: React.FC<Props> = ({ result }) => {
  const isHole = result.type === PartType.HOLE;
  
  // Scale for visualization
  const maxAbsDev = Math.max(Math.abs(result.es), Math.abs(result.ei), 50);
  const scale = 80 / maxAbsDev;
  
  const top = 100 - (result.es * scale + 50);
  const height = result.it * scale;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-black border border-gray-700 rounded-lg shadow-inner h-full">
      <div className="relative w-24 h-48 border-l-2 border-fanuc-yellow">
        {/* Nominal Line */}
        <div className="absolute top-[50%] left-[-10px] w-32 border-t-2 border-dashed border-fanuc-yellow z-0">
          <span className="absolute left-[-40px] top-[-10px] text-xs font-bold text-fanuc-yellow">0</span>
        </div>
        
        {/* Tolerance Box */}
        <div 
          className={`absolute left-4 w-12 border-2 ${isHole ? 'bg-gray-800 border-fanuc-yellow' : 'bg-gray-800 border-fanuc-yellow'} shadow-md transition-all duration-500`}
          style={{ 
            top: `${top}%`, 
            height: `${height}%`,
            minHeight: '2px'
          }}
        >
          <div className="absolute -top-6 left-0 right-0 text-center text-[10px] font-bold text-fanuc-yellow">
            {result.es > 0 ? `+${result.es}` : result.es}
          </div>
          <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-bold text-fanuc-yellow">
            {result.ei > 0 ? `+${result.ei}` : result.ei}
          </div>
        </div>
        
        <div className="absolute bottom-[-24px] left-0 right-0 text-center text-xs text-gray-400 font-medium">
          {isHole ? 'Отверстие' : 'Вал'}
        </div>
      </div>
    </div>
  );
};
