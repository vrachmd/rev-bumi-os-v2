import { roundCurrency, safeDivide } from '../lib/decimal';
import { FreightPricingModel } from '../types';

export interface FreightCalculationParams {
  pricingModel: FreightPricingModel;
  ratePerUnit: number;
  approvedVolumeM3: number;
  approvedWeightKg?: number;
  tollFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  tripCount?: number;
}

export interface FreightCalculationResult {
  totalFreightCostIdr: number;
  effectiveFreightCostPerM3: number;
  effectiveFreightCostPerTon: number;
  breakdown: {
    baseCost: number;
    tollFee: number;
    loadingFee: number;
    unloadingFee: number;
  };
}

/**
 * Freight Engine:
 * Computes exact transport costs across all 5 logistics contract models.
 */
export function calculateFreightCost(params: FreightCalculationParams): FreightCalculationResult {
  const {
    pricingModel,
    ratePerUnit = 0,
    approvedVolumeM3 = 0,
    approvedWeightKg = 0,
    tollFee = 0,
    loadingFee = 0,
    unloadingFee = 0,
    tripCount = 1,
  } = params;

  let baseCost = 0;
  const approvedTon = approvedWeightKg > 0 ? approvedWeightKg / 1000 : 0;

  switch (pricingModel) {
    case 'PER_TRIP':
      baseCost = ratePerUnit * tripCount;
      break;

    case 'PER_TON':
      baseCost = ratePerUnit * approvedTon;
      break;

    case 'PER_M3':
      baseCost = ratePerUnit * approvedVolumeM3;
      break;

    case 'ROUTE_BASED':
      // Route rate applies per trip on defined quarry -> project route
      baseCost = ratePerUnit * tripCount;
      break;

    case 'HYBRID':
      baseCost = ratePerUnit * tripCount;
      break;

    case 'ALL_IN':
      // Harga all-in sudah mencakup material + angkut. Tidak ada biaya freight terpisah.
      baseCost = 0;
      break;

    default:
      baseCost = ratePerUnit * tripCount;
  }

  const totalAdditional = tollFee + loadingFee + unloadingFee;
  const totalFreightCostIdr = roundCurrency(baseCost + totalAdditional);

  const effectiveFreightCostPerM3 = approvedVolumeM3 > 0
    ? roundCurrency(safeDivide(totalFreightCostIdr, approvedVolumeM3))
    : 0;

  const effectiveFreightCostPerTon = approvedTon > 0
    ? roundCurrency(safeDivide(totalFreightCostIdr, approvedTon))
    : 0;

  return {
    totalFreightCostIdr,
    effectiveFreightCostPerM3,
    effectiveFreightCostPerTon,
    breakdown: {
      baseCost: roundCurrency(baseCost),
      tollFee: roundCurrency(tollFee),
      loadingFee: roundCurrency(loadingFee),
      unloadingFee: roundCurrency(unloadingFee),
    },
  };
}
