
export const DIAMETER_STEPS = [0, 3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];

/**
 * Формирует интервалы из DIAMETER_STEPS в формате "min > max"
 */
export function getDiameterIntervals(): Array<{ label: string; range: [number, number] }> {
  const intervals: Array<{ label: string; range: [number, number] }> = [];
  for (let i = 0; i < DIAMETER_STEPS.length - 1; i++) {
    const min = DIAMETER_STEPS[i];
    const max = DIAMETER_STEPS[i + 1];
    intervals.push({
      label: `${min} > ${max}`,
      range: [min, max]
    });
  }
  return intervals;
}

/**
 * Вычисляет геометрическое среднее для интервала [min, max]
 */
export function getIntervalGeometricMean(min: number, max: number): number {
  if (min === 0) {
    // Для первого интервала используется sqrt(3 * max)
    return Math.sqrt(3 * max);
  }
  return Math.sqrt(min * max);
}

/**
 * Диапазоны квалитетов для каждого класса допусков по ГОСТ 25346
 * Разные классы имеют разные диапазоны применяемых квалитетов
 */
export const QUALITY_RANGES: Record<string, { min: number; max: number }> = {
  // Отверстия (uppercase) - основные классы с полными диапазонами
  'H': { min: 4, max: 16 },  // H4-H16
  'JS': { min: 4, max: 16 }, // JS4-JS16
  'A': { min: 4, max: 16 },  // A4-A16 (расширено)
  'B': { min: 4, max: 16 },  // B4-B16 (расширено)
  'C': { min: 4, max: 16 },  // C4-C16 (расширено)
  'D': { min: 4, max: 16 },  // D4-D16 (расширено)
  'E': { min: 4, max: 16 },  // E4-E16 (расширено)
  'F': { min: 4, max: 16 },  // F4-F16 (расширено)
  'G': { min: 4, max: 16 },  // G4-G16 (расширено)
  'K': { min: 4, max: 16 },  // K4-K16 (расширено)
  'M': { min: 4, max: 16 },  // M4-M16 (расширено)
  'N': { min: 4, max: 16 },  // N4-N16 (расширено)
  'P': { min: 4, max: 16 },  // P4-P16 (расширено)
  'R': { min: 4, max: 16 },  // R4-R16 (расширено)
  'S': { min: 4, max: 16 },  // S4-S16 (расширено)
  'T': { min: 4, max: 16 },  // T4-T16 (расширено)
  'U': { min: 4, max: 16 },  // U4-U16 (расширено)
  'V': { min: 4, max: 16 },  // V4-V16 (расширено)
  'X': { min: 4, max: 16 },  // X4-X16 (расширено)
  'Y': { min: 4, max: 16 },  // Y4-Y16 (расширено)
  'Z': { min: 4, max: 16 },  // Z4-Z16 (расширено)
  'ZA': { min: 4, max: 16 }, // ZA4-ZA16 (расширено)
  'ZB': { min: 4, max: 16 }, // ZB4-ZB16 (расширено)
  'ZC': { min: 4, max: 16 }, // ZC4-ZC16 (расширено)
  
  // Валы (lowercase) - основные классы с полными диапазонами
  'h': { min: 4, max: 16 },  // h4-h16
  'js': { min: 4, max: 16 }, // js4-js16
  'a': { min: 4, max: 16 },  // a4-a16 (расширено)
  'b': { min: 4, max: 16 },  // b4-b16 (расширено)
  'c': { min: 4, max: 16 },  // c4-c16 (расширено)
  'd': { min: 4, max: 16 },  // d4-d16 (расширено)
  'e': { min: 4, max: 16 },  // e4-e16 (расширено)
  'f': { min: 4, max: 16 },  // f4-f16 (расширено)
  'g': { min: 4, max: 16 },  // g4-g16 (расширено)
  'k': { min: 4, max: 16 },  // k4-k16 (расширено)
  'm': { min: 4, max: 16 },  // m4-m16 (расширено)
  'n': { min: 4, max: 16 },  // n4-n16 (расширено)
  'p': { min: 4, max: 16 },  // p4-p16 (расширено)
  'r': { min: 4, max: 16 },  // r4-r16 (расширено)
  's': { min: 4, max: 16 },  // s4-s16 (расширено)
  't': { min: 4, max: 16 },  // t4-t16 (расширено)
  'u': { min: 4, max: 16 },  // u4-u16 (расширено)
  'v': { min: 4, max: 16 },  // v4-v16 (расширено)
  'x': { min: 4, max: 16 },  // x4-x16 (расширено)
  'y': { min: 4, max: 16 },  // y4-y16 (расширено)
  'z': { min: 4, max: 16 },  // z4-z16 (расширено)
  'za': { min: 4, max: 16 }, // za4-za16 (расширено)
  'zb': { min: 4, max: 16 }, // zb4-zb16 (расширено)
  'zc': { min: 4, max: 16 }, // zc4-zc16 (расширено)
};

