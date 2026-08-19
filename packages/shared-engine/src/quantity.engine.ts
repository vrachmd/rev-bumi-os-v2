import { VarianceStatus, VarianceReason } from 'shared-types'

export function convertWeightToVolume(
  grossKg: number,
  tareKg: number,
  densityTonPerM3: number
): number {
  const nettoTon = (grossKg - tareKg) / 1000
  return nettoTon / densityTonPerM3
}

export function convertKgToM3(weightKg: number, densityTonPerM3: number): number {
  if (!densityTonPerM3 || densityTonPerM3 <= 0) return 0
  const weightTon = weightKg / 1000
  return Number((weightTon / densityTonPerM3).toFixed(2))
}

export function convertM3ToKg(volumeM3: number, densityTonPerM3: number): number {
  if (!densityTonPerM3 || densityTonPerM3 <= 0) return 0
  const weightTon = volumeM3 * densityTonPerM3
  return Math.round(weightTon * 1000)
}

export interface QuantityReconciliationParams {
  loadedVolumeM3: number
  receivedVolumeM3: number
  tolerancePercent: number
  sellingPricePerM3: number
  commercialAdjustmentM3?: number
  varianceReason?: VarianceReason
  reviewNotes?: string
}

export interface QuantityReconciliationResult {
  physicalVarianceM3: number
  variancePercentage: number
  tolerancePercentApplied: number
  varianceStatus: VarianceStatus
  varianceReason: VarianceReason
  commercialAdjustmentM3: number
  finalApprovedVolumeM3: number
  potentialVarianceValueIdr: number
  isWithinTolerance: boolean
  varianceDirection: 'SHORTAGE' | 'EXCESS' | 'EXACT'
}

export function reconcileQuantity(params: QuantityReconciliationParams): QuantityReconciliationResult {
  const loaded = Number((params.loadedVolumeM3 || 0).toFixed(2))
  const received = Number((params.receivedVolumeM3 || 0).toFixed(2))
  const tolerance = params.tolerancePercent || 2.0
  const price = params.sellingPricePerM3 || 0
  const adjustment = Number((params.commercialAdjustmentM3 || 0).toFixed(2))
  const physicalVarianceM3 = Number((loaded - received).toFixed(2))
  const variancePercentage = loaded > 0 ? Number(((Math.abs(physicalVarianceM3) / loaded) * 100).toFixed(2)) : 0
  const isWithinTolerance = variancePercentage <= tolerance
  let varianceDirection: 'SHORTAGE' | 'EXCESS' | 'EXACT' = 'EXACT'
  if (physicalVarianceM3 > 0.001) varianceDirection = 'SHORTAGE'
  else if (physicalVarianceM3 < -0.001) varianceDirection = 'EXCESS'
  let varianceStatus: VarianceStatus = isWithinTolerance ? 'WITHIN_TOLERANCE' : 'ABOVE_TOLERANCE'
  if (adjustment !== 0) varianceStatus = 'APPROVED_ADJUSTMENT'
  const finalApprovedVolumeM3 = Number(Math.max(0, received - adjustment).toFixed(2))
  const potentialVarianceValueIdr = Math.round(Math.abs(physicalVarianceM3) * price)
  const varianceReason: VarianceReason = params.varianceReason || (isWithinTolerance ? 'MEASUREMENT_VARIANCE' : 'UNDER_INVESTIGATION')
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
  }
}

export function calculateNetWeight(grossKg: number, tareKg: number): { netKg: number; isValid: boolean; error?: string } {
  if (grossKg < 0 || tareKg < 0) return { netKg: 0, isValid: false, error: 'Weight values cannot be negative' }
  if (grossKg < tareKg) return { netKg: 0, isValid: false, error: 'Gross weight must be greater than or equal to Tare weight' }
  return { netKg: grossKg - tareKg, isValid: true }
}

export function calculateVolumeFromDimensions(
  length: number,
  width: number,
  height: number
): number {
  return length * width * height
}

export function calculateVariance(
  loadedM3: number,
  receivedM3: number
): { varianceM3: number; variancePercent: number } {
  const varianceM3 = loadedM3 - receivedM3
  const variancePercent = (varianceM3 / loadedM3) * 100
  return { varianceM3, variancePercent }
}

export function evaluateTolerance(
  variancePercent: number,
  tolerancePercent: number
): VarianceStatus {
  const isWithin = Math.abs(variancePercent) <= tolerancePercent
  return isWithin ? 'WITHIN_TOLERANCE' : 'ABOVE_TOLERANCE'
}

export function calculatePenaltyVolume(
  varianceM3: number,
  variancePercent: number,
  tolerancePercent: number
): number {
  if (Math.abs(variancePercent) <= tolerancePercent) return 0
  const excessPercent = Math.abs(variancePercent) - tolerancePercent
  return (excessPercent / 100) * varianceM3
}