// ============================================
// ROLE & USER
// ============================================
export type UserRole =
  | 'SUPER_ADMIN'
  | 'MANAGEMENT'
  | 'OPERATIONS'
  | 'COMMERCIAL'
  | 'FINANCE'
  | 'DISPATCHER'
  | 'QUARRY_CHECKER'
  | 'SITE_CHECKER'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  quarryId?: string
  siteId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// PRODUCT (MATERIAL AGREGAT)
// ============================================
export interface Product {
  id: string
  name: string
  code: string
  density: number          // ton/m³
  qualitySpec?: string
  defaultMaterialCost: number
  defaultSellingPrice: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// QUARRY
// ============================================
export interface Quarry {
  id: string
  name: string
  code: string
  locationName: string
  coordinates: { lat: number; lng: number }
  hasWeighbridge: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// CUSTOMER & PROJECT
// ============================================
export interface Customer {
  id: string
  name: string
  code: string
  taxId?: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  customerId: string
  name: string
  code: string
  location: string
  coordinates?: { lat: number; lng: number }
  startDate?: Date
  endDate?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// CONTRACT
// ============================================
export type InvoicingBasis = 'MIN_OF_BOTH' | 'SITE_RECEIVED' | 'QUARRY_LOADED'
export type OverDeliveryPolicy = 'ALLOWED' | 'WARNING' | 'REQUIRES_APPROVAL' | 'BLOCKED'

export interface Contract {
  id: string
  contractNumber: string
  customerId: string
  projectId: string
  productId: string
  quarryId: string
  totalTargetVolumeM3: number
  deliveredVolumeM3: number
  unitPriceM3: number
  tolerancePercent: number          // default 2.0%
  invoicingBasis: InvoicingBasis
  overDeliveryPolicy: OverDeliveryPolicy
  startDate: Date
  endDate: Date
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// TRANSPORT VENDOR & VEHICLE
// ============================================
export type PricingModel = 'PER_TRIP' | 'PER_M3' | 'PER_TON' | 'ALL_IN'
export type VendorSupplyType = 'TRANSPORT_ONLY' | 'MATERIAL_AND_TRANSPORT'

export interface TransportVendor {
  id: string
  name: string
  code: string
  phone: string
  address?: string
  supplyType?: VendorSupplyType
  pricingModel: PricingModel
  ratePerTrip?: number
  ratePerM3?: number
  ratePerTon?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Vehicle {
  id: string
  vendorId: string
  plateNumber: string
  type: string
  capacityM3: number
  maxWeightTon: number
  lengthM: number
  widthM: number
  heightM: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// DELIVERY (SURAT JALAN)
// ============================================
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
  | 'CANCELLED'

export type VarianceStatus = 'WITHIN_TOLERANCE' | 'ABOVE_TOLERANCE'

export interface QuarryLoadingInfo {
  method: 'WEIGHBRIDGE' | 'DIMENSION'
  grossKg?: number
  tareKg?: number
  nettoKg?: number
  lengthM?: number
  widthM?: number
  heightM?: number
  volumeM3: number
  weightTon?: number
  photoUrl?: string
  signatureUrl: string
  checkerName: string
  checkerId: string
  timestamp: Date
}

export interface SiteUnloadingInfo {
  volumeM3: number
  weightTon?: number
  photoUrl?: string
  coordinates: { lat: number; lng: number }
  signatureQuarry: string
  signatureDriver: string
  checkerName: string
  checkerId: string
  timestamp: Date
}

export interface Delivery {
  id: string
  deliveryNumber: string
  contractId: string
  productId: string
  quarryId: string
  transportVendorId: string
  vehicleId: string
  driverName: string
  driverPhone: string
  scheduledDate: Date
  departureDate?: Date
  arrivalDate?: Date
  completedDate?: Date
  loadedVolumeM3: number
  loadedWeightKg?: number
  receivedVolumeM3?: number
  receivedWeightKg?: number
  quarryLoadingInfo?: QuarryLoadingInfo
  siteUnloadingInfo?: SiteUnloadingInfo
  varianceM3?: number
  variancePercent?: number
  varianceStatus?: VarianceStatus
  isWithinTolerance?: boolean
  status: DeliveryStatus
  notes?: string
  isDeleted: boolean
  deletedReason?: string
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// INVOICE
// ============================================
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface Invoice {
  id: string
  invoiceNumber: string
  contractId: string
  periodStart: Date
  periodEnd: Date
  deliveryIds: string[]
  totalDeliveredM3: number
  subtotal: number
  ppnAmount: number               // 11%
  penaltyAmount: number
  totalAmount: number
  status: InvoiceStatus
  sentDate?: Date
  dueDate?: Date
  paidDate?: Date
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// AUDIT LOG
// ============================================
export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'
  | 'VARIANCE_RESOLVE' | 'CORRECTION_REQUEST' | 'CORRECTION_APPROVE'
  | 'LOGIN' | 'LOGOUT'

export interface AuditLog {
  id: string
  timestamp: Date
  actorId: string
  actorName: string
  actorRole: UserRole
  action: AuditAction
  targetEntity: string
  targetId: string
  reason?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

// ============================================
// REPORT
// ============================================
export interface DailyReport {
  date: Date
  totalDeliveries: number
  totalVolumeM3: number
  averageVariancePercent: number
  deliveriesWithinTolerance: number
  deliveriesAboveTolerance: number
  totalRevenue: number
}

export interface MonthlyReport {
  month: string
  totalDeliveries: number
  totalVolumeM3: number
  averageVariancePercent: number
  totalRevenue: number
  topCustomers: Array<{ customerName: string; volumeM3: number }>
  topVendors: Array<{ vendorName: string; trips: number; volumeM3: number }>
}

// ============================================
// API RESPONSE
// ============================================
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}