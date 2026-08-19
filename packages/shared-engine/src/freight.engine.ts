import { PricingModel } from 'shared-types'
import { calculatePenaltyVolume } from './quantity.engine'

export function calculateFreightCost(
  pricingModel: PricingModel,
  rate: number,
  volumeM3: number,
  weightTon: number,
  tripCount: number
): number {
  switch (pricingModel) {
    case 'PER_TRIP': return rate * tripCount
    case 'PER_M3': return rate * volumeM3
    case 'PER_TON': return rate * weightTon
    case 'ALL_IN':
      // Harga all-in sudah mencakup material + angkut; tidak ada biaya freight terpisah.
      return 0
    default: return 0
  }
}

export function calculateVendorPenalty(
  varianceM3: number,
  variancePercent: number,
  tolerancePercent: number,
  ratePerM3: number
): number {
  if (Math.abs(variancePercent) <= tolerancePercent) return 0
  const penaltyVolume = calculatePenaltyVolume(varianceM3, variancePercent, tolerancePercent)
  return penaltyVolume * ratePerM3
}