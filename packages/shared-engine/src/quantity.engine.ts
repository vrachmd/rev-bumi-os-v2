import { VarianceStatus } from 'shared-types'

export function convertWeightToVolume(
  grossKg: number,
  tareKg: number,
  densityTonPerM3: number
): number {
  const nettoTon = (grossKg - tareKg) / 1000
  return nettoTon / densityTonPerM3
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