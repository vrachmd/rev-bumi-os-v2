import { DeliveryStatus } from 'shared-types'

const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PLANNED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['LOADING', 'CANCELLED'],
  LOADING: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['UNLOADED', 'CANCELLED'],
  UNLOADED: ['POD_SUBMITTED', 'CANCELLED'],
  POD_SUBMITTED: ['POD_VERIFIED', 'REJECTED'],
  POD_VERIFIED: ['DELIVERED', 'REJECTED'],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: []
}

export function canTransition(
  from: DeliveryStatus,
  to: DeliveryStatus
): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) || false
}

export function getValidNextStates(status: DeliveryStatus): DeliveryStatus[] {
  return STATUS_TRANSITIONS[status] || []
}

export function getStatusLabel(status: DeliveryStatus): string {
  const labels: Record<DeliveryStatus, string> = {
    PLANNED: 'Direncanakan',
    SCHEDULED: 'Terjadwal',
    LOADING: 'Loading',
    IN_TRANSIT: 'Di Jalan',
    ARRIVED: 'Tiba di Site',
    UNLOADED: 'Bongkar',
    POD_SUBMITTED: 'e-POD Diajukan',
    POD_VERIFIED: 'e-POD Diverifikasi',
    DELIVERED: 'Selesai',
    REJECTED: 'Ditolak',
    CANCELLED: 'Dibatalkan'
  }
  return labels[status] || status
}

export function getStatusColor(status: DeliveryStatus): string {
  const colors: Record<DeliveryStatus, string> = {
    PLANNED: 'gray',
    SCHEDULED: 'blue',
    LOADING: 'orange',
    IN_TRANSIT: 'purple',
    ARRIVED: 'cyan',
    UNLOADED: 'amber',
    POD_SUBMITTED: 'indigo',
    POD_VERIFIED: 'green',
    DELIVERED: 'emerald',
    REJECTED: 'red',
    CANCELLED: 'slate'
  }
  return colors[status] || 'gray'
}