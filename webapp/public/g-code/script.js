// Matrix Effect
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const cols = Math.floor(width / 20) + 1;
const ypos = Array(cols).fill(0);

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

function matrix() {
    // Semi-transparent black to create trail effect
    ctx.fillStyle = '#0001';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#0f0';
    ctx.font = '15pt monospace';

    ypos.forEach((y, ind) => {
        // Generate random number 0-9
        const text = Math.floor(Math.random() * 10).toString();
        const x = ind * 20;
        ctx.fillText(text, x, y);

        if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
        else ypos[ind] = y + 20;
    });
}

setInterval(matrix, 50);

// --- Core Logic & State Management ---

let currentMachine = 'fanuc'; // default

// Fanuc/FMS/HAAS State
let frameCounter = 1;
let toolCounter = 1;
let historyStack = []; // Stores { text, counter, toolCounter }

// Siemens State
let siemensLines = [];

// --- Templates ---

const TEMPLATE_HEADER_FANUC =
    `%
O2026(DETAIL)
G40G80G99G97
G54
`;

const TEMPLATE_HEADER_HAAS =
    `%
O2026(DETAIL)
(HAAS SINGLE LINE CYCLES)
G40G80G99G97
G54
`;

const getTurningTemplate = (type, startN, endN, toolCode) => {
    const isInternal = type === 'internal';
    const uVal = isInternal ? "U-0.25" : "U0.25";
    const comment = isInternal ? "(RASTOCHKA)" : "(CHERN)";

    if (currentMachine === 'haas') {
        // HAAS Single Line G71 (D is depth of cut)
        return `G28U0
G28W0
${toolCode}${comment}
M3S1000
G0X50Z2(PODVOD)
M8
G71P${startN}Q${endN}U0.25W0.05D0.5F0.25
N${startN}
N${endN}
G0Z10M9
G28U0
G28W0
M1`;
    }

    return `G28U0
G28W0
${toolCode}${comment}
M3S1000
G0X50Z2(PODVOD)
M8
G71U0.5R0.25
G71P${startN}Q${endN}${uVal}W0.05F0.25
N${startN}
N${endN}
G0Z10M9
G28U0
G28W0
M1`;
};

const getFacingTemplate = (startN, endN, toolCode) => {
    if (currentMachine === 'haas') {
        // HAAS Single Line G72
        return `G28U0
G28W0
${toolCode}(TORCOVKA)
M3S1000
G0X55Z0(PODVOD)
M8
G72P${startN}Q${endN}U0.2W0.1D0.5F0.25
N${startN}G0Z-2
N${endN}G1X-1
G0Z10M9
G28U0
G28W0
M1`;
    }

    return `G28U0
G28W0
${toolCode}(TORCOVKA)
M3S1000
G0X55Z0(PODVOD)
M8
G72W1.0R0.5
G72P${startN}Q${endN}U0.2W0.1F0.25
N${startN}G0Z-2
N${endN}G1X-1
G0Z10M9
G28U0
G28W0
M1`;
};

const getThreadingTemplate = (toolCode) => {
    if (currentMachine === 'haas') {
        // HAAS Single Line G76
        return `G28U0
G28W0
${toolCode}(REZBA)
G97S500M3
G0X50Z5
M8
G76X48Z-10K1.2D0.3F2.0
G0Z10M9
G28U0
G28W0
M1`;
    }

    return `G28U0
G28W0
${toolCode}(REZBA)
G97S500M3
G0X50Z5
M8
G76P000060Q50R0.015
G76X48Z-10P1000Q100F2.
G0Z10M9
G28U0
G28W0
M1`;
};

const getGroovingTemplate = (subtype, toolCode) => {
    if (currentMachine === 'haas') {
        if (subtype === 'face') {
            // G74 Single Line
            return `G28U0
G28W0
${toolCode}(KANAVKA TOR)
G97S500M3
G0X50Z2
M8
G74X30Z-2K2.0F0.035
G0Z10M9
G28U0
G28W0
M1`;
        } else {
            // G75 Single Line
            return `G28U0
G28W0
${toolCode}(KANAVKA NAR)
G97S500M3
G0X55Z-10
M8
G75X30Z-10I2.0F0.1
G0X100Z100M9
G28U0
G28W0
M1`;
        }
    }

    if (subtype === 'face') {
        return `G28U0
G28W0
${toolCode}(KANAVKA TOR)
G97S500M3
G0X50Z2
M8
G74R0.1
G74X30Z-2P2700Q1000F0.035
G0Z10M9
G28U0
G28W0
M1`;
    } else {
        return `G28U0
G28W0
${toolCode}(KANAVKA NAR)
G97S500M3
G0X55Z-10
M8
G75R1
G75X30Z-10P3000Q0F0.1
G0X100Z100M9
G28U0
G28W0
M1`;
    }
};

// --- Helper Functions ---

