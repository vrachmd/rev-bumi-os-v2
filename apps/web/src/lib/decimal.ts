/**
 * High precision monetary & numeric rounding utilities
 * Prevents floating point drift in financial calculations
 */

export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function roundVolume(value: number): number {
  return round(value, 2);
}

export function roundWeight(value: number): number {
  return round(value, 2);
}

export function roundCurrency(value: number): number {
  return Math.round(value);
}

export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (!denominator || denominator === 0 || isNaN(denominator)) {
    return fallback;
  }
  return numerator / denominator;
}
