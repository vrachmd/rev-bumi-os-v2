import { describe, it, expect } from 'vitest';
import { calculateFreightCost, calculateVendorPenalty } from './freight.engine';

describe('freight.engine', () => {
  it('PER_M3 35000 * 15 m³ = 525000', () => {
    expect(calculateFreightCost('PER_M3', 35000, 15, 0, 1)).toBe(525000);
  });
  it('PER_TRIP 900000 * 1 trip = 900000', () => {
    expect(calculateFreightCost('PER_TRIP', 900000, 0, 0, 1)).toBe(900000);
  });
  it('PER_TON 28000 * 24 ton = 672000', () => {
    expect(calculateFreightCost('PER_TON', 28000, 0, 24, 1)).toBe(672000);
  });
  it('ALL_IN = 0', () => {
    expect(calculateFreightCost('ALL_IN', 345000, 24, 0, 1)).toBe(0);
  });
  it('vendor penalty 0 when within tolerance', () => {
    expect(calculateVendorPenalty(0.3, 2, 2, 35000)).toBe(0);
  });
  it('vendor penalty >0 when above tolerance', () => {
    expect(calculateVendorPenalty(0.36, 2.4, 2, 35000)).toBeGreaterThan(0);
  });
});