function getNextToolCode() {
    const num = toolCounter;
    const padded = num.toString().padStart(2, '0');
    return `T${padded}${padded}`;
}

function updateUndoButton() {
    const btnUndo = document.getElementById('btnUndo');
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        btnUndo.disabled = historyStack.length === 0;
    } else {
        btnUndo.disabled = siemensLines.length <= 3;
    }
}

function saveState() {
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        const textarea = document.getElementById('codeOutput');
        historyStack.push({
            text: textarea.value,
            counter: frameCounter,
            toolCounter: toolCounter
        });
    }
    updateUndoButton();
}

// --- Main Functions ---

function selectMachine(machine) {
    currentMachine = machine;
    document.getElementById('welcomeScreen').style.display = 'none';
    const appContainer = document.querySelector('.app-container');
    appContainer.style.display = 'block'; // Make sure this is block for layout

    // Set Theme
    document.body.className = ''; // Reset
    document.body.classList.add(`theme-${machine}`);

    resetCode();
}

function goBack() {
    document.querySelector('.app-container').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'block';
}

function resetCode() {
    const textarea = document.getElementById('codeOutput');

    if (currentMachine === 'fanuc' || currentMachine === 'fms') {
        textarea.value = TEMPLATE_HEADER_FANUC + "\n%";
        frameCounter = 1;
        toolCounter = 1;
        historyStack = [];
    } else if (currentMachine === 'haas') {
        textarea.value = TEMPLATE_HEADER_HAAS + "\n%";
        frameCounter = 1;
        toolCounter = 1;
        historyStack = [];
    } else {
        // Siemens Reset
        const date = new Date().toLocaleDateString();
        siemensLines = [];
        siemensLines.push('%'); // Start percent
        siemensLines.push(`; SIEMENS G-CODE GENERATED ${date}`);
        siemensLines.push('G21 G40 G90 G95');
        siemensLines.push('G54');
        siemensLines.push('SUPA G0 Z0 D0');
        siemensLines.push('%'); // End percent
        textarea.value = siemensLines.join('\n');
    }
    updateUndoButton();
}

function confirmReset() {
    if (confirm('Очистить программу и начать заново?')) {
        resetCode();
    }
}

function undo() {
    const textarea = document.getElementById('codeOutput');

    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        if (historyStack.length === 0) return;
        const lastState = historyStack.pop();
        textarea.value = lastState.text;
        frameCounter = lastState.counter;
        toolCounter = lastState.toolCounter;
    } else {
        // Siemens
        if (siemensLines.length > 6) {
            siemensLines.splice(siemensLines.length - 2, 1);
            textarea.value = siemensLines.join('\n');
        }
    }
    updateUndoButton();
}

function appendBlock(blockCode) {
    const textarea = document.getElementById('codeOutput');

    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        saveState();
        let currentContent = textarea.value;
        currentContent = currentContent.trimEnd();

        // Remove trailing '%' if it exists (to append before it)
        if (currentContent.endsWith('%')) {
            currentContent = currentContent.substring(0, currentContent.length - 1).trimEnd();
        }

        if (currentContent.length > 0) {
            textarea.value = currentContent + "\n\n" + blockCode + "\n\n%";
        } else {
            textarea.value = blockCode + "\n\n%";
        }
    } else {
        // Siemens append logic
        const lines = blockCode.split('\n');

        // Remove last element (%)
        const last = siemensLines.pop();

        siemensLines.push(...lines);
        siemensLines.push(last); // Add % back

        textarea.value = siemensLines.join('\n');
    }

    textarea.scrollTop = textarea.scrollHeight;
    updateUndoButton();
}

// --- Operations ---

function addTurning(type) {
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        const startN = frameCounter;
        const endN = frameCounter + 1;
        const toolCode = getNextToolCode();

        const code = getTurningTemplate(type, startN, endN, toolCode);
        appendBlock(code);

        frameCounter += 2;
        toolCounter++;
    } else {
        // Siemens
        const startLabel = `START${frameCounter}`;
        const endLabel = `END${frameCounter}`;
        // Internal turning: negative X allowance
        const allowanceX = type === 'internal' ? '-0.4' : '0.4';

        let contour = "";
        if (type === 'internal') {
            contour = `G0 X40 Z2
G1 Z0
G1 X30 Z-10
G1 Z-30`;
        } else {
            contour = `G0 X20 Z2
G1 Z0
G1 X50`;
        }

        const code = `; TURNING ${type.toUpperCase()}
G0 G75 X0 Z0
T${toolCounter} D1
M3 S1000 G97
G0 X50 Z2
G95 F0.25
M8
CYCLE95("${startLabel}:${endLabel}", 2.5, 0.3, ${allowanceX}, , 0.25, 0.15, 0.1, 1, , , 0.5)
GOTOF ${endLabel}
${startLabel}:
${contour}
${endLabel}:
M9
G0 X50 Z2
G0 G75 X0 Z0
M1`;
        appendBlock(code);

        frameCounter++;
        toolCounter++;
    }
}