/**
 * Порядок базовых букв для сортировки (строчные версии)
 */
const BASE_LETTER_ORDER = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'js', 'k', 'm', 'n', 'p', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z', 'za', 'zb', 'zc'];

/**
 * Получить базовую букву (строчную версию) для сортировки
 */
function getBaseLetter(letter: string): string {
  return letter.toLowerCase();
}

/**
 * Получить индекс базовой буквы для сортировки
 */
function getBaseLetterIndex(letter: string): number {
  const base = getBaseLetter(letter);
  const index = BASE_LETTER_ORDER.indexOf(base);
  return index === -1 ? 9999 : index; // Если буква не найдена, ставим в конец
}

/**
 * Генерирует все допустимые классы допусков согласно диапазонам квалитетов
 * Группирует по буквам: для каждой буквы квалитеты идут по порядку (A4, a4, A5, a5...)
 * Порядок: сначала по базовой букве (a, b, c...), затем по квалитету (4, 5, 6...), затем заглавная перед строчной
 */
export function generateAllToleranceClasses(): string[] {
  const allClasses: string[] = [];
  
  // Генерируем все классы
  Object.entries(QUALITY_RANGES).forEach(([letter, range]) => {
    for (let quality = range.min; quality <= range.max; quality++) {
      allClasses.push(`${letter}${quality}`);
    }
  });
  
  // Сортируем: сначала по базовой букве, затем по квалитету, затем заглавная перед строчной
  allClasses.sort((a, b) => {
    const matchA = a.match(/^([A-Za-z]+)(\d+)$/);
    const matchB = b.match(/^([A-Za-z]+)(\d+)$/);
    
    if (!matchA || !matchB) return 0;
    
    const letterA = matchA[1];
    const letterB = matchB[1];
    const qualityA = parseInt(matchA[2], 10);
    const qualityB = parseInt(matchB[2], 10);
    
    // Сначала сравниваем базовые буквы
    const indexA = getBaseLetterIndex(letterA);
    const indexB = getBaseLetterIndex(letterB);
    
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    
    // Если базовые буквы одинаковые, сравниваем квалитеты
    if (qualityA !== qualityB) {
      return qualityA - qualityB;
    }
    
    // Если и буквы, и квалитеты одинаковые, заглавная идет перед строчной
    const isUpperA = letterA === letterA.toUpperCase();
    const isUpperB = letterB === letterB.toUpperCase();
    
    if (isUpperA && !isUpperB) return -1;
    if (!isUpperA && isUpperB) return 1;
    
    return 0;
  });
  
  return allClasses;
}

/**
 * Все классы допусков для отображения в таблице
 * Генерируются автоматически на основе QUALITY_RANGES
 */
export const POPULAR_TOLERANCE_CLASSES = generateAllToleranceClasses();

// IT values as multiples of 'i' (for qualities >= 4)
// IT = multiplier * i
// i = 0.45 * cuberoot(D) + 0.001 * D
// IT4 uses approximation (typically 5i, though real values are tabular)
export const IT_MULTIPLIERS: Record<number, number> = {
  4: 5,   // Approximation for IT4 (actual values are tabular, but 5i is close)
  5: 7,
  6: 10,
  7: 16,
  8: 25,
  9: 40,
  10: 64,
  11: 100,
  12: 160,
  13: 250,
  14: 400,
  15: 640,
  16: 1000
};

