export type Role =
  | 'SUPER_ADMIN'
  | 'MANAGEMENT'
  | 'OPERATIONS'
  | 'COMMERCIAL'
  | 'FINANCE'
  | 'DISPATCHER'
  | 'QUARRY_CHECKER'
  | 'SITE_CHECKER'
  | 'VIEWER';

export type DeliveryStatus =
  | 'PLANNED'
  | 'SCHEDULED'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'UNLOADED'
  | 'POD_SUBMITTED'
  | 'POD_VERIFIED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export type VarianceStatus =
  | 'WITHIN_TOLERANCE'
  | 'ABOVE_TOLERANCE'
  | 'REQUIRES_REVIEW'
  | 'APPROVED_ADJUSTMENT'
  | 'RESOLVED';

export type VarianceReason =
  | 'PHYSICAL_LOSS'
  | 'MEASUREMENT_VARIANCE'
  | 'MOISTURE_VARIANCE'
  | 'DENSITY_VARIANCE'
  | 'LOADING_VARIANCE'
  | 'RECEIVING_VARIANCE'
  | 'COMMERCIAL_ADJUSTMENT'
  | 'DATA_ERROR'
  | 'UNDER_INVESTIGATION'
  | 'OTHER';

export type FreightPricingModel =
  | 'PER_TRIP'
  | 'PER_TON'
  | 'PER_M3'
  | 'ROUTE_BASED'
  | 'HYBRID'
  | 'ALL_IN';

export type VendorSupplyType = 'TRANSPORT_ONLY' | 'MATERIAL_AND_TRANSPORT';

export type AllInVolumeBasis = 'PER_M3_RECEIVED';

export type OverDeliveryPolicy =
  | 'ALLOWED'
  | 'WARNING'
  | 'REQUIRES_APPROVAL'
  | 'BLOCKED';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type MeasurementMode =
  | 'ACTUAL_MEASURED'
  | 'CALCULATED_FROM_WEIGHT'
  | 'ESTIMATED';

export interface Company {
  id: string;
  name: string;
  brand: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  primaryColor: string;
  npwp?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  role: Role;
  email: string;
  phone?: string;
  department: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  primaryUnit: 'm3';
  density: number; // in ton/m3, e.g. 1.60
  qualitySpec: string;
  abrasionSpec?: string;
  defaultMaterialCost: number; // Rp / m3
  defaultSellingPrice: number; // Rp / m3
  isActive: boolean;
}

export interface ProductPrice {
  id: string;
  productId: string;
  effectiveDate: string;
  sellingPricePerM3: number;
  materialCostPerM3: number;
  isActive: boolean;
}

export interface QuarryMaterialCost {
  productId: string;
  costPerM3: number;
}

export interface Quarry {
  id: string;
  code: string;
  name: string;
  locationName: string;
  address: string;
  gpsLat?: number;
  gpsLng?: number;
  abrasionRating?: string;
  hasWeighbridge?: boolean;
  isActive: boolean;
  suppliedProductIds: string[];
  // Harga beli material spesifik quarry (override per product). Bila kosong, pakai product.defaultMaterialCost.
  materialCostOverrides?: QuarryMaterialCost[];
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  npwp?: string;
  billingAddress: string;
  address?: string;
  contactPerson: string;
  phone: string;
  email: string;
  paymentTermsDays: number;
  isActive: boolean;
}

export interface Project {
  id: string;
  customerId: string;
  projectNumber: string;
  name: string;
  location: string;
  gpsLat?: number;
  gpsLng?: number;
  code?: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
}

export interface Contract {
  id: string;
  contractNumber: string;
  customerId: string;
  projectId: string;
  productId: string;
  quarryId?: string;
  // Multi-source quarry: fleksibel ambil dari quarry mana saja yang ready. quarryId = sumber utama/default.
  sourceQuarryIds?: string[];
  contractType: 'PO_BASED' | 'NON_PO';
  contractedVolumeM3: number;
  unitPricePerM3: number;
  tolerancePercent: number; // e.g. 2.0%
  overDeliveryPolicy: OverDeliveryPolicy;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'SUSPENDED';
  notes?: string;
}

export interface TransportVendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  defaultPricingModel: FreightPricingModel;
  supplyType?: VendorSupplyType;
  isActive: boolean;
  code?: string;
  paymentTermsDays?: number;
  notes?: string;
}

export interface Vehicle {
  id: string;
  transportVendorId: string;
  plateNumber: string;
  vehicleType: string;
  nominalCapacityM3: number;
  isActive: boolean;
  status?: string;
  maxCapacityTons?: number;
}

export interface Driver {
  id: string;
  transportVendorId: string;
  fullName: string;
  phone: string;
  simNumber?: string;
  isActive: boolean;
  status?: string;
}

export interface FreightRate {
  id: string;
  transportVendorId: string;
  quarryId: string;
  projectId: string;
  pricingModel: FreightPricingModel;
  ratePerUnit: number; // Rp per trip, per ton, or per m3
  isAllInclusiveMaterial?: boolean;
  allInVolumeBasis?: AllInVolumeBasis;
  tollFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  effectiveDate: string;
  isActive: boolean;
  distanceKm?: number;
  ratePerUnitIdr?: number;
  minimumChargeIdr?: number;
  notes?: string;
}