function addFacing() {
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        const startN = frameCounter;
        const endN = frameCounter + 1;
        const toolCode = getNextToolCode();

        const code = getFacingTemplate(startN, endN, toolCode);
        appendBlock(code);

        frameCounter += 2;
        toolCounter++;
    } else {
        // Siemens Facing
        const startLabel = `START${frameCounter}`;
        const endLabel = `END${frameCounter}`;

        const code = `; FACING
G0 G75 X0 Z0
T${toolCounter} D1
M3 S1000 G97
G0 X60 Z2
G95 F0.25
M8
CYCLE95("${startLabel}:${endLabel}", 2.5, 0.3, 0.4, , 0.25, 0.15, 0.1, 2, , , 0.5)
GOTOF ${endLabel}
${startLabel}:
G0 X55 Z0
G1 X-1.6
${endLabel}:
M9
G0 X50 Z5
G0 G75 X0 Z0
M1`;
        appendBlock(code);

        frameCounter++;
        toolCounter++;
    }
}

function addGrooving(type) {
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        const toolCode = getNextToolCode();
        const code = getGroovingTemplate(type, toolCode);
        appendBlock(code);

        toolCounter++;
    } else {
        // Siemens Grooving (CYCLE93)
        const code = `; GROOVING ${type.toUpperCase()}
G0 G75 X0 Z0
T${toolCounter} D1
M3 S500 G97
G0 X55 Z-10
G95 F0.1
M8
CYCLE93(55, -10, 5, 30, , , , , , , , 0.2, 0.2, , , )
M9
G0 G75 X0 Z0
M1`;
        appendBlock(code);

        toolCounter++;
    }
}

function addThreading() {
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        const toolCode = getNextToolCode();
        const code = getThreadingTemplate(toolCode);
        appendBlock(code);

        toolCounter++;
    } else {
        // Siemens Threading (CYCLE97)
        const code = `; THREADING
G0 G75 X0 Z0
T${toolCounter} D1
M3 S500 G97
G0 X32 Z5
G95 F2.0
M8
CYCLE97(2.0, , 0, -30, 30, 30, 5, 2, 1.226, 0.1, 30, 0, 5, 0.5, 3, 1)
M9
G0 X50 Z10
G0 G75 X0 Z0
M1`;
        appendBlock(code);

        toolCounter++;
    }
}

function addDrilling() {
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        const toolCode = getNextToolCode();
        const code = `G28U0
G28W0
${toolCode}(SVERLENIE)
G97S1000M3
G0X0Z2
M8
G83Z-30R2Q5000F0.1
G80
G0Z10M9
G28U0
G28W0
M1`;
        appendBlock(code);
        toolCounter++;
    } else {
        // Siemens Drilling (CYCLE83)
        const code = `; DRILLING
G0 G75 X0 Z0
T${toolCounter} D1
M3 S1000 G97
G0 X0 Z2
M8
CYCLE83(2, 0, 1, -30, 0, 10, 0.5, 1, 0, 1, 1, 1)
M9
G0 G75 X0 Z0
M1`;
        appendBlock(code);
        toolCounter++;
    }
}

function addCutoff() {
    if (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') {
        const toolCode = getNextToolCode();
        const code = `G28U0
G28W0
${toolCode}(OTREZKA)
G97S800M3
G0X55Z-30
M8
G75R1
G75X0P1000F0.08
G0X100Z100M9
G28U0
G28W0
M1`;
        appendBlock(code);
        toolCounter++;
    } else {
        // Siemens Cutoff (CYCLE92) or just Linear
        const code = `; CUTOFF
G0 G75 X0 Z0
T${toolCounter} D1
M3 S800 G97
G0 X55 Z-30
G95 F0.08
M8
CYCLE92(55, -30, 0, , 0.5, 0.5, 1200, 3, 0, 0, )
M9
G0 G75 X0 Z0
M1`;
        appendBlock(code);
        toolCounter++;
    }
}

function copyCode() {
    const textarea = document.getElementById('codeOutput');
    textarea.select();

    // For mobile support
    textarea.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(textarea.value).then(() => {
            alert('Скопировано! Не забудь изменить значения в программе на свои!');
        });
    } catch (err) {
        // Fallback
        document.execCommand('copy');
        alert('Скопировано!');
    }
}

function saveFile() {
    const textarea = document.getElementById('codeOutput');
    const text = textarea.value;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (currentMachine === 'fanuc' || currentMachine === 'fms' || currentMachine === 'haas') ? 'O2026.txt' : 'program_siemens.mpf';
    a.click();
    URL.revokeObjectURL(a.href);

    setTimeout(() => {
        alert("Не забудь изменить значения в программе на свои!");
    }, 100);
}
