import React, { useState } from 'react';
import { IndustrialButton } from './IndustrialComponents';

interface DmsState {
  active: boolean;
  step: 'deg' | 'min' | 'sec';
  deg: string;
  min: string;
  sec: string;
}

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState<string | null>(null);
  const [isRad, setIsRad] = useState(false);
  const [lastOperator, setLastOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [hint, setHint] = useState('ГОТОВ К РАБОТЕ');
  
  // New DMS State
  const [dmsState, setDmsState] = useState<DmsState>({
    active: false,
    step: 'deg',
    deg: '',
    min: '',
    sec: ''
  });

  // Handle Digit Input (Normal vs DMS Mode)
  const inputDigit = (digit: string) => {
    if (dmsState.active) {
      handleDmsDigit(digit);
      return;
    }

    setHint('ВВОД');
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' && digit !== '.' ? digit : display + digit);
    }
  };

  // Dedicated DMS Digit Handler
  const handleDmsDigit = (digit: string) => {
    setDmsState(prev => {
      const field = prev.step;
      const currentVal = prev[field];
      // Prevent multiple decimals
      if (digit === '.' && currentVal.includes('.')) return prev;
      
      return {
        ...prev,
        [field]: currentVal + digit
      };
    });
  };

  const performOperation = (nextOperator: string) => {
    if (dmsState.active) return; // Block ops during DMS input

    const inputValue = parseFloat(display);

    if (memory === null) {
      setMemory(display);
    } else if (lastOperator) {
      const currentValue = memory ? parseFloat(memory) : 0;
      const newValue = calculate(currentValue, inputValue, lastOperator);
      setMemory(String(newValue));
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setLastOperator(nextOperator);
    setHint(`ОПЕРАЦИЯ: ${nextOperator}`);
  };

  const calculate = (left: number, right: number, op: string) => {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      default: return right;
    }
  };

  const handleEqual = () => {
    // DMS Mode: Act as "Next/Enter" button
    if (dmsState.active) {
      advanceDmsStep();
      return;
    }

    if (!lastOperator || !memory) return;
    const inputValue = parseFloat(display);
    const result = calculate(parseFloat(memory), inputValue, lastOperator);
    setDisplay(String(result));
    setMemory(null);
    setLastOperator(null);
    setWaitingForOperand(true);
    setHint('РЕЗУЛЬТАТ');
  };

  const clearAll = () => {
    setDisplay('0');
    setMemory(null);
    setLastOperator(null);
    setWaitingForOperand(false);
    setHint('СБРОС');
    setDmsState({ active: false, step: 'deg', deg: '', min: '', sec: '' });
  };

  const trig = (func: 'sin' | 'cos' | 'tan') => {
    if (dmsState.active) return;
    
    let val = parseFloat(display);
    if (isNaN(val)) return;

    if (!isRad) {
      val = val * (Math.PI / 180);
    }
    let res = 0;
    if (func === 'sin') res = Math.sin(val);
    if (func === 'cos') res = Math.cos(val);
    if (func === 'tan') res = Math.tan(val);
    
    // Fix precision issues
    res = Math.round(res * 100000000) / 100000000;
    
    setDisplay(String(res));
    setWaitingForOperand(true);
    setHint(`${func.toUpperCase()}(${isRad ? 'RAD' : 'DEG'})`);
  };
  const sqrt = () => {
    if (dmsState.active) return;
    const val = parseFloat(display);
    if (isNaN(val)) return;
    if (val < 0) {
      setHint('ОШИБКА: ЧИСЛО < 0');
      return;
    }
    const res = Math.sqrt(val);
    const formattedRes = Math.round(res * 100000000) / 100000000;
    setDisplay(String(formattedRes));
    setWaitingForOperand(true);
    setHint('√ КОРЕНЬ');
  };

  // --- DMS Logic ---

  const startDmsInput = () => {
    setDmsState({
      active: true,
      step: 'deg',
      deg: '',
      min: '',
      sec: ''
    });
    setHint('ВВЕДИТЕ ГРАДУСЫ (DEG)');
  };

  const advanceDmsStep = () => {
    if (dmsState.step === 'deg') {
      setDmsState(prev => ({ ...prev, step: 'min' }));
      setHint('ВВЕДИТЕ МИНУТЫ (MIN)');
    } else if (dmsState.step === 'min') {
      setDmsState(prev => ({ ...prev, step: 'sec' }));
      setHint('ВВЕДИТЕ СЕКУНДЫ (SEC)');
    } else {
      // Calculate final
      const d = parseFloat(dmsState.deg || '0');
      const m = parseFloat(dmsState.min || '0');
      const s = parseFloat(dmsState.sec || '0');
      const result = d + (m / 60) + (s / 3600);
      
      setDisplay(String(result));
      setDmsState({ active: false, step: 'deg', deg: '', min: '', sec: '' });
      setWaitingForOperand(true); // Treat as a result, ready for next op
      setHint(`ГРАД->ДЕС: ${d}° ${m}' ${s}"`);
    }
  };

  const decToDms = () => {
     if (dmsState.active) return;

     const val = parseFloat(display);
     if (isNaN(val)) return;

     const d = Math.floor(val);
     const minFloat = (val - d) * 60;
     const m = Math.floor(minFloat);
     const s = (minFloat - m) * 60;
     
     // Display formatted string directly to display, but mark waiting so next number clears it
     const formatted = `${d}° ${m}' ${s.toFixed(2)}"`;
     setDisplay(formatted);
     setWaitingForOperand(true);
     setHint('ДЕС -> ГРАД');
  };

  return (
    <div className="flex flex-col h-full">
      {/* VFD Display */}
      <div className="mb-6 bg-black border-4 border-zinc-600 rounded-sm p-4 relative shadow-machine-inset overflow-hidden h-28 flex flex-col justify-between">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,6px_100%]"></div>
        
        {/* Main Readout Area */}
        <div className="flex-1 flex items-center justify-end z-0 relative">
            {dmsState.active ? (
              <div className="flex justify-end gap-4 w-full font-mono text-2xl tracking-wider">
                <div className={`flex flex-col items-end ${dmsState.step === 'deg' ? 'text-fanuc-yellow drop-shadow-[0_0_5px_rgba(255,236,0,0.8)]' : 'text-cyan-800'}`}>
                  <span>{dmsState.deg || '0'}</span>
                  <span className="text-xs">DEG</span>
                </div>
                <div className={`flex flex-col items-end ${dmsState.step === 'min' ? 'text-fanuc-yellow drop-shadow-[0_0_5px_rgba(255,236,0,0.8)]' : 'text-cyan-800'}`}>
                  <span>{dmsState.min || '0'}</span>
                  <span className="text-xs">MIN</span>
                </div>
                <div className={`flex flex-col items-end ${dmsState.step === 'sec' ? 'text-fanuc-yellow drop-shadow-[0_0_5px_rgba(255,236,0,0.8)]' : 'text-cyan-800'}`}>
                  <span>{dmsState.sec || '0'}</span>
                  <span className="text-xs">SEC</span>
                </div>
              </div>
            ) : (
              <div className="font-mono text-4xl text-cyan-400 tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] break-all text-right">
                {display}
              </div>
            )}
        </div>

        {/* Status Line */}
        <div className="flex justify-between mt-2 text-xs text-cyan-700 font-mono z-0 relative border-t border-cyan-900/30 pt-1">
          <span className="bg-cyan-900/20 px-1">{isRad ? 'RAD' : 'DEG'}</span>
          <span className="uppercase tracking-wide">{hint}</span>
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-5 gap-3 bg-zinc-300 p-4 rounded border border-zinc-400 shadow-inner">
        {/* Row 1: Scientific & Modes */}
        <IndustrialButton label="RAD" active={isRad} onClick={() => setIsRad(!isRad)} subLabel="РЕЖИМ" className="bg-zinc-400" />
        <IndustrialButton 
          label="DMS IN" 
          active={dmsState.active}
          onClick={startDmsInput} 
          subLabel="ВВОД ГМС" 
          className="col-span-2 bg-zinc-400" 
        />
        <IndustrialButton 
          label="TO DMS" 
          onClick={decToDms} 
          subLabel="ПРОСМОТР" 
          className="col-span-2 bg-zinc-400" 
        />

        {/* Row 2: Trig */}
        <IndustrialButton label="SIN" onClick={() => trig('sin')} />
        <IndustrialButton label="COS" onClick={() => trig('cos')} />
        <IndustrialButton label="TAN" onClick={() => trig('tan')} />
        <IndustrialButton label="C" variant="danger" onClick={clearAll} subLabel={dmsState.active ? "ОТМЕНА" : "СБРОС"} />
        <IndustrialButton label="←" variant="secondary" onClick={() => !dmsState.active && setDisplay(display.length > 1 ? display.slice(0, -1) : '0')} />

        {/* Row 3 */}
        <IndustrialButton label="7" onClick={() => inputDigit('7')} />
        <IndustrialButton label="8" onClick={() => inputDigit('8')} />
        <IndustrialButton label="9" onClick={() => inputDigit('9')} />
        <IndustrialButton label="×" variant="secondary" onClick={() => performOperation('*')} />
        <IndustrialButton label="÷" variant="secondary" onClick={() => performOperation('/')} />

        {/* Row 4 */}
        <IndustrialButton label="4" onClick={() => inputDigit('4')} />
        <IndustrialButton label="5" onClick={() => inputDigit('5')} />
        <IndustrialButton label="6" onClick={() => inputDigit('6')} />
        <IndustrialButton label="+" variant="secondary" onClick={() => performOperation('+')} />
        <IndustrialButton label="-" variant="secondary" onClick={() => performOperation('-')} />

        {/* Row 5 */}
        <IndustrialButton label="1" onClick={() => inputDigit('1')} />
        <IndustrialButton label="2" onClick={() => inputDigit('2')} />
        <IndustrialButton label="3" onClick={() => inputDigit('3')} />
        <IndustrialButton label="." onClick={() => inputDigit('.')} />
        <IndustrialButton 
          label={dmsState.active ? "ENTER" : "="} 
          variant="action" 
          onClick={handleEqual} 
          className={`row-span-2 h-full ${dmsState.active ? 'bg-orange-500 text-black' : ''}`}
          subLabel={dmsState.active ? "ДАЛЕЕ" : ""}
        />
        
        {/* Row 6 (Zero spans) */}
       {/* Row 6: Обновленный ряд с корнем */}
       <IndustrialButton label="0" onClick={() => inputDigit('0')} />
        <IndustrialButton label="√" onClick={sqrt} className="bg-zinc-400 text-black" />
        <IndustrialButton label="π" onClick={() => inputDigit(String(Math.PI))} />
        <IndustrialButton label="e" onClick={() => inputDigit(String(Math.E))} />
      </div>

      <div className="mt-4 p-2 bg-zinc-800 border border-yellow-500/30 text-yellow-500/70 text-xs font-mono">
        {dmsState.active ? (
          <p className="animate-pulse">РЕЖИМ ВВОДА ГМС: ВВЕДИТЕ ЗНАЧЕНИЕ И НАЖМИТЕ [ENTER] ДЛЯ ПЕРЕХОДА К СЛЕДУЮЩЕМУ ПОЛЮ.</p>
        ) : (
          <p>ПОДСКАЗКА: ИСПОЛЬЗУЙТЕ [DMS IN] ДЛЯ ПОШАГОВОГО ВВОДА ГРАДУСОВ, МИНУТ И СЕКУНД.</p>
        )}
      </div>
    </div>
  );
};

export default Calculator;