// Fundamental Deviation Formulas according to ISO 286 / ГОСТ 25346
// Values in micrometers
export const FUNDAMENTAL_DEVIATIONS: Record<string, (D: number) => number> = {
  // Shafts (lowercase) - es (upper deviation) для a-h, ei (lower deviation) для k-zc
  'h': (D) => 0, // Upper deviation es = 0
  'js': (D) => NaN, // Symmetric (handled separately)
  'g': (D) => -2.5 * Math.pow(D, 0.34), // es
  'f': (D) => -5.5 * Math.pow(D, 0.41), // es
  'e': (D) => -11 * Math.pow(D, 0.41),  // es
  'd': (D) => -16 * Math.pow(D, 0.44),  // es
  'c': (D) => -52 * Math.pow(D, 0.2),   // es
  'b': (D) => -90 * Math.pow(D, 0.2),   // es (approximation)
  'a': (D) => -265 * Math.pow(D, 0.2),  // es (approximation)
  'k': (D) => 0.6 * Math.pow(D, 0.33),  // ei
  'm': (D) => Math.pow(D, 0.33) + 7,    // ei
  'n': (D) => 5 * Math.pow(D, 0.34),    // ei
  'p': (D) => 1.2 * Math.pow(D, 0.45) + 5, // ei
  'r': (D) => Math.pow(D, 0.41) + (D <= 50 ? 3 : 5), // ei (approximation)
  's': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 4;
    return Math.pow(D, 0.44) + 10;
  }, // ei
  't': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 6;
    return Math.pow(D, 0.44) + 16;
  }, // ei
  'u': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 10;
    return Math.pow(D, 0.44) + 20;
  }, // ei
  'v': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 14;
    return Math.pow(D, 0.44) + 28;
  }, // ei
  'x': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 18;
    return Math.pow(D, 0.44) + 40;
  }, // ei
  'y': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 22;
    return Math.pow(D, 0.44) + 50;
  }, // ei
  'z': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 26;
    return Math.pow(D, 0.44) + 60;
  }, // ei
  'za': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 32;
    return Math.pow(D, 0.44) + 80;
  }, // ei
  'zb': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 40;
    return Math.pow(D, 0.44) + 100;
  }, // ei
  'zc': (D) => {
    if (D <= 50) return Math.pow(D, 0.41) + 50;
    return Math.pow(D, 0.44) + 120;
  }, // ei

  // Holes (uppercase) - EI (lower deviation) для A-H, ES (upper deviation) для K-ZC
  'H': (D) => 0, // Lower deviation EI = 0
  'JS': (D) => NaN, // Symmetric (handled separately)
  'G': (D) => 2.5 * Math.pow(D, 0.34), // EI
  'F': (D) => 5.5 * Math.pow(D, 0.41), // EI
  'E': (D) => 11 * Math.pow(D, 0.41),  // EI
  'D': (D) => 16 * Math.pow(D, 0.44),  // EI
  'C': (D) => 52 * Math.pow(D, 0.2),   // EI (approximation)
  'B': (D) => 90 * Math.pow(D, 0.2),   // EI (approximation)
  'A': (D) => 265 * Math.pow(D, 0.2),  // EI (approximation)
  'K': (D) => -0.6 * Math.pow(D, 0.33), // ES
  'M': (D) => -(Math.pow(D, 0.33) + 7), // ES
  'N': (D) => -5 * Math.pow(D, 0.34),   // ES
  'P': (D) => -(1.2 * Math.pow(D, 0.45) + 5), // ES
  'R': (D) => -(Math.pow(D, 0.41) + (D <= 50 ? 3 : 5)), // ES
  'S': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 4);
    return -(Math.pow(D, 0.44) + 10);
  }, // ES
  'T': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 6);
    return -(Math.pow(D, 0.44) + 16);
  }, // ES
  'U': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 10);
    return -(Math.pow(D, 0.44) + 20);
  }, // ES
  'V': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 14);
    return -(Math.pow(D, 0.44) + 28);
  }, // ES
  'X': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 18);
    return -(Math.pow(D, 0.44) + 40);
  }, // ES
  'Y': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 22);
    return -(Math.pow(D, 0.44) + 50);
  }, // ES
  'Z': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 26);
    return -(Math.pow(D, 0.44) + 60);
  }, // ES
  'ZA': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 32);
    return -(Math.pow(D, 0.44) + 80);
  }, // ES
  'ZB': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 40);
    return -(Math.pow(D, 0.44) + 100);
  }, // ES
  'ZC': (D) => {
    if (D <= 50) return -(Math.pow(D, 0.41) + 50);
    return -(Math.pow(D, 0.44) + 120);
  } // ES
};
