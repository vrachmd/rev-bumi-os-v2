import { round, roundCurrency, safeDivide } from '../lib/decimal';
import { AllInVolumeBasis, CostRecord, FreightPricingModel } from '../types';
import { calculateFreightCost } from './freight.engine';

export interface DeliveryFinancialParams {
  deliveryId: string;
  approvedVolumeM3: number;
  loadedVolumeM3?: number;
  approvedWeightKg?: number;
  sellingPricePerM3: number;
  materialCostPerM3: number;
  freightPricingModel: FreightPricingModel;
  freightRatePerUnit: number;
  allInPricePerM3?: number;
  allInVolumeBasis?: AllInVolumeBasis;
  otherOperationalCostPerM3?: number;
  tollFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  isActualFinalized?: boolean;
}

export interface FinancialSummaryResult {
  revenueIdr: number;
  materialCostIdr: number;
  freightCostIdr: number;
  otherOperationalCostIdr: number;
  totalHppIdr: number;
  hppPerM3: number;
  grossProfitIdr: number;
  grossMarginPercent: number;
  costRecord: CostRecord;
}

/**
 * Financial & HPP Engine:
 * Core business engine calculating Revenue, Material Cost, Freight, HPP, Gross Profit, and Margins.
 */
export function calculateDeliveryFinance(params: DeliveryFinancialParams): FinancialSummaryResult {
  const {
    deliveryId,
    approvedVolumeM3 = 0,
    loadedVolumeM3,
    approvedWeightKg = 0,
    sellingPricePerM3 = 0,
    materialCostPerM3 = 0,
    freightPricingModel,
    freightRatePerUnit = 0,
    allInPricePerM3 = 0,
    allInVolumeBasis,
    otherOperationalCostPerM3 = 0,
    tollFee = 0,
    loadingFee = 0,
    unloadingFee = 0,
    isActualFinalized = false,
  } = params;

  const isAllIn = freightPricingModel === 'ALL_IN';

  // 1. Recognized Revenue = Approved Volume m3 * Contract Selling Price per m3 (hanya yang ditagih)
  const revenueIdr = roundCurrency(approvedVolumeM3 * sellingPricePerM3);

  // 2. Material Cost — untuk non ALL_IN, HPP material = Quarry * m3 LOADING (sesuai permintaan user),
  //    untuk ALL_IN, pakai approved (all-in sudah termasuk susut).
  const volumeForMaterial = isAllIn ? approvedVolumeM3 : (loadedVolumeM3 ?? approvedVolumeM3);
  const effectiveMaterialCostPerM3 = isAllIn ? allInPricePerM3 : materialCostPerM3;
  const materialCostIdr = roundCurrency(volumeForMaterial * effectiveMaterialCostPerM3);

  // 3. Freight Cost — untuk non ALL_IN, ongkos angkut dibayar per m3/rit yang TERIMA (approved),
  //    bukan loading, agar tidak double-count susut. ALL_IN freight 0.
  const volumeForFreight = approvedVolumeM3;
  const weightForFreight = approvedWeightKg;
  const freightResult = calculateFreightCost({
    pricingModel: freightPricingModel,
    ratePerUnit: freightRatePerUnit,
    approvedVolumeM3: volumeForFreight,
    approvedWeightKg: weightForFreight,
    tollFee,
    loadingFee,
    unloadingFee,
  });
  const freightCostIdr = freightResult.totalFreightCostIdr;

  // 4. Other operational cost — ikut approved (site handling)
  const otherOperationalCostIdr = roundCurrency(approvedVolumeM3 * otherOperationalCostPerM3);

  // 5. Total HPP = Material Cost + Freight Cost + Other Cost
  const totalHppIdr = roundCurrency(materialCostIdr + freightCostIdr + otherOperationalCostIdr);

  const hppPerM3 = approvedVolumeM3 > 0
    ? roundCurrency(safeDivide(totalHppIdr, approvedVolumeM3))
    : 0;

  // 6. Gross Profit = Recognized Revenue - Total HPP
  const grossProfitIdr = roundCurrency(revenueIdr - totalHppIdr);

  // 7. Gross Margin % = (Gross Profit / Revenue) * 100
  const grossMarginPercent = revenueIdr > 0
    ? round(safeDivide(grossProfitIdr, revenueIdr) * 100, 2)
    : 0;

  const costRecord: CostRecord = {
    id: `cost-${deliveryId}`,
    deliveryId,
    billableQuantityM3: approvedVolumeM3,
    sellingPricePerM3,
    recognizedRevenueIdr: revenueIdr,
    materialCostPerM3: effectiveMaterialCostPerM3,
    totalMaterialCostIdr: materialCostIdr,
    freightRatePerUnit,
    freightPricingModel,
    pricingBasis: isAllIn ? 'ALL_IN' : 'SPLIT',
    allInPricePerM3: isAllIn ? allInPricePerM3 : undefined,
    allInVolumeBasis: isAllIn ? (allInVolumeBasis ?? 'PER_M3_RECEIVED') : undefined,
    totalFreightCostIdr: freightCostIdr,
    otherOperationalCostIdr,
    totalHppIdr,
    grossProfitIdr,
    grossMarginPercent,
    isActualFinalized,
  };

  return {
    revenueIdr,
    materialCostIdr,
    freightCostIdr,
    otherOperationalCostIdr,
    totalHppIdr,
    hppPerM3,
    grossProfitIdr,
    grossMarginPercent,
    costRecord,
  };
}
