import React from 'react';

const GCodeFrame: React.FC = () => {
    return (
        <div className="w-full h-full bg-zinc-900 border-2 border-zinc-700 rounded overflow-hidden relative shadow-inner">
            {/* Industrial Bezel */}
            <div className="absolute inset-0 pointer-events-none z-10 border-4 border-zinc-800/50 rounded shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>

            <iframe
                src="/g-code/index.html"
                className="w-full h-full border-0 bg-zinc-900"
                title="G-Code Generator"
            />
        </div>
    );
};

export default GCodeFrame;
