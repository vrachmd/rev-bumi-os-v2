import { Delivery, DeliveryStatus } from '../types';
import { canTransition, getValidNextStates } from 'shared-engine/state-machine';

export interface TransitionValidationResult {
  isValid: boolean;
  error?: string;
  allowedNextStatuses: DeliveryStatus[];
}

/**
 * Validates delivery status transition based on operational business prerequisites
 */
export function validateDeliveryTransition(
  delivery: Delivery,
  targetStatus: DeliveryStatus
): TransitionValidationResult {
  const allowedNext = getValidNextStates(delivery.status);

  if (!canTransition(delivery.status, targetStatus)) {
    return {
      isValid: false,
      error: `Invalid transition: Cannot move delivery from ${delivery.status} to ${targetStatus}.`,
      allowedNextStatuses: allowedNext,
    };
  }

  // Domain Rule Checks for specific targets
  switch (targetStatus) {
    case 'LOADING':
      if (!delivery.quarryId || !delivery.vehicleId || !delivery.driverId) {
        return {
          isValid: false,
          error: 'Cannot start loading: Quarry, vehicle, and driver must be assigned.',
          allowedNextStatuses: allowedNext,
        };
      }
      break;

    case 'IN_TRANSIT':
      if (delivery.loadedVolumeM3 <= 0 && (!delivery.weighbridge || delivery.weighbridge.netWeightKg <= 0)) {
        return {
          isValid: false,
          error: 'Cannot dispatch to transit: Loaded volume (m3) or weighbridge scale record is required.',
          allowedNextStatuses: allowedNext,
        };
      }
      break;

    case 'UNLOADED':
      if (delivery.receivedVolumeM3 <= 0 && delivery.receivedWeightKg <= 0) {
        return {
          isValid: false,
          error: 'Cannot mark unloaded: Received volume (m3) or received weight (kg) must be recorded.',
          allowedNextStatuses: allowedNext,
        };
      }
      break;

    case 'POD_SUBMITTED':
      if (!delivery.pod || !delivery.pod.recipientName) {
        return {
          isValid: false,
          error: 'Cannot submit POD: Recipient name and evidence are required.',
          allowedNextStatuses: allowedNext,
        };
      }
      break;

    case 'POD_VERIFIED':
      if (!delivery.reconciliation || delivery.approvedVolumeM3 <= 0) {
        return {
          isValid: false,
          error: 'Cannot verify POD: Quantity reconciliation must be approved with billable volume.',
          allowedNextStatuses: allowedNext,
        };
      }
      break;
  }

  return {
    isValid: true,
    allowedNextStatuses: allowedNext,
  };
}