export interface WeighbridgeRecord {
  id: string;
  deliveryId: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  scaleSlipPhotoUrl?: string;
  weighedAt: string;
}

export interface DeliveryPod {
  id: string;
  deliveryId: string;
  recipientName: string;
  recipientRole?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
  signatureDispatcherUrl?: string;
  signatureDriverUrl?: string;
  signatureRecipientUrl?: string;
  deliverySlipPhotoUrl?: string;
  materialPhotoUrl?: string;
  notes?: string;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface QuantityReconciliation {
  id: string;
  deliveryId: string;
  loadedVolumeM3: number;
  receivedVolumeM3: number;
  physicalVarianceM3: number;
  variancePercentage: number;
  tolerancePercentApplied: number;
  varianceStatus: VarianceStatus;
  varianceReason: VarianceReason;
  commercialAdjustmentM3: number;
  finalApprovedVolumeM3: number;
  potentialVarianceValueIdr: number;
  reviewNotes?: string;
  reconciledBy?: string;
  reconciledAt: string;
}

export interface CostRecord {
  id: string;
  deliveryId: string;
  billableQuantityM3: number;
  sellingPricePerM3: number;
  recognizedRevenueIdr: number;
  materialCostPerM3: number;
  totalMaterialCostIdr: number;
  freightRatePerUnit: number;
  freightPricingModel: FreightPricingModel;
  pricingBasis?: 'SPLIT' | 'ALL_IN';
  allInPricePerM3?: number;
  allInVolumeBasis?: AllInVolumeBasis;
  totalFreightCostIdr: number;
  otherOperationalCostIdr: number;
  totalHppIdr: number;
  grossProfitIdr: number;
  grossMarginPercent: number;
  isActualFinalized: boolean;
}

export interface QuarryLoadingInfo {
  checkerName: string;
  loadedAt: string;
  measurementMethod: 'WEIGHBRIDGE' | 'TRUCK_BED_VOLUME' | 'MANUAL';
  truckBedDimensions?: {
    lengthM: number;
    widthM: number;
    heightM: number;
    calculatedM3: number;
  };
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  densityUsed?: number;
  notes?: string;
  quarryPhotoUrl?: string;
  signatureUrl?: string;
}

export interface SiteUnloadingInfo {
  checkerName: string;
  arrivedAt: string;
  unloadedAt: string;
  measurementMethod: 'TRUCK_BED_VOLUME' | 'DIPSTICK_ROD' | 'SITE_SCALE' | 'VISUAL_SURVEY';
  measuredVolumeM3: number;
  measuredWeightKg?: number;
  truckBedDimensions?: {
    lengthM: number;
    widthM: number;
    heightM: number;
    calculatedM3: number;
  };
  varianceVolumeM3: number;
  variancePercent: number;
  isWithinTolerance: boolean;
  toleranceAppliedPercent: number;
  conditionNotes?: string;
  sitePhotoUrl?: string;
  signatureUrl?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  contractId: string;
  productId: string;
  quarryId: string;
  transportVendorId: string;
  vehicleId?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  status: DeliveryStatus;

  // Primary Quantities (m3)
  loadedVolumeM3: number;
  receivedVolumeM3: number;
  approvedVolumeM3: number;

  // Secondary Quantities (Weight)
  loadedWeightKg: number;
  receivedWeightKg: number;
  approvedWeightKg: number;

  densityApplied?: number;
  measurementMode: MeasurementMode;

  scheduledDate: string;
  departureDate?: string;
  notes?: string;
  loadedAt?: string;
  arrivedAt?: string;
  unloadedAt?: string;
  deliveredAt?: string;

  quarryLoadingInfo?: QuarryLoadingInfo;
  siteUnloadingInfo?: SiteUnloadingInfo;

  weighbridge?: WeighbridgeRecord;
  pod?: DeliveryPod;
  reconciliation?: QuantityReconciliation;
  costRecord?: CostRecord;

  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  deliveryId: string;
  deliveryNumber: string;
  productName: string;
  approvedVolumeM3: number;
  unitPricePerM3: number;
  itemTotalIdr: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  projectId: string;
  contractId: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  totalApprovedVolumeM3: number;
  subtotalIdr: number;
  taxRatePercent: number;
  taxAmountIdr: number;
  totalInvoiceIdr: number;
  totalPaidIdr: number;
  outstandingBalanceIdr: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  paymentDate: string;
  amountPaidIdr: number;
  bankReference: string;
  paymentMethod: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  recordIdentifier: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'RECONCILE' | 'CORRECTION';
  changedBy: string;
  userRole: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  timestamp: string;
}

export interface CorrectionRequest {
  id: string;
  targetType: 'DELIVERY' | 'INVOICE' | 'RECONCILIATION';
  targetId: string;
  targetNumber: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  proposedChanges: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}
