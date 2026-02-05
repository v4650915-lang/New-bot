export enum AppMode {
  CALCULATOR = 'CALCULATOR',
  ENGINEERING = 'ENGINEERING',
  G_CODE = 'G_CODE'
}

export interface CalculationHistory {
  expression: string;
  result: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum PartType {
  HOLE = 'HOLE',
  SHAFT = 'SHAFT'
}

export interface ToleranceResult {
  nominal: number;
  letter: string;
  quality: number;
  type: PartType;
  es: number; // Upper deviation in micrometers
  ei: number; // Lower deviation in micrometers
  it: number; // Tolerance width in micrometers
  max: number; // Max size in mm
  min: number; // Min size in mm
  mean: number; // Mean size in mm
  range: [number, number]; // Diameter range [min, max]
}

export interface FitResult {
  nominal: number;
  hole: ToleranceResult;
  shaft: ToleranceResult;
  maxClearance?: number;
  minClearance?: number;
  maxInterference?: number;
  minInterference?: number;
  fitType: 'clearance' | 'interference' | 'transition';
}
