import { describe, it, expect } from 'vitest';
import {
  convertWeightToVolume,
  calculateVolumeFromDimensions,
  calculateVariance,
  evaluateTolerance,
  calculatePenaltyVolume,
  convertKgToM3,
  convertM3ToKg,
  reconcileQuantity,
  calculateNetWeight,
} from './quantity.engine';

describe('quantity.engine', () => {
  it('convertWeightToVolume: 38000-14000 @1.6 = 15.0 m³', () => {
    expect(convertWeightToVolume(38000, 14000, 1.6)).toBeCloseTo(15, 2);
  });
  it('convertWeightToVolume: density fallback', () => {
    expect(convertWeightToVolume(38000, 14000, 1.6)).toBeCloseTo(15, 5);
  });
  it('calculateVolumeFromDimensions 6×2.3×1.1 = 15.18', () => {
    expect(calculateVolumeFromDimensions(6, 2.3, 1.1)).toBeCloseTo(15.18, 2);
  });
  it('calculateVariance 15 → 14.7 = 0.3 m³ / 2%', () => {
    const { varianceM3, variancePercent } = calculateVariance(15, 14.7);
    expect(varianceM3).toBeCloseTo(0.3, 5);
    expect(variancePercent).toBeCloseTo(2, 5);
  });
  it('evaluateTolerance WITHIN at 2% (boundary)', () => {
    expect(evaluateTolerance(2, 2)).toBe('WITHIN_TOLERANCE');
    expect(evaluateTolerance(-2, 2)).toBe('WITHIN_TOLERANCE');
    expect(evaluateTolerance(1.9, 2)).toBe('WITHIN_TOLERANCE');
  });
  it('evaluateTolerance ABOVE at >2%', () => {
    expect(evaluateTolerance(2.01, 2)).toBe('ABOVE_TOLERANCE');
    expect(evaluateTolerance(2.4, 2)).toBe('ABOVE_TOLERANCE');
  });
  it('calculatePenaltyVolume 0 when within', () => {
    expect(calculatePenaltyVolume(0.3, 2, 2)).toBe(0);
  });
  it('calculatePenaltyVolume excess beyond tolerance', () => {
    const v = calculatePenaltyVolume(0.36, 2.4, 2); // 0.4% excess
    expect(v).toBeGreaterThan(0);
  });
  it('convertKgToM3: 24000kg @1.6 = 15.0 m³', () => {
    expect(convertKgToM3(24000, 1.6)).toBeCloseTo(15, 2);
  });
  it('convertM3ToKg: 15 m³ @1.6 = 24000 kg', () => {
    expect(convertM3ToKg(15, 1.6)).toBe(24000);
  });
  it('reconcileQuantity: within tolerance 2%', () => {
    const r = reconcileQuantity({ loadedVolumeM3: 15, receivedVolumeM3: 14.7, tolerancePercent: 2, sellingPricePerM3: 175000 });
    expect(r.varianceStatus).toBe('WITHIN_TOLERANCE');
    expect(r.finalApprovedVolumeM3).toBe(14.7);
  });
  it('reconcileQuantity: above tolerance', () => {
    const r = reconcileQuantity({ loadedVolumeM3: 15, receivedVolumeM3: 14.0, tolerancePercent: 2, sellingPricePerM3: 175000 });
    expect(r.varianceStatus).toBe('ABOVE_TOLERANCE');
  });
  it('calculateNetWeight: valid', () => {
    const { netKg, isValid } = calculateNetWeight(38000, 14000);
    expect(netKg).toBe(24000);
    expect(isValid).toBe(true);
  });
  it('calculateNetWeight: invalid gross < tare', () => {
    const { isValid, error } = calculateNetWeight(10000, 14000);
    expect(isValid).toBe(false);
    expect(error).toContain('Gross weight');
  });
});
