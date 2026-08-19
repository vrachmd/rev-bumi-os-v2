import { roundVolume, roundWeight, safeDivide } from '../lib/decimal';
import { VarianceReason, VarianceStatus } from '../types';

export interface QuantityReconciliationParams {
  loadedVolumeM3: number;
  receivedVolumeM3: number;
  tolerancePercent: number;
  sellingPricePerM3: number;
  commercialAdjustmentM3?: number;
  varianceReason?: VarianceReason;
  reviewNotes?: string;
}

export interface QuantityReconciliationResult {
  physicalVarianceM3: number;
  variancePercentage: number;
  tolerancePercentApplied: number;
  varianceStatus: VarianceStatus;
  varianceReason: VarianceReason;
  commercialAdjustmentM3: number;
  finalApprovedVolumeM3: number;
  potentialVarianceValueIdr: number;
  isWithinTolerance: boolean;
  varianceDirection: 'SHORTAGE' | 'EXCESS' | 'EXACT';
}

/**
 * Converts weight in kg to volume in m3 using product density (ton/m3)
 */
export function convertKgToM3(weightKg: number, densityTonPerM3: number): number {
  if (!densityTonPerM3 || densityTonPerM3 <= 0) return 0;
  const weightTon = weightKg / 1000;
  return roundVolume(weightTon / densityTonPerM3);
}

/**
 * Converts volume in m3 to weight in kg using product density (ton/m3)
 */
export function convertM3ToKg(volumeM3: number, densityTonPerM3: number): number {
  if (!densityTonPerM3 || densityTonPerM3 <= 0) return 0;
  const weightTon = volumeM3 * densityTonPerM3;
  return roundWeight(weightTon * 1000);
}

/**
 * Quantity Reconciliation Engine:
 * Reconciles Loaded vs Received volume, tests against contract tolerance,
 * and determines final approved/billable volume and potential commercial variance value.
 */
export function reconcileQuantity(params: QuantityReconciliationParams): QuantityReconciliationResult {
  const loaded = roundVolume(params.loadedVolumeM3 || 0);
  const received = roundVolume(params.receivedVolumeM3 || 0);
  const tolerance = params.tolerancePercent || 2.0;
  const price = params.sellingPricePerM3 || 0;
  const adjustment = roundVolume(params.commercialAdjustmentM3 || 0);

  // Physical variance = Loaded - Received
  const physicalVarianceM3 = roundVolume(loaded - received);
  
  // Variance percentage = (Variance / Loaded) * 100
  const variancePercentage = loaded > 0 
    ? roundVolume((Math.abs(physicalVarianceM3) / loaded) * 100)
    : 0;

  const isWithinTolerance = variancePercentage <= tolerance;

  let varianceDirection: 'SHORTAGE' | 'EXCESS' | 'EXACT' = 'EXACT';
  if (physicalVarianceM3 > 0.001) {
    varianceDirection = 'SHORTAGE';
  } else if (physicalVarianceM3 < -0.001) {
    varianceDirection = 'EXCESS';
  }

  let varianceStatus: VarianceStatus = 'WITHIN_TOLERANCE';
  if (!isWithinTolerance) {
    varianceStatus = 'ABOVE_TOLERANCE';
  }
  if (adjustment !== 0) {
    varianceStatus = 'APPROVED_ADJUSTMENT';
  }

  // Approved volume = Received volume - Commercial adjustment
  const finalApprovedVolumeM3 = roundVolume(Math.max(0, received - adjustment));

  // Potential variance value = |Physical Variance| * Price per m3
  const potentialVarianceValueIdr = Math.round(Math.abs(physicalVarianceM3) * price);

  const varianceReason: VarianceReason = params.varianceReason || 
    (isWithinTolerance ? 'MEASUREMENT_VARIANCE' : 'UNDER_INVESTIGATION');

  return {
    physicalVarianceM3,
    variancePercentage,
    tolerancePercentApplied: tolerance,
    varianceStatus,
    varianceReason,
    commercialAdjustmentM3: adjustment,
    finalApprovedVolumeM3,
    potentialVarianceValueIdr,
    isWithinTolerance,
    varianceDirection,
  };
}

/**
 * Net weight calculation from weighbridge
 */
export function calculateNetWeight(grossKg: number, tareKg: number): { netKg: number; isValid: boolean; error?: string } {
  if (grossKg < 0 || tareKg < 0) {
    return { netKg: 0, isValid: false, error: 'Weight values cannot be negative' };
  }
  if (grossKg < tareKg) {
    return { netKg: 0, isValid: false, error: 'Gross weight must be greater than or equal to Tare weight' };
  }
  const netKg = roundWeight(grossKg - tareKg);
  return { netKg, isValid: true };
}
