// financeReport.ts — DRY HPP single source untuk HppFinanceView & ReportsView
// Sebelumnya duplikat getDynamicCost() di dua file — sekarang 1 sumber.
// Ledger utama tetap cost_records tersimpan (sinkron Dashboard), fungsi ini untuk fallback & rekalkulasi.

import { calculateDeliveryFinance } from '../engine/finance.engine';
import { resolveFreightRate } from './freightRate';
import { resolveQuarryCost } from './quarryCost';

export const OTHER_PER_RIT: Record<string, number> = {
  'proj-04': 100000, // KBS Sunter
  'proj-06': 100000, // KBS Pluit
  'proj-05': 150000, // KBS Legok
  'proj-07': 150000, // KBS Dadap
  'proj-08': 150000, // KBS Bogor
};

export function getOtherPerRit(projectId: string): number {
  return OTHER_PER_RIT[projectId] ?? 100000;
}

// Hitung costRecord dinamis fallback jika ledger belum ada atau perlu rekalkulasi
// (mis. tarif baru, quarry cost baru)
export function getDynamicCost(
  delivery: any,
  deps: {
    contracts: any[];
    products: any[];
    transportVendors: any[];
    freightRates: any[];
    quarryMaterialCosts: any[];
  }
) {
  const contract = deps.contracts.find((c: any) => c.id === delivery.contractId);
  const product = deps.products.find((p: any) => p.id === delivery.productId);
  const vendor = deps.transportVendors.find((v: any) => v.id === delivery.transportVendorId);
  if (!contract || !product || !delivery.approvedVolumeM3) return delivery.costRecord;
  const rate = resolveFreightRate(deps.freightRates as any, {
    transportVendorId: delivery.transportVendorId,
    projectId: contract.projectId,
    quarryId: delivery.quarryId,
    onDate: delivery.scheduledDate,
  });
  if (!rate) return delivery.costRecord;
  const qmc = resolveQuarryCost(deps.quarryMaterialCosts as any, delivery.quarryId, delivery.productId, delivery.scheduledDate);
  const materialCostPerM3 = qmc?.costPerM3 ?? (product as any).defaultMaterialCost;
  const isAllIn = (rate as any).pricingModel === 'ALL_IN';
  const otherPerRit = getOtherPerRit((contract as any).projectId);
  try {
    let res = calculateDeliveryFinance({
      deliveryId: delivery.id,
      approvedVolumeM3: delivery.approvedVolumeM3,
      loadedVolumeM3: delivery.loadedVolumeM3,
      approvedWeightKg: delivery.approvedWeightKg,
      sellingPricePerM3: (contract as any).unitPricePerM3,
      materialCostPerM3,
      freightPricingModel: isAllIn ? 'ALL_IN' : (((vendor as any)?.defaultPricingModel as any) || (rate as any).pricingModel as any),
      freightRatePerUnit: (rate as any).ratePerUnit,
      allInPricePerM3: isAllIn ? (rate as any).ratePerUnit : undefined,
      allInVolumeBasis: isAllIn ? 'PER_M3_RECEIVED' : undefined,
      otherOperationalCostPerM3: 0,
      tollFee: isAllIn ? 0 : ((rate as any).tollFee as any) || 0,
      loadingFee: isAllIn ? 0 : ((rate as any).loadingFee as any) || 0,
      unloadingFee: isAllIn ? 0 : ((rate as any).unloadingFee as any) || 0,
      isActualFinalized: true,
    });
    res.costRecord.otherOperationalCostIdr = otherPerRit;
    res.costRecord.totalHppIdr = res.costRecord.totalMaterialCostIdr + res.costRecord.totalFreightCostIdr + otherPerRit;
    res.costRecord.grossProfitIdr = res.costRecord.recognizedRevenueIdr - res.costRecord.totalHppIdr;
    res.costRecord.grossMarginPercent = res.costRecord.recognizedRevenueIdr > 0 ? Number(((res.costRecord.grossProfitIdr / res.costRecord.recognizedRevenueIdr) * 100).toFixed(2)) : 0;
    return res.costRecord;
  } catch {
    return delivery.costRecord;
  }
}

export function aggregateFinance(deliveries: any[]) {
  const totalApprovedVol = deliveries.reduce((s, d) => s + (d.approvedVolumeM3 || 0), 0);
  const totalNetWeightTons = deliveries.reduce((s, d) => s + (d.approvedWeightKg || 0), 0) / 1000;
  const totalRevenue = deliveries.reduce((s, d) => s + (d.costRecord?.recognizedRevenueIdr || 0), 0);
  const totalHpp = deliveries.reduce((s, d) => s + (d.costRecord?.totalHppIdr || 0), 0);
  const totalGrossProfit = totalRevenue - totalHpp;
  const avgGrossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const varianceExceededCount = deliveries.filter((d) => d.reconciliation?.varianceStatus === 'ABOVE_TOLERANCE').length;
  return { totalApprovedVol, totalNetWeightTons, totalRevenue, totalHpp, totalGrossProfit, avgGrossMargin, varianceExceededCount };
}

// Rekalkulasi HPP untuk periode tertentu — dipakai tombol Rekalkulasi di HPP view
export function recalcHppForDeliveries(
  deliveries: any[],
  deps: {
    contracts: any[];
    products: any[];
    transportVendors: any[];
    freightRates: any[];
    quarryMaterialCosts: any[];
  }
): Map<string, any> {
  const map = new Map<string, any>();
  for (const d of deliveries) {
    if (!d.approvedVolumeM3) continue;
    const cost = getDynamicCost(d, deps);
    if (cost) map.set(d.id, cost);
  }
  return map;
}
