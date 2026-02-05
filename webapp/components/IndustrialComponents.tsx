import React from 'react';

// A realistic looking screw head
export const ScrewHead: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`w-4 h-4 rounded-full bg-zinc-400 border border-zinc-500 shadow-sm flex items-center justify-center ${className}`}>
    <div className="w-full h-0.5 bg-zinc-600 rotate-45"></div>
    <div className="w-full h-0.5 bg-zinc-600 -rotate-45 absolute"></div>
  </div>
);

// Industrial rugged button
interface IndustrialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'action';
  label: string;
  subLabel?: string;
  active?: boolean;
}

export const IndustrialButton: React.FC<IndustrialButtonProps> = ({ 
  variant = 'primary', 
  label, 
  subLabel,
  active = false,
  className,
  ...props 
}) => {
  let bgClass = "bg-zinc-800 text-zinc-100 border-2 border-zinc-600"; // default/secondary - теперь темнее
  if (variant === 'primary') bgClass = "bg-zinc-700 text-white border-2 border-zinc-500";
  if (variant === 'danger') bgClass = "bg-red-700 text-white border-2 border-red-600";
  if (variant === 'action') bgClass = "bg-fanuc-yellow text-black font-bold border-2 border-yellow-400";
  if (active) bgClass = "bg-green-500 text-black border-2 border-green-400 shadow-inner shadow-black/50";

  return (
    <button
      className={`
        relative overflow-hidden rounded-sm p-2 sm:p-3 flex flex-col items-center justify-center transition-all duration-150
        min-h-[44px] touch-manipulation
        ${active ? 'shadow-btn-pressed translate-y-0.5' : 'shadow-lg hover:bg-zinc-700 hover:border-zinc-500 active:shadow-btn-pressed active:translate-y-0.5'}
        ${bgClass}
        ${className}
      `}
      {...props}
    >
      <span className="text-base sm:text-lg md:text-xl font-mono leading-none font-bold">{label}</span>
      {subLabel && <span className="text-[9px] sm:text-[10px] opacity-80 font-sans leading-none mt-0.5 sm:mt-1 uppercase font-semibold">{subLabel}</span>}
    </button>
  );
};

// LED Indicator
export const LED: React.FC<{ on: boolean; color?: 'red' | 'green'; label?: string }> = ({ on, color = 'green', label }) => {
  const colorClass = color === 'red' 
    ? (on ? 'bg-red-500 shadow-[0_0_8px_2px_rgba(255,0,0,0.8)]' : 'bg-red-900') 
    : (on ? 'bg-green-400 shadow-[0_0_8px_2px_rgba(0,255,0,0.8)]' : 'bg-green-900');

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-3 h-3 rounded-full border border-black ${colorClass} transition-all duration-300`}></div>
      {label && <span className="text-[9px] text-zinc-600 font-bold uppercase">{label}</span>}
    </div>
  );
};

// Toggle Switch
export const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <div className="flex flex-col items-center">
    <div 
      onClick={onChange}
      className={`cursor-pointer w-10 h-16 rounded-md border-2 relative shadow-machine-inset transition-all duration-200 touch-manipulation min-h-[44px] ${
        checked 
          ? 'bg-zinc-700 border-zinc-500 shadow-[0_0_10px_rgba(255,236,0,0.3)]' 
          : 'bg-zinc-800 border-zinc-600'
      }`}
    >
      <div className={`
        absolute left-1 right-1 h-6 bg-gradient-to-b from-zinc-300 to-zinc-500 border border-zinc-900 shadow-md transition-all duration-200
        ${checked ? 'top-1' : 'bottom-1'}
      `}>
        <div className="w-full h-[1px] bg-white/50 mt-1"></div>
        <div className="w-full h-[1px] bg-white/50 mt-1"></div>
        <div className="w-full h-[1px] bg-white/50 mt-1"></div>
      </div>
      {checked && (
        <div className="absolute inset-0 bg-fanuc-yellow/10 rounded-md pointer-events-none"></div>
      )}
    </div>
    <span className={`text-[10px] font-bold mt-1 uppercase transition-colors duration-200 ${
      checked ? 'text-fanuc-yellow font-black' : 'text-zinc-400'
    }`}>{label}</span>
  </div>
);

// Info Plate
export const InfoPlate: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-black px-2 py-0.5 border border-zinc-400 inline-block shadow-sm">
    <span className="text-fanuc-yellow font-mono text-xs tracking-widest uppercase">{text}</span>
  </div>
);
