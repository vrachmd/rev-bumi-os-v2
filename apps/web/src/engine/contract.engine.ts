import { round, roundVolume, safeDivide } from '../lib/decimal';
import { Contract, Delivery } from '../types';

export interface ContractFulfillmentMetrics {
  contractId: string;
  contractNumber: string;
  contractedVolumeM3: number;
  totalApprovedVolumeM3: number;
  totalLoadedVolumeM3: number;
  remainingVolumeM3: number;
  fulfillmentPercent: number;
  isOverDelivered: boolean;
  overDeliveredVolumeM3: number;
  contractStatus: 'HEALTHY' | 'NEARING_LIMIT' | 'EXHAUSTED' | 'OVER_DELIVERED';
  totalRevenueRecognizedIdr: number;
  deliveryCount: number;
}

/**
 * Contract Engine:
 * Evaluates real-time contract fulfillment derived strictly from approved delivery quantities.
 */
export function evaluateContractFulfillment(
  contract: Contract,
  deliveries: Delivery[]
): ContractFulfillmentMetrics {
  // Filter deliveries belonging to this contract that are approved/delivered
  const contractDeliveries = deliveries.filter(
    (d) => d.contractId === contract.id && d.status !== 'CANCELLED' && d.status !== 'REJECTED'
  );

  let totalApprovedVolumeM3 = 0;
  let totalLoadedVolumeM3 = 0;

  for (const delivery of contractDeliveries) {
    totalLoadedVolumeM3 += delivery.loadedVolumeM3 || 0;
    // For delivered or pod_verified items, use approvedVolumeM3
    if (delivery.status === 'DELIVERED' || delivery.status === 'POD_VERIFIED') {
      totalApprovedVolumeM3 += delivery.approvedVolumeM3 || 0;
    }
  }

  totalApprovedVolumeM3 = roundVolume(totalApprovedVolumeM3);
  totalLoadedVolumeM3 = roundVolume(totalLoadedVolumeM3);

  const isNonPo = contract.contractType === 'NON_PO';

  // NON_PO: pengiriman rutin tanpa target volume/tonase -> tidak ada evaluasi fulfillment.
  if (isNonPo) {
    const totalRevenueRecognizedIdr = Math.round(totalApprovedVolumeM3 * contract.unitPricePerM3);
    return {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      contractedVolumeM3: 0,
      totalApprovedVolumeM3,
      totalLoadedVolumeM3,
      remainingVolumeM3: 0,
      fulfillmentPercent: 0,
      isOverDelivered: false,
      overDeliveredVolumeM3: 0,
      contractStatus: 'HEALTHY',
      totalRevenueRecognizedIdr,
      deliveryCount: contractDeliveries.length,
    };
  }

  const contractedM3 = contract.contractedVolumeM3 || 1;
  const fulfillmentPercent = round(safeDivide(totalApprovedVolumeM3, contractedM3) * 100, 2);
  const remainingVolumeM3 = roundVolume(contractedM3 - totalApprovedVolumeM3);

  const isOverDelivered = totalApprovedVolumeM3 > contractedM3;
  const overDeliveredVolumeM3 = isOverDelivered
    ? roundVolume(totalApprovedVolumeM3 - contractedM3)
    : 0;

  let contractStatus: 'HEALTHY' | 'NEARING_LIMIT' | 'EXHAUSTED' | 'OVER_DELIVERED' = 'HEALTHY';
  if (isOverDelivered) {
    contractStatus = 'OVER_DELIVERED';
  } else if (fulfillmentPercent >= 100) {
    contractStatus = 'EXHAUSTED';
  } else if (fulfillmentPercent >= 85) {
    contractStatus = 'NEARING_LIMIT';
  }

  const totalRevenueRecognizedIdr = Math.round(totalApprovedVolumeM3 * contract.unitPricePerM3);

  return {
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    contractedVolumeM3: contractedM3,
    totalApprovedVolumeM3,
    totalLoadedVolumeM3,
    remainingVolumeM3,
    fulfillmentPercent,
    isOverDelivered,
    overDeliveredVolumeM3,
    contractStatus,
    totalRevenueRecognizedIdr,
    deliveryCount: contractDeliveries.length,
  };
}
