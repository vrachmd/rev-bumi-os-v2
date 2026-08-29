import type { DeliveryStatus } from 'shared-types';

export type MobileRole = 'QUARRY_CHECKER' | 'SITE_CHECKER' | 'MANAGEMENT';

export type MobileVendorSupplyType = 'TRANSPORT_ONLY' | 'MATERIAL_AND_TRANSPORT';

export type MobileFreightPricingModel =
  | 'PER_TRIP'
  | 'PER_TON'
  | 'PER_M3'
  | 'ROUTE_BASED'
  | 'HYBRID'
  | 'ALL_IN';

export interface FieldProfile {
  name: string;
  role: MobileRole;
}

export interface PickItem {
  id: string;
  name: string;
  detail: string;
  gps?: { lat: number; lng: number };
}

export interface VendorItem extends PickItem {
  supplyType?: MobileVendorSupplyType;
}

export interface VehicleItem extends PickItem {
  vendorId: string;
}

export interface ContractItem extends PickItem {
  contractNumber: string;
  projectId: string;
  unitPricePerM3: number;
}

export interface FreightRateItem {
  id: string;
  vendorId: string;
  quarryId: string;
  projectId: string;
  pricingModel: MobileFreightPricingModel;
  ratePerUnit: number;
  tollFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  effectiveDate?: string;
  isActive?: boolean;
}

export interface CostRecordMobile {
  deliveryId: string;
  billableQuantityM3: number;
  sellingPricePerM3: number;
  recognizedRevenueIdr: number;
  materialCostPerM3: number;
  totalMaterialCostIdr: number;
  freightRatePerUnit: number;
  freightPricingModel: MobileFreightPricingModel;
  totalFreightCostIdr: number;
  otherOperationalCostIdr: number;
  totalHppIdr: number;
  grossProfitIdr: number;
  grossMarginPercent: number;
}

export interface DeliveryItem {
  id: string;
  deliveryNumber: string;
  contractId: string;
  productId: string;
  quarryId: string;
  transportVendorId: string;
  vehicleId: string;
  driverName: string;
  driverPhone: string;
  plateNumber: string;
  status: DeliveryStatus;
  scheduledAt: string;
  createdAt: string;

  loadingMethod?: 'WEIGHBRIDGE' | 'DIMENSION';
  grossKg?: number;
  tareKg?: number;
  loadedVolumeM3: number;
  loadedWeightKg?: number;
  approvedVolumeM3?: number;
  approvedWeightKg?: number;
  densityApplied?: number;
  measurementMode?: 'ACTUAL_MEASURED' | 'CALCULATED_FROM_WEIGHT' | 'ESTIMATED';
  dimension?: { lengthM: number; widthM: number; heightM: number };

  receivedVolumeM3?: number;
  receivedWeightKg?: number;
  receivedAt?: string;
  gps?: { lat: number; lng: number; accuracy?: number };
  quarryCheckerName?: string;

  signatureQuarry?: string;
  signatureDriver?: string;
  signatureSite?: string;
  signatureDriverQuarry?: string;
  evidenceAt?: string;
  photoUri?: string;
  evidenceGps?: { lat: number; lng: number };
  evidencePlace?: string;
  sjImci?: string;
  deliveredAt?: string;

  varianceM3?: number;
  variancePercent?: number;
  costRecord?: CostRecordMobile;
}

export type QuarryLoadingInput =
  | {
      method: 'WEIGHBRIDGE';
      grossKg: number;
      tareKg: number;
      densityTonPerM3: number;
      signature: string;
      evidenceAt: string;
      photoUri: string;
      evidenceGps: { lat: number; lng: number };
      evidencePlace?: string;
      sjImci?: string;
    }
  | {
      method: 'DIMENSION';
      lengthM: number;
      widthM: number;
      heightM: number;
      signature: string;
      evidenceAt: string;
      photoUri: string;
      evidenceGps: { lat: number; lng: number };
      evidencePlace?: string;
      sjImci?: string;
    };

export interface UnloadingInput {
  receivedVolumeM3: number;
  gps: { lat: number; lng: number };
  signatureSite: string;
}

export interface AuditLogItem {
  id: string;
  actor: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'RITASE' | 'VENDOR' | 'VEHICLE';
  entityId: string;
  timestamp: string;
  reason?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export type RootTabParamList = {
  Dashboard: undefined;
  Quarry: undefined;
  Site: undefined;
  Rekonsil: undefined;
  Finance: undefined;
};

export interface QuarryMaterialCost {
  quarryId: string;
  productId: string;
  density: number | null;
  costPerM3: number;
  effectiveDate?: string;
}

export interface MobileMasterBundle {
  products: PickItem[];
  quarries: PickItem[];
  vendors: VendorItem[];
  vehicles: VehicleItem[];
  contracts: ContractItem[];
  freightRates: FreightRateItem[];
  quarryMaterialCosts: QuarryMaterialCost[];
}

export interface MobileSyncResult {
  deliveryId: string;
  tables: { table: string; ok: boolean; error?: string }[];
}