import { Contract } from 'shared-types'

export function checkContractProgress(contract: Contract): {
  delivered: number
  remaining: number
  percentage: number
} {
  const delivered = contract.deliveredVolumeM3
  const remaining = Math.max(0, contract.totalTargetVolumeM3 - delivered)
  const percentage = (delivered / contract.totalTargetVolumeM3) * 100
  return { delivered, remaining, percentage }
}

export function validateOverDelivery(
  contract: Contract,
  additionalM3: number
): { allowed: boolean; warning?: string } {
  const newTotal = contract.deliveredVolumeM3 + additionalM3
  const isOver = newTotal > contract.totalTargetVolumeM3

  if (!isOver) return { allowed: true }

  switch (contract.overDeliveryPolicy) {
    case 'ALLOWED':
      return { allowed: true }
    case 'WARNING':
      return { allowed: true, warning: 'Melebihi target kontrak' }
    case 'REQUIRES_APPROVAL':
      return { allowed: false, warning: 'Memerlukan persetujuan manajemen' }
    case 'BLOCKED':
      return { allowed: false, warning: 'Over-delivery tidak diizinkan' }
    default:
      return { allowed: false }
  }
}