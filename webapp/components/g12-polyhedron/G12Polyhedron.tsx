import React, { useState, useEffect, useRef } from 'react';

const G12Polyhedron: React.FC = () => {
  const [shape, setShape] = useState('6');
  const [sides, setSides] = useState(5);
  const [S, setS] = useState(27.0);
  const [R, setR] = useState(0.5);
  const [depth, setDepth] = useState(10.0);
  const [D, setD] = useState(12.0);
  const [Z, setZ] = useState(4);
  const [dir, setDir] = useState('climb');
  const [rpm, setRpm] = useState(2000);
  const [vc, setVc] = useState(75);
  const [fz, setFz] = useState(0.05);
  const [activeTab, setActiveTab] = useState('draw');
  const [gcode, setGcode] = useState('Нажмите РАССЧИТАТЬ');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const pathPointsRef = useRef<Array<{x: number, y: number}>>([]);
  const simDataRef = useRef({ N: 6, S: 27, D: 12 });
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEditedRef = useRef<'rpm' | 'vc' | null>(null);

  const vib = () => {
    if (navigator.vibrate) navigator.vibrate(5);
  };

  const syncVc = () => {
    if (D > 0 && rpm > 0) {
      const val = (Math.PI * D * rpm) / 1000;
      setVc(Math.round(val));
    }
  };

  const syncRpm = () => {
    if (D > 0 && vc > 0) {
      const val = (vc * 1000) / (Math.PI * D);
      setRpm(Math.round(val));
    }
  };

  // Автоматическая синхронизация при изменении диаметра фрезы
  useEffect(() => {
    if (D > 0 && rpm > 0) {
      syncVc();
    }
  }, [D]);

  // Автоматическая синхронизация Vc при изменении оборотов (с задержкой 2.5 секунды)
  useEffect(() => {
    // Пропускаем пересчет, если последним редактировалось Vc (чтобы избежать цикла)
    if (lastEditedRef.current === 'vc') {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    
    syncTimerRef.current = setTimeout(() => {
      if (D > 0 && rpm > 0) {
        lastEditedRef.current = 'rpm';
        syncVc();
        lastEditedRef.current = null;
      }
    }, 2500);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [rpm, D]);

  // Автоматическая синхронизация оборотов при изменении Vc (с задержкой 2.5 секунды)
  useEffect(() => {
    // Пропускаем пересчет, если последним редактировались обороты (чтобы избежать цикла)
    if (lastEditedRef.current === 'rpm') {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    
    syncTimerRef.current = setTimeout(() => {
      if (D > 0 && vc > 0) {
        lastEditedRef.current = 'vc';
        syncRpm();
        lastEditedRef.current = null;
      }
    }, 2500);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [vc, D]);

  const updateStock = () => {
    let N = shape === 'custom' ? sides : parseInt(shape);
    let minD = (N === 2) ? S : S / Math.cos(Math.PI / N);
    return minD;
  };

  const formatGCode = (num: number): string => {
    const fixed = num.toFixed(3);
    // Парсим обратно в число, чтобы убрать ошибки округления
    const parsed = parseFloat(fixed);
    // Проверяем, является ли число целым
    if (parsed % 1 === 0) {
      return parsed + '.';
    }
    // Убираем лишние нули в конце
    return fixed.replace(/\.?0+$/, '');
  };

  const calculate = () => {
    vib();
    let N = shape === 'custom' ? parseInt(String(sides)) : parseInt(shape);
    
    const feed = Math.round(rpm * fz * Z);
    const r_tool = D / 2;
    const r_in = S / 2;
    const r_path = r_in + r_tool; 
    const R_total = R + r_tool;

    let stockD = (N === 2) ? S : S / Math.cos(Math.PI / N);
    let safeX = stockD + D + 3.0;

    const isSharp = (R <= 0.001 && N >= 3);
    const isClimb = (dir === 'climb');

    let g = `%\nO0001(N${N} S${S} D${D} R${R})\n`;
    g += `G0 G40 G97 G98\n`;
    g += `T0101 M5 (Freza=${D})\n`;
    g += `(C axis on)\n`;
    g += `G28H0.\n`;
    g += `M3 S${rpm}\n`;
    g += `G0 X${formatGCode(safeX)} Z2. C0.\n`;
    g += `G1 Z-${formatGCode(depth)} F1000\n`;
    g += `G12.1 (POLAR-ON)\n`;

    pathPointsRef.current = []; 
    const step = (Math.PI * 2) / N;
    const halfStep = step / 2;
    const distToCenterArc = (N === 2) ? (S * 0.7) : ((r_in - R) / Math.cos(halfStep));
    const distSharpVertex = (r_in + r_tool) / Math.cos(halfStep);
    const gArc = isClimb ? 'G03' : 'G02';

    let firstPointGCode = "";

    for (let i = 0; i < N; i++) {
      let angle = isClimb ? (i * step) : (-i * step);
      let dirSign = isClimb ? 1 : -1;
      let vertexAngle = angle + halfStep * dirSign;

      if (isSharp) {
        let vx = distSharpVertex * Math.cos(vertexAngle);
        let vy = distSharpVertex * Math.sin(vertexAngle);
        let lineStr = `X${formatGCode(vx * 2)} C${formatGCode(vy)}`;

        if (i === 0) {
          g += `G01 ${lineStr} F${feed}\n`;
          firstPointGCode = lineStr;
        } else {
          g += `G01 ${lineStr}\n`;
        }
        pathPointsRef.current.push({ x: vx, y: vy });
      } else {
        let cx, cy;
        if (N === 2) {
          let shift = (r_in * 1.5);
          let nx = Math.cos(angle);
          let ny = Math.sin(angle);
          let tx = -ny * dirSign;
          let ty = nx * dirSign;
          cx = (r_in - R) * nx + shift * tx;
          cy = (r_in - R) * ny + shift * ty;
        } else {
          cx = distToCenterArc * Math.cos(vertexAngle);
          cy = distToCenterArc * Math.sin(vertexAngle);
        }

        let a1 = angle;
        let a2 = angle + step * dirSign;
        if (N === 2) {
          a1 = angle;
          a2 = angle + Math.PI;
        }

        let p1x = cx + R_total * Math.cos(a1);
        let p1y = cy + R_total * Math.sin(a1);
        let p2x = cx + R_total * Math.cos(a2);
        let p2y = cy + R_total * Math.sin(a2);

        let lineStr = `X${formatGCode(p1x * 2)} C${formatGCode(p1y)}`;

        if (i === 0) {
          g += `G01 ${lineStr} F${feed}\n`;
          firstPointGCode = lineStr;
        } else {
          g += `G01 ${lineStr}\n`;
        }

        if (R_total > 0.001) {
          g += `${gArc} X${formatGCode(p2x * 2)} C${formatGCode(p2y)} R${formatGCode(R_total)}\n`;
        }

        pathPointsRef.current.push({ x: p1x, y: p1y });
        const startAng = Math.atan2(p1y - cy, p1x - cx);
        let endAng = Math.atan2(p2y - cy, p2x - cx);
        if (isClimb) {
          if (endAng <= startAng) endAng += Math.PI * 2;
        } else {
          if (endAng >= startAng) endAng -= Math.PI * 2;
        }
        for (let k = 1; k <= 8; k++) {
          let t = k / 8;
          let ang = startAng + (endAng - startAng) * t;
          pathPointsRef.current.push({ x: cx + R_total * Math.cos(ang), y: cy + R_total * Math.sin(ang) });
        }
      }
    }

    if (firstPointGCode) {
      g += `G01 ${firstPointGCode} (CLOSE PROFILE)\n`;
    }

    g += `G13.1 (POLAR-ON)\n`;
    g += `G0 Z10. M5\n`;
    g += `(C axis off)\n`;
    g += `M9\n`;
    g += `G99\n`;
    g += `G28 U0.\n`;
    g += `G28 W0.\n`;
    g += `M30\n%`;

    setGcode(g);
    simDataRef.current = { N, S, D };
    startAnimation(isClimb);
  };

  const startAnimation = (isClimb: boolean) => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    cvs.width = cvs.clientWidth;
    cvs.height = cvs.clientHeight;

    let pointIdx = 0;
    let toolRot = 0;
    const simData = simDataRef.current;
    const pathPoints = pathPointsRef.current;

    function render() {
      pointIdx += 0.03;
      if (pointIdx >= pathPoints.length) pointIdx = 0;

      let idx = Math.floor(pointIdx);
      let nextIdx = (idx + 1) % pathPoints.length;
      let t = pointIdx - idx;
      let p1 = pathPoints[idx];
      let p2 = pathPoints[nextIdx];

      let curX = p1.x + (p2.x - p1.x) * t;
      let curY = p1.y + (p2.y - p1.y) * t;

      let radius = Math.sqrt(curX * curX + curY * curY);
      let angle = Math.atan2(curY, curX);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      const cx = cvs.width / 2;
      const cy = cvs.height / 2;
      const scale = (Math.min(cx, cy) - 30) / simData.S;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle - Math.PI / 2);
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const step = (Math.PI * 2) / simData.N;
      const r_vert = (simData.S / 2) / Math.cos(step / 2);
      for (let i = 0; i <= simData.N; i++) {
        let a = i * step + step / 2;
        let px = r_vert * Math.cos(a) * scale;
        let py = r_vert * Math.sin(a) * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      let toolScreenY = cy - radius * scale;
      ctx.save();
      ctx.translate(cx, toolScreenY);
      toolRot += 0.05;
      ctx.rotate(toolRot);
      let rToolPx = (simData.D / 2) * scale;
      ctx.fillStyle = 'rgba(241, 196, 15, 0.5)';
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rToolPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rToolPx, 0);
      ctx.lineTo(rToolPx, 0);
      ctx.moveTo(0, -rToolPx);
      ctx.lineTo(0, rToolPx);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#333';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, cvs.height);
      ctx.stroke();

      animIdRef.current = requestAnimationFrame(render);
    }
    render();
  };

  const copyCode = () => {
    vib();
    navigator.clipboard.writeText(gcode).then(() => {
      alert("Скопировано!");
    });
  };

  useEffect(() => {
    calculate();
  }, []);

  const stockD = updateStock();

  return (
    <div style={{ 
      background: '#121212', 
      color: '#ecf0f1', 
      fontFamily: "'Roboto Mono', monospace",
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', background: '#000', borderBottom: '2px solid #444', flexShrink: 0, height: '48px' }}>
        <button
          onClick={() => { vib(); setActiveTab('draw'); }}
          style={{
            flex: 1,
            background: '#000',
            color: activeTab === 'draw' ? '#f1c40f' : '#7f8c8d',
            border: 'none',
            fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderBottom: activeTab === 'draw' ? '4px solid #f1c40f' : '4px solid transparent',
            padding: '8px 4px'
          }}
        >
          НАСТРОЙКИ
        </button>
        <button
          onClick={() => { vib(); setActiveTab('code'); }}
          style={{
            flex: 1,
            background: '#000',
            color: activeTab === 'code' ? '#f1c40f' : '#7f8c8d',
            border: 'none',
            fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderBottom: activeTab === 'code' ? '4px solid #f1c40f' : '4px solid transparent',
            padding: '8px 4px'
          }}
        >
          G-КОД
        </button>
      </div>

      {activeTab === 'draw' && (
        <div style={{ flex: 1, padding: 'clamp(8px, 2vw, 10px)', overflowY: 'auto', fontSize: 'clamp(0.75rem, 3vw, 0.9rem)' }}>
          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ФОРМА</label>
              <select
                id="shape"
                value={shape}
                onChange={(e) => { vib(); setShape(e.target.value); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '120px', maxWidth: '140px', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              >
                <option value="6">Шестигранник</option>
                <option value="4">Квадрат</option>
                <option value="2">Лыски (2)</option>
                <option value="custom">Кастом (N)</option>
              </select>
            </div>
            {shape === 'custom' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ГРАНЕЙ (N)</label>
                <input
                  type="number"
                  value={sides}
                  onChange={(e) => { vib(); setSides(parseInt(e.target.value) || 5); }}
                  style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
                />
              </div>
            )}
          </div>

          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '120px' }}>
                <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', display: 'block' }}>S (ПОД КЛЮЧ)</label>
                <span style={{ display: 'block', fontSize: 'clamp(0.6rem, 2vw, 0.7rem)', color: '#f1c40f' }}>ЗАГОТОВКА: ⌀{stockD.toFixed(2)}</span>
              </div>
              <input
                type="number"
                value={S}
                step="0.1"
                onChange={(e) => { vib(); setS(parseFloat(e.target.value) || 27.0); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>R (СКРУГЛЕНИЕ)</label>
              <input
                type="number"
                value={R}
                step="0.1"
                min="0"
                onChange={(e) => { vib(); setR(parseFloat(e.target.value) || 0.5); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ГЛУБИНА (Z)</label>
              <input
                type="number"
                value={depth}
                step="0.5"
                onChange={(e) => { vib(); setDepth(parseFloat(e.target.value) || 10.0); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
          </div>

          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ФРЕЗА ⌀</label>
              <input
                type="number"
                value={D}
                step="0.1"
                onChange={(e) => { vib(); setD(parseFloat(e.target.value) || 12.0); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ЗУБЬЕВ</label>
              <input
                type="number"
                value={Z}
                onChange={(e) => { vib(); setZ(parseInt(e.target.value) || 4); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
          </div>

          <div style={{ background: '#1e1e1e', padding: 'clamp(8px, 2vw, 10px)', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>НАПРАВЛЕНИЕ</label>
              <select
                value={dir}
                onChange={(e) => { vib(); setDir(e.target.value); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '120px', maxWidth: '140px', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              >
                <option value="climb">ПОПУТНОЕ</option>
                <option value="conv">ВСТРЕЧНОЕ</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>ОБОРОТЫ (S)</label>
              <input
                type="number"
                value={rpm}
                onChange={(e) => { vib(); lastEditedRef.current = 'rpm'; setRpm(parseInt(e.target.value) || 2000); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>Vc (М/МИН)</label>
              <input
                type="number"
                value={vc}
                onChange={(e) => { vib(); lastEditedRef.current = 'vc'; setVc(parseInt(e.target.value) || 75); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: '#7f8c8d', fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', flex: '1', minWidth: '100px' }}>Fz (НА ЗУБ)</label>
              <input
                type="number"
                value={fz}
                step="0.01"
                onChange={(e) => { vib(); setFz(parseFloat(e.target.value) || 0.05); }}
                style={{ background: '#2d2d2d', border: '1px solid #444', color: '#f1c40f', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', padding: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', minWidth: '80px', maxWidth: '90px', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", flex: '1' }}
              />
            </div>
          </div>

          <button
            onClick={() => { vib(); calculate(); }}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px)',
              background: '#f1c40f',
              color: '#000',
              fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              textTransform: 'uppercase',
              marginTop: '5px',
              marginBottom: '10px',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            РАССЧИТАТЬ
          </button>

          <div style={{ width: '100%', height: 'clamp(200px, 40vh, 250px)', background: '#000', border: '1px solid #444', borderRadius: '4px', marginTop: '10px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: 'clamp(0.6rem, 2vw, 0.7rem)', color: '#555', pointerEvents: 'none', zIndex: 1 }}>СИМУЛЯЦИЯ</div>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
          </div>
        </div>
      )}

      {activeTab === 'code' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
          <textarea
            value={gcode}
            readOnly
            style={{
              flex: 1,
              background: '#000',
              color: '#2ecc71',
              fontSize: 'clamp(12px, 3.5vw, 18px)',
              fontWeight: 'bold',
              lineHeight: '1.4',
              padding: 'clamp(8px, 2vw, 10px)',
              border: 'none',
              resize: 'none',
              whiteSpace: 'pre',
              fontFamily: "'Courier New', monospace",
              overflowWrap: 'break-word',
              wordBreak: 'break-word'
            }}
          />
          <button
            onClick={copyCode}
            style={{
              background: '#f1c40f',
              color: '#000',
              fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
              fontWeight: '900',
              padding: 'clamp(15px, 4vw, 20px)',
              border: 'none',
              textTransform: 'uppercase',
              cursor: 'pointer',
              width: '100%',
              flexShrink: 0,
              touchAction: 'manipulation'
            }}
          >
            КОПИРОВАТЬ КОД
          </button>
        </div>
      )}
    </div>
  );
};

export default G12Polyhedron;
