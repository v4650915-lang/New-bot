import React from 'react';
import G12Polyhedron from './g12-polyhedron/G12Polyhedron';

interface G12PolyhedronWrapperProps {
  onBack: () => void;
}

const G12PolyhedronWrapper: React.FC<G12PolyhedronWrapperProps> = ({ onBack }) => {
  return (
    <div className="w-full h-full flex flex-col relative" style={{ minHeight: 0 }}>
      {/* Back Button */}
      <div className="mb-2 sm:mb-4 flex-shrink-0" style={{ padding: '0 4px' }}>
        <button
          onClick={onBack}
          className="px-3 sm:px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors flex items-center gap-2 shadow-btn text-sm sm:text-base"
          style={{ touchAction: 'manipulation' }}
        >
          <span>←</span>
          <span>Назад</span>
        </button>
      </div>
      
      {/* G12.1 Application */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <G12Polyhedron />
      </div>
    </div>
  );
};

export default G12PolyhedronWrapper;
