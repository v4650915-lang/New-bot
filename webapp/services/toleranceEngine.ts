
import { DIAMETER_STEPS, IT_MULTIPLIERS, FUNDAMENTAL_DEVIATIONS } from './toleranceConstants';
import { PartType, ToleranceResult } from '../types';

/**
 * Finds the geometric mean of a diameter step range
 */
export function getGeometricMean(nominal: number): { mean: number; range: [number, number] } {
  const stepIdx = DIAMETER_STEPS.findIndex((s, i) => nominal > s && (DIAMETER_STEPS[i + 1] === undefined || nominal <= DIAMETER_STEPS[i + 1]));
  const low = DIAMETER_STEPS[stepIdx] || 0;
  const high = DIAMETER_STEPS[stepIdx + 1] || 500;
  // Standard geometric mean for i calculation is sqrt(Dmin * Dmax)
  return { mean: Math.sqrt(low * (high === 0 ? 3 : high)), range: [low, high] };
}

/**
 * Calculates 'i' in micrometers
 */
export function calculateToleranceUnit(D: number): number {
  return 0.45 * Math.pow(D, 1/3) + 0.001 * D;
}

/**
 * Main calculation function
 */
export function calculateTolerance(nominal: number, letter: string, quality: number): ToleranceResult | null {
  if (nominal <= 0 || nominal > 500) return null;

  const isHole = letter === letter.toUpperCase();
  const type = isHole ? PartType.HOLE : PartType.SHAFT;
  const { mean, range } = getGeometricMean(nominal);
  const i = calculateToleranceUnit(mean);
  
  const itMultiplier = IT_MULTIPLIERS[quality];
  if (!itMultiplier) return null;
  const IT = Math.round(itMultiplier * i);

  let es = 0;
  let ei = 0;

  // Symmetrical case JS / js
  if (letter.toLowerCase() === 'js') {
    es = Math.round(IT / 2);
    ei = -Math.round(IT / 2);
  } else {
    const formula = FUNDAMENTAL_DEVIATIONS[letter];
    if (!formula) return null;

    const fundamental = Math.round(formula(mean));

    if (isHole) {
      // HOLE (Uppercase)
      // Для A-H: EI = fundamental, ES = EI + IT
      // Для J, K, M, N, P-ZC: ES = fundamental, EI = ES - IT
      if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(letter)) {
        ei = fundamental;
        es = ei + IT;
      } else {
        es = fundamental;
        ei = es - IT;
      }
    } else {
      // SHAFT (Lowercase)
      // Для a-h: es = fundamental, ei = es - IT
      // Для j, k, m, n, p-zc: ei = fundamental, es = ei + IT
      if (['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].includes(letter)) {
        es = fundamental;
        ei = es - IT;
      } else {
        ei = fundamental;
        es = ei + IT;
      }
    }
  }

  return {
    nominal,
    letter,
    quality,
    type,
    es,
    ei,
    it: IT,
    max: Number((nominal + es / 1000).toFixed(4)),
    min: Number((nominal + ei / 1000).toFixed(4)),
    mean: Number((nominal + (es + ei) / 2000).toFixed(4)),
    range
  };
}

/**
 * Parser for strings like 30k6 or 50H7
 */
export function parseToleranceString(input: string): { nominal: number; letter: string; quality: number } | null {
  const match = input.trim().match(/^(\d+)([a-zA-Z]+)(\d+)$/);
  if (!match) return null;
  
  return {
    nominal: parseFloat(match[1]),
    letter: match[2],
    quality: parseInt(match[3], 10)
  };
}
