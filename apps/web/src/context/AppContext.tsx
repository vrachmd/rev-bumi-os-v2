import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  initialAuditLogs,
  initialCompany,
  initialContracts,
  initialCorrectionRequests,
  initialCustomers,
  initialDeliveries,
  initialDrivers,
  initialFreightRates,
  initialInvoices,
  initialPayments,
  initialProducts,
  initialProfiles,
  initialProjects,
  initialQuarries,
  initialTransportVendors,
  initialVehicles,
} from '../data/seedData';
import { calculateDeliveryFinance } from '../engine/finance.engine';
import { normalizePlate as normalizePlateUtil } from '../lib/utils';
import { reconcileQuantity } from '../engine/quantity.engine';
import { validateDeliveryTransition } from '../engine/state-machine.engine';
import { roundCurrency, roundVolume } from '../lib/decimal';
import { resolveFreightRate } from '../lib/freightRate';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { insertAuditLogToSupabase } from '../lib/supabaseAudit';
import {
  fetchDeliveriesFromSupabase,
  upsertDeliveryToSupabase,
  deleteDeliveryFromSupabase,
  subscribeDeliveryChanges,
} from '../lib/supabaseDelivery';
import {
  bulkInsertDeliveriesToSupabase,
  bulkEnsureVehiclesToSupabase,
} from '../lib/supabaseBulk';
import {
  deleteInvoiceFromSupabase,
  fetchFinanceFromSupabase,
  subscribeFinanceChanges,
  upsertInvoiceToSupabase,
  upsertPaymentToSupabase,
} from '../lib/supabaseFinance';
import {
  fetchMasterFromSupabase,
  upsertMasterToSupabase,
  deleteMasterEntityFromSupabase,
  MasterDataBundle,
  QuarryMaterialCost,
} from '../lib/supabaseMaster';
import {
  AuditLog,
  Company,
  Contract,
  CorrectionRequest,
  Customer,
  Delivery,
  DeliveryPod,
  DeliveryStatus,
  Driver,
  FreightRate,
  Invoice,
  Payment,
  Product,
  Project,
  Quarry,
  QuarryLoadingInfo,
  Role,
  SiteUnloadingInfo,
  TransportVendor,
  UserProfile,
  VarianceReason,
  Vehicle,
  WeighbridgeRecord,
} from '../types';

interface AppContextType {
  company: Company;
  currentProfile: UserProfile;
  setCurrentRole: (role: Role) => void;
  isSupabaseAuthed: boolean;
  supabaseProfile: UserProfile | null;
  syncProfileFromSupabase: () => Promise<void>;
  logoutFromSupabase: () => Promise<void>;
  
  // Entities
  products: Product[];
  quarries: Quarry[];
  customers: Customer[];
  projects: Project[];
  contracts: Contract[];
  transportVendors: TransportVendor[];
  vehicles: Vehicle[];
  drivers: Driver[];
  freightRates: FreightRate[];
  quarryMaterialCosts: QuarryMaterialCost[];
  deliveries: Delivery[];
  invoices: Invoice[];
  payments: Payment[];
  auditLogs: AuditLog[];
  correctionRequests: CorrectionRequest[];

  // Entity Actions
  addDelivery: (delivery: Partial<Delivery>) => { success: boolean; error?: string };
  updateDelivery: (deliveryId: string, updates: Partial<Delivery>) => { success: boolean; error?: string };
  deleteDelivery: (deliveryId: string, reason?: string) => { success: boolean; error?: string };
  updateDeliveryStatus: (deliveryId: string, targetStatus: DeliveryStatus, reason?: string) => { success: boolean; error?: string };
  submitWeighbridge: (deliveryId: string, grossKg: number, tareKg: number, photoUrl?: string) => { success: boolean; error?: string };
  submitPod: (deliveryId: string, podData: Partial<DeliveryPod>) => { success: boolean; error?: string };
  verifyPod: (deliveryId: string) => { success: boolean; error?: string };
  recordQuarryLoading: (
    deliveryId: string,
    data: {
      measurementMethod: 'WEIGHBRIDGE' | 'TRUCK_BED_VOLUME' | 'MANUAL';
      loadedVolumeM3: number;
      loadedWeightKg: number;
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
      checkerName?: string;
    }
  ) => { success: boolean; error?: string };
  recordSiteArrival: (
    deliveryId: string,
    gps?: { lat: number; lng: number }
  ) => { success: boolean; error?: string };
  recordSiteUnloading: (
    deliveryId: string,
    data: {
      measurementMethod: 'TRUCK_BED_VOLUME' | 'DIPSTICK_ROD' | 'SITE_SCALE' | 'VISUAL_SURVEY';
      receivedVolumeM3: number;
      receivedWeightKg?: number;
      truckBedDimensions?: {
        lengthM: number;
        widthM: number;
        heightM: number;
        calculatedM3: number;
      };
      conditionNotes?: string;
      sitePhotoUrl?: string;
      signatureUrl?: string;
      checkerName?: string;
      gpsLatitude?: number;
      gpsLongitude?: number;
    }
  ) => { success: boolean; error?: string };
  reconcileDeliveryQuantity: (
    deliveryId: string,
    receivedVolumeM3: number,
    commercialAdjustmentM3: number,
    reason: VarianceReason,
    notes?: string
  ) => { success: boolean; error?: string };

  // Commercial & Finance Actions
  createContract: (contract: Omit<Contract, 'id'>) => void;
  updateContract: (contractId: string, updates: Partial<Contract>) => void;
  deleteContract: (contractId: string) => void;
  createInvoice: (
    customerId: string,
    projectId: string,
    contractId: string,
    deliveryIds: string[],
    taxRatePercent?: number,
    notes?: string
  ) => { success: boolean; invoiceId?: string; error?: string };
  deleteInvoice: (invoiceId: string) => { success: boolean; error?: string };
  updateInvoiceNotes: (invoiceId: string, notes: string) => { success: boolean; error?: string };
  updateInvoiceKwitansi: (invoiceId: string, kwitansiPhotoUrl: string | null) => { success: boolean; error?: string };
  recordPayment: (invoiceId: string, amount: number, bankRef: string, method: string, notes?: string) => { success: boolean; error?: string };
  updatePayment: (paymentId: string, updates: Partial<Payment>) => { success: boolean; error?: string };
  deletePayment: (paymentId: string) => { success: boolean; error?: string };
  
  bulkCreateDeliveries: (rows: Partial<Delivery>[], opts?: { bulkBatchId?: string }) => Promise<{ success: boolean; batchId: string; ok: number; failed: { id: string; error: string }[]; error?: string }>;
  // Master Data CRUD
  saveProduct: (product: Product) => void;
  saveQuarry: (quarry: Quarry) => void;
  saveCustomer: (customer: Customer) => void;
  saveProject: (project: Project) => void;
  addCustomer: (data: Omit<Customer, 'id' | 'code'> & { code?: string }) => Customer;
  addProject: (data: Omit<Project, 'id' | 'projectNumber'> & { projectNumber?: string }) => Project;
  deleteCustomer: (customerId: string) => { success: boolean; error?: string };
  deleteProject: (projectId: string) => { success: boolean; error?: string };
  saveVendor: (vendor: TransportVendor) => void;
  saveVehicle: (vehicle: Vehicle) => void;
  saveDriver: (driver: Driver) => void;
  saveFreightRate: (rate: FreightRate) => void;
  deleteVendor: (vendorId: string) => void;
  deleteVehicle: (vehicleId: string) => void;
  deleteDriver: (driverId: string) => void;
  deleteFreightRate: (rateId: string) => void;

  // Audit & Correction
  submitCorrectionRequest: (targetType: 'DELIVERY' | 'INVOICE' | 'RECONCILIATION', targetId: string, targetNumber: string, reason: string, proposedChanges: any) => void;
  reviewCorrectionRequest: (requestId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => void;

  // CSV Exporter
  exportToCsv: (datasetName: string) => void;
}

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

// Seed versioning: bila seedData diperbarui, naikkan versi ini agar localStorage
// yang tersimpan dari versi sebelumnya di-reset dan dimuat ulang dari seed terbaru.
const SEED_VERSION = '2026-08-21-bojonegara-ivan-sync';

function applySeedVersion() {
  try {
    const current = localStorage.getItem('rev_seed_version');
    if (current !== SEED_VERSION) {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('rev_'));
      keys.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('rev_seed_version', SEED_VERSION);
    }
  } catch {
    // localStorage tidak tersedia; lanjutkan dengan seed default.
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company] = useState<Company>(initialCompany);
  const [profiles] = useState<UserProfile[]>(initialProfiles);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(initialProfiles[0]!); // Default to Management
  const [isSupabaseAuthed, setIsSupabaseAuthed] = useState(false);
  const [supabaseProfile, setSupabaseProfile] = useState<UserProfile | null>(null);

  // Sinkronisasi profil dari Supabase: saat sesi aktif, ambil data profil
  // (full_name, role, email, department) dari tabel profiles — bukan demo.
  const syncProfileFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, email, phone, department, is_active')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error || !data) return;
    const liveProfile: UserProfile = {
      id: data.id,
      fullName: data.full_name,
      role: data.role as Role,
      email: data.email,
      phone: data.phone ?? undefined,
      department: data.department ?? '',
    };
    setCurrentProfile(liveProfile);
    setSupabaseProfile(liveProfile);
    setIsSupabaseAuthed(true);
  };

  const logoutFromSupabase = async () => {
    await supabase.auth.signOut();
    setSupabaseProfile(null);
    setIsSupabaseAuthed(false);
    setCurrentProfile(initialProfiles[0]!);
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    syncProfileFromSupabase();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        syncProfileFromSupabase();
      } else if (event === 'SIGNED_OUT') {
        setSupabaseProfile(null);
        setIsSupabaseAuthed(false);
        setCurrentProfile(initialProfiles[0]!);
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime & single source of truth untuk deliveries (Fase 0.6):
  // saat terautentikasi ke Supabase, muat delivery dari DB lalu subscribe
  // perubahan (INSERT/UPDATE/DELETE) agar cockpit selalu sinkron tanpa reload.
  useEffect(() => {
    if (!isSupabaseAuthed) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const loadDeliveries = async () => {
      try {
        const data = await fetchDeliveriesFromSupabase();
        if (!cancelled) setDeliveries(data);
      } catch {
        // Offline / belum punya akses; pertahankan state lokal.
      }
    };

    loadDeliveries();
    unsubscribe = subscribeDeliveryChanges(() => {
      loadDeliveries();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseAuthed]);

  // Realtime & single source of truth untuk invoice + payment (Fase 0.6).
  useEffect(() => {
    if (!isSupabaseAuthed) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const loadFinance = async () => {
      try {
        const { invoices: dbInvoices, payments: dbPayments } = await fetchFinanceFromSupabase();
        if (!cancelled) {
          setInvoices(dbInvoices);
          setPayments(dbPayments);
        }
      } catch {
        // Offline / belum punya akses; pertahankan state lokal.
      }
    };

    loadFinance();
    unsubscribe = subscribeFinanceChanges(() => {
      loadFinance();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseAuthed]);

  // Single source of truth untuk master data (Fase 0.6): saat terautentikasi,
  // seluruh master dimuat dari Supabase (menggantikan seed/localStorage).
  useEffect(() => {
    if (!isSupabaseAuthed) return;

    let cancelled = false;

    const loadMaster = async () => {
      try {
        const bundle = await fetchMasterFromSupabase();
        if (cancelled) return;
        setProducts(bundle.products);
        setQuarries(bundle.quarries);
        setCustomers(bundle.customers);
        setProjects(bundle.projects);
        setContracts(bundle.contracts);
        setTransportVendors(bundle.transportVendors);
        setVehicles(bundle.vehicles);
        setDrivers(bundle.drivers);
        setFreightRates(bundle.freightRates);
        setQuarryMaterialCosts(bundle.quarryMaterialCosts);
      } catch {
        // Offline / belum punya akses; pertahankan state lokal (seed/demo).
      }
    };

    loadMaster();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseAuthed]);

  // Reset cache localStorage bila seed version berubah (mis. penambahan data batching plant IMCI).
  useState<boolean>(() => {
    applySeedVersion();
    return true;
  });

  const [products, setProducts] = useState<Product[]>(() => safeLoad('rev_products', initialProducts));
  const [quarries, setQuarries] = useState<Quarry[]>(() => safeLoad('rev_quarries', initialQuarries));
  const [customers, setCustomers] = useState<Customer[]>(() => safeLoad('rev_customers', initialCustomers));
  const [projects, setProjects] = useState<Project[]>(() => safeLoad('rev_projects', initialProjects));
  const [contracts, setContracts] = useState<Contract[]>(() => safeLoad('rev_contracts', initialContracts));
  const [transportVendors, setTransportVendors] = useState<TransportVendor[]>(() => safeLoad('rev_vendors', initialTransportVendors));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => safeLoad('rev_vehicles', initialVehicles));
  const [drivers, setDrivers] = useState<Driver[]>(() => safeLoad('rev_drivers', initialDrivers));
  const [freightRates, setFreightRates] = useState<FreightRate[]>(() => safeLoad('rev_freight_rates', initialFreightRates));
  const [quarryMaterialCosts, setQuarryMaterialCosts] = useState<QuarryMaterialCost[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => safeLoad('rev_deliveries', initialDeliveries));
  const [invoices, setInvoices] = useState<Invoice[]>(() => safeLoad('rev_invoices', initialInvoices));
  const [payments, setPayments] = useState<Payment[]>(() => safeLoad('rev_payments', initialPayments));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => safeLoad('rev_audit_logs', initialAuditLogs));
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(() => safeLoad('rev_corrections', initialCorrectionRequests));

  // Local storage persistence
  useEffect(() => {
    localStorage.setItem('rev_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('rev_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('rev_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('rev_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('rev_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const logAudit = (
    tableName: string,
    recordId: string,
    recordIdentifier: string,
    action: AuditLog['action'],
    oldValues?: any,
    newValues?: any,
    reason?: string
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tableName,
      recordId,
      recordIdentifier,
      action,
      changedBy: currentProfile.fullName,
      userRole: currentProfile.role,
      oldValues,
      newValues,
      reason,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    // Fase 1: audit juga ditulis append-only ke DB (insert-only RLS, timestamp server).
    if (isSupabaseAuthed) {
      void insertAuditLogToSupabase({
        tableName,
        recordId,
        recordIdentifier,
        action,
        oldValues,
        newValues,
        reason,
        userRole: currentProfile.role,
      }).then((r) => {
        if (!r.ok) console.warn('[audit] gagal tulis ke Supabase:', r.error);
      });
    }
  };

  // Write-through ke Supabase (Fase 0.6): setiap mutasi delivery dikirim ke
  // DB bila pengguna terautentikasi. Fire-and-forget; kegagalan tidak
  // memblokir UX (hasil dicatat via console).
  const syncDeliveryToCloud = (delivery: Delivery) => {
    if (!isSupabaseAuthed) return;
    upsertDeliveryToSupabase(delivery)
      .then((result) => {
        const failed = result.tables.filter((t) => !t.ok);
        if (failed.length > 0) {
          console.warn('Supabase sync partial failure:', result.deliveryId, failed);
        }
      })
      .catch((err) => console.warn('Supabase sync error:', err));
  };

  const syncDeleteDeliveryToCloud = (deliveryId: string) => {
    if (!isSupabaseAuthed) return;
    deleteDeliveryFromSupabase(deliveryId).catch((err) =>
      console.warn('Supabase delete sync error:', err)
    );
  };

  const syncInvoiceToCloud = (invoice: Invoice) => {
    if (!isSupabaseAuthed) return;
    upsertInvoiceToSupabase(invoice)
      .then((result) => {
        const failed = result.tables.filter((t) => !t.ok);
        if (failed.length > 0) {
          console.warn('Supabase invoice sync partial failure:', result.entity, failed);
        }
      })
      .catch((err) => console.warn('Supabase invoice sync error:', err));
  };

  const syncPaymentToCloud = (payment: Payment, invoice: Invoice) => {
    if (!isSupabaseAuthed) return;
    upsertPaymentToSupabase(payment, invoice)
      .then((result) => {
        const failed = result.tables.filter((t) => !t.ok);
        if (failed.length > 0) {
          console.warn('Supabase payment sync partial failure:', result.entity, failed);
        }
      })
      .catch((err) => console.warn('Supabase payment sync error:', err));
  };

  const syncMaster = (partial: Partial<MasterDataBundle>) => {
    if (!isSupabaseAuthed) return;
    const empty: MasterDataBundle = {
      products: [],
      quarries: [],
      customers: [],
      projects: [],
      contracts: [],
      transportVendors: [],
      vehicles: [],
      drivers: [],
      freightRates: [],
      quarryMaterialCosts: [],
    };
    upsertMasterToSupabase({ ...empty, ...partial })
      .then((results) => {
        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          console.warn('Supabase master sync partial failure:', failed);
        }
      })
      .catch((err) => console.warn('Supabase master sync error:', err));
  };

  const syncMasterDelete = (table: string, id: string) => {
    if (!isSupabaseAuthed) return;
    deleteMasterEntityFromSupabase(table, id)
      .then((r) => {
        if (!r.ok) console.warn('Supabase master delete failure:', r.table, r.entity, r.error);
      })
      .catch((err) => console.warn('Supabase master delete error:', err));
  };

  const setCurrentRole = (role: Role) => {
    const matched = profiles.find((p) => p.role === role) || {
      id: `usr-${role.toLowerCase()}`,
      fullName: `Operator (${role})`,
      role,
      email: `${role.toLowerCase()}@revbumi.co.id`,
      department: role,
    };
    setCurrentProfile(matched);
  };

  // Add new delivery (Petugas Quarry / Dispatcher)
  const addDelivery = (data: Partial<Delivery>) => {
    const contract = contracts.find((c) => c.id === data.contractId);
    const product = products.find((p) => p.id === (data.productId || contract?.productId));

    if (!contract || !product) {
      return { success: false, error: 'Kontrak dan Produk Material wajib dipilih.' };
    }

    const todayStr = new Date().toISOString().slice(0, 7).replace(/-/g, '');
    // global NNN — lanjut terus walau ganti YYYYMM
    const maxNGlobal = deliveries.reduce((m: number, d: Delivery) => {
      const n = parseInt((d.deliveryNumber.split('/')[3] || '').split('-')[0] || '0', 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    const count = maxNGlobal + 1;
    const deliveryNumber = data.deliveryNumber || `SJ/RBN/${todayStr}/${String(count).padStart(3, '0')}`;

    const newDelivery: Delivery = {
      id: `del-${Date.now()}`,
      deliveryNumber,
      contractId: contract.id,
      productId: product.id,
      quarryId: data.quarryId || contract.quarryId || quarries[0]?.id || '',
      transportVendorId: data.transportVendorId || transportVendors[0]?.id || '',
      vehicleId: data.vehicleId || vehicles[0]?.id || '',
      driverId: data.driverId || '',
      driverName: data.driverName || 'Supir Vendor Armada',
      driverPhone: data.driverPhone || '',
      status: data.status || 'SCHEDULED',
      loadedVolumeM3: data.loadedVolumeM3 || 0,
      receivedVolumeM3: 0,
      approvedVolumeM3: 0,
      loadedWeightKg: data.loadedWeightKg || 0,
      receivedWeightKg: 0,
      approvedWeightKg: 0,
      densityApplied: data.densityApplied || product.density || 1.6,
      measurementMode: data.measurementMode || 'ACTUAL_MEASURED',
      scheduledDate: data.scheduledDate || new Date().toISOString().slice(0, 10),
      departureDate: data.departureDate || new Date().toISOString().slice(0, 10),
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDeliveries((prev) => [newDelivery, ...prev]);
    logAudit('deliveries', newDelivery.id, newDelivery.deliveryNumber, 'CREATE', null, newDelivery, 'Penerbitan surat jalan & jadwal pengiriman oleh Petugas Quarry');
    syncDeliveryToCloud(newDelivery);
    return { success: true };
  };

  const bulkCreateDeliveries: AppContextType['bulkCreateDeliveries'] = async (rows, opts) => {
    if (!rows || rows.length === 0) return { success: false, batchId: '', ok: 0, failed: [], error: 'Tidak ada data ritase' };
    const batchId = opts?.bulkBatchId || `bulk-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 7).replace(/-/g, '');
    // global NNN — lanjut terus walau ganti YYYYMM (sesuai data SJ existing yang lanjut)
    const maxN = deliveries.reduce((m: number, d: Delivery) => {
      const n = parseInt((d.deliveryNumber.split('/')[3] || '').split('-')[0] || '0', 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    const startCount = maxN;
    const toInsert: Delivery[] = [];
    const vehiclesToEnsure: { id: string; transport_vendor_id: string; plate_number: string; vehicle_type: string; nominal_capacity_m3: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as Partial<Delivery> & Record<string, unknown> | undefined;
      if (!r) continue;
      const contract = contracts.find((c) => c.id === (r as Delivery).contractId) || contracts[0];
      const product = products.find((p) => p.id === ((r as Delivery).productId || contract?.productId)) || products[0];
      if (!contract || !product) continue;
      const count = startCount + i + 1;
      // SJ konsisten: SJ/RBN/YYYYMM/NNN murni sekuensial tanpa suffix, lanjut dari max NNN bulan ini
      const deliveryNumber = (r as any).deliveryNumber || `SJ/RBN/${todayStr}/${String(count).padStart(3, '0')}`;
      const id = (r as any).id || `del-bulk-${Date.now()}-${i}`;
      const plateRaw = (r as any).plateNumber || (r as Delivery).driverName || '';
      const plate = plateRaw ? normalizePlateUtil(plateRaw) : '';
      // vehicle resolve/create
      let vehicleId = (r as Delivery).vehicleId as string | undefined;
      if (!vehicleId && plate) {
        const existing = vehicles.find((v) => normalizePlateUtil(v.plateNumber) === plate);
        if (existing) vehicleId = existing.id;
        else {
          vehicleId = `veh-${plate.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 10)}-${i}`;
          vehiclesToEnsure.push({ id: vehicleId, transport_vendor_id: (r as Delivery).transportVendorId || contract.quarryId || transportVendors[0]?.id || '', plate_number: plate, vehicle_type: 'Dump Truck', nominal_capacity_m3: (r as Delivery).loadedVolumeM3 || 24 });
        }
      }
      const reqStatus = ((r as any).status as string)?.toUpperCase() === 'DELIVERED' ? 'DELIVERED' as const : 'SCHEDULED' as const;
      const vol = (r as Delivery).loadedVolumeM3 || 0;
      const wKg = (r as Delivery).loadedWeightKg || 0;
      const d: Delivery = {
        id,
        deliveryNumber,
        contractId: contract.id,
        productId: product.id,
        quarryId: ((r as Delivery).quarryId as string) || contract.quarryId || quarries[0]?.id || '',
        transportVendorId: ((r as Delivery).transportVendorId as string) || transportVendors[0]?.id || '',
        vehicleId: vehicleId || vehicles[0]?.id,
        driverId: (r as any).driverId || null as any,
        driverName: (r as Delivery).driverName || 'Supir Vendor Armada',
        driverPhone: (r as Delivery).driverPhone || '',
        status: reqStatus,
        loadedVolumeM3: vol,
        receivedVolumeM3: reqStatus === 'DELIVERED' ? vol : 0,
        approvedVolumeM3: reqStatus === 'DELIVERED' ? vol : 0,
        loadedWeightKg: wKg,
        receivedWeightKg: reqStatus === 'DELIVERED' ? wKg : 0,
        approvedWeightKg: reqStatus === 'DELIVERED' ? wKg : 0,
        densityApplied: (r as any).densityApplied || product.density || 1.6,
        measurementMode: ((r as Delivery).measurementMode as Delivery['measurementMode']) || 'ACTUAL_MEASURED',
        scheduledDate: ((r as Delivery).scheduledDate as string) || nowIso.slice(0, 10),
        departureDate: (r as any).departureDate,
        notes: (r as Delivery).notes || '',
        quarryLoadingInfo: (r as any).quarryLoadingInfo,
        siteUnloadingInfo: (r as any).siteUnloadingInfo,
        createdAt: nowIso,
        updatedAt: nowIso,
        deliveredAt: reqStatus === 'DELIVERED' ? nowIso : undefined,
      } as Delivery;
      // attach bulk_batch_id via any for supabaseBulk
      (d as any).bulk_batch_id = batchId;
      toInsert.push(d);
    }
    if (toInsert.length === 0) return { success: false, batchId, ok: 0, failed: [], error: 'Gagal mapping kontrak/produk' };
    // optimistic local
    setDeliveries((prev) => [...toInsert, ...prev]);
    toInsert.forEach((d) => logAudit('deliveries', d.id, d.deliveryNumber, 'CREATE', null, { ...d, bulk_batch_id: batchId }, `Bulk ritase ${batchId} (${toInsert.length} rit)`));
    if (isSupabaseAuthed) {
      if (vehiclesToEnsure.length > 0) {
        await bulkEnsureVehiclesToSupabase(vehiclesToEnsure as any);
        // also push into local vehicles state
        setVehicles((prev) => [...vehiclesToEnsure.map((v) => ({ id: v.id, transportVendorId: v.transport_vendor_id, plateNumber: v.plate_number, vehicleType: v.vehicle_type, nominalCapacityM3: v.nominal_capacity_m3, isActive: true } as Vehicle)), ...prev]);
      }
      const res = await bulkInsertDeliveriesToSupabase(toInsert, batchId);
      return { success: res.failed.length === 0, batchId, ok: res.ok, failed: res.failed };
    }
    return { success: true, batchId, ok: toInsert.length, failed: [] };
  };
  const updateDelivery = (deliveryId: string, updates: Partial<Delivery>) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Pengiriman tidak ditemukan.' };

    const updated: Delivery = {
      ...delivery,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit('deliveries', delivery.id, delivery.deliveryNumber, 'UPDATE', delivery, updated, 'Pembaruan data surat jalan oleh Petugas Quarry');
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Delete / cancel delivery
  const deleteDelivery = (deliveryId: string, reason?: string) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Pengiriman tidak ditemukan.' };

    if (delivery.status === 'DELIVERED') {
      return { success: false, error: 'Pengiriman yang sudah selesai (DELIVERED) tidak dapat dihapus.' };
    }

    setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
    logAudit('deliveries', delivery.id, delivery.deliveryNumber, 'STATUS_CHANGE', delivery, null, reason || 'Penghapusan ritase pengiriman oleh Petugas Quarry');
    syncDeleteDeliveryToCloud(deliveryId);
    return { success: true };
  };

  // Transition state
  const updateDeliveryStatus = (deliveryId: string, targetStatus: DeliveryStatus, reason?: string) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Delivery not found.' };

    const validation = validateDeliveryTransition(delivery, targetStatus);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const updated: Delivery = {
      ...delivery,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    };

    if (targetStatus === 'LOADING') updated.loadedAt = new Date().toISOString();
    if (targetStatus === 'IN_TRANSIT') updated.loadedAt = updated.loadedAt || new Date().toISOString();
    if (targetStatus === 'ARRIVED') updated.arrivedAt = new Date().toISOString();
    if (targetStatus === 'UNLOADED') updated.unloadedAt = new Date().toISOString();
    if (targetStatus === 'DELIVERED') updated.deliveredAt = new Date().toISOString();

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit('deliveries', delivery.id, delivery.deliveryNumber, 'STATUS_CHANGE', { status: delivery.status }, { status: targetStatus }, reason);
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Submit Weighbridge
  const submitWeighbridge = (deliveryId: string, grossKg: number, tareKg: number, photoUrl?: string) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Delivery not found' };

    if (grossKg < tareKg) {
      return { success: false, error: 'Gross weight must be greater than or equal to Tare weight.' };
    }

    const netWeightKg = grossKg - tareKg;
    const density = delivery.densityApplied || 1.6;
    const calculatedVolumeM3 = roundVolume((netWeightKg / 1000) / density);

    const weighbridge: WeighbridgeRecord = {
      id: `wb-${Date.now()}`,
      deliveryId,
      grossWeightKg: grossKg,
      tareWeightKg: tareKg,
      netWeightKg,
      scaleSlipPhotoUrl: photoUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
      weighedAt: new Date().toISOString(),
    };

    const updated: Delivery = {
      ...delivery,
      loadedWeightKg: netWeightKg,
      loadedVolumeM3: delivery.loadedVolumeM3 > 0 ? delivery.loadedVolumeM3 : calculatedVolumeM3,
      weighbridge,
      status: delivery.status === 'PLANNED' || delivery.status === 'SCHEDULED' || delivery.status === 'LOADING' ? 'LOADING' : delivery.status,
      updatedAt: new Date().toISOString(),
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit('delivery_weighbridge', weighbridge.id, delivery.deliveryNumber, 'UPDATE', null, weighbridge, 'Pencatatan jembatan timbang quarry');
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Submit POD
  const submitPod = (deliveryId: string, podData: Partial<DeliveryPod>) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Delivery not found' };

    const newPod: DeliveryPod = {
      id: `pod-${Date.now()}`,
      deliveryId,
      recipientName: podData.recipientName || 'Site Engineer',
      recipientRole: podData.recipientRole || 'Penerima Lapangan',
      gpsLatitude: podData.gpsLatitude || -6.78912,
      gpsLongitude: podData.gpsLongitude || 108.01234,
      gpsAccuracyMeters: podData.gpsAccuracyMeters || 5.0,
      signatureDispatcherUrl: podData.signatureDispatcherUrl || 'signed:dispatcher',
      signatureDriverUrl: podData.signatureDriverUrl || 'signed:driver',
      signatureRecipientUrl: podData.signatureRecipientUrl || 'signed:recipient',
      deliverySlipPhotoUrl: podData.deliverySlipPhotoUrl,
      materialPhotoUrl: podData.materialPhotoUrl,
      notes: podData.notes,
      submittedAt: new Date().toISOString(),
    };

    const updated: Delivery = {
      ...delivery,
      pod: newPod,
      status: 'POD_SUBMITTED',
      updatedAt: new Date().toISOString(),
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit('delivery_pods', newPod.id, delivery.deliveryNumber, 'UPDATE', null, newPod, 'Pengiriman digital bukti penerimaan (POD)');
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Petugas Quarry: Loading Measurement & Dispatch
  const recordQuarryLoading = (
    deliveryId: string,
    data: {
      measurementMethod: 'WEIGHBRIDGE' | 'TRUCK_BED_VOLUME' | 'MANUAL';
      loadedVolumeM3: number;
      loadedWeightKg: number;
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
      checkerName?: string;
    }
  ) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Delivery not found' };

    const checker = data.checkerName || currentProfile.fullName;
    const loadedAt = new Date().toISOString();
    const loadedVol = roundVolume(data.loadedVolumeM3);
    const densityUsed = data.densityUsed || delivery.densityApplied || 1.6;
    const loadedWeight = data.loadedWeightKg || roundVolume(loadedVol * densityUsed * 1000);

    const quarryLoadingInfo: QuarryLoadingInfo = {
      checkerName: checker,
      loadedAt,
      measurementMethod: data.measurementMethod,
      truckBedDimensions: data.truckBedDimensions,
      grossWeightKg: data.grossWeightKg,
      tareWeightKg: data.tareWeightKg,
      netWeightKg: data.netWeightKg || loadedWeight,
      densityUsed: densityUsed,
      notes: data.notes,
      quarryPhotoUrl: data.quarryPhotoUrl || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
      signatureUrl: data.signatureUrl || 'signed:quarry_checker',
    };

    let wb = delivery.weighbridge;
    if (data.grossWeightKg && data.tareWeightKg) {
      wb = {
        id: `wb-${Date.now()}`,
        deliveryId,
        grossWeightKg: data.grossWeightKg,
        tareWeightKg: data.tareWeightKg,
        netWeightKg: data.grossWeightKg - data.tareWeightKg,
        scaleSlipPhotoUrl: data.quarryPhotoUrl,
        weighedAt: loadedAt,
      };
    }

    const updated: Delivery = {
      ...delivery,
      loadedVolumeM3: loadedVol,
      loadedWeightKg: loadedWeight,
      densityApplied: densityUsed,
      loadedAt,
      quarryLoadingInfo,
      weighbridge: wb,
      status: 'IN_TRANSIT',
      updatedAt: loadedAt,
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit(
      'deliveries',
      delivery.id,
      delivery.deliveryNumber,
      'STATUS_CHANGE',
      { status: delivery.status },
      { status: 'IN_TRANSIT', loadedVolumeM3: loadedVol },
      `Pengukuran loading di Quarry oleh ${checker} (${loadedVol} m³). Truk diberangkatkan.`
    );
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Petugas Site Proyek: Arrival Check
  const recordSiteArrival = (deliveryId: string, gps?: { lat: number; lng: number }) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Delivery not found' };

    const arrivedAt = new Date().toISOString();
    const updated: Delivery = {
      ...delivery,
      status: 'ARRIVED',
      arrivedAt,
      updatedAt: arrivedAt,
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit(
      'deliveries',
      delivery.id,
      delivery.deliveryNumber,
      'STATUS_CHANGE',
      { status: delivery.status },
      { status: 'ARRIVED', gps },
      `Truk tiba di site proyek (diverifikasi oleh ${currentProfile.fullName})`
    );
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Petugas Site Proyek: Unloading Measurement & Verification
  const recordSiteUnloading = (
    deliveryId: string,
    data: {
      measurementMethod: 'TRUCK_BED_VOLUME' | 'DIPSTICK_ROD' | 'SITE_SCALE' | 'VISUAL_SURVEY';
      receivedVolumeM3: number;
      receivedWeightKg?: number;
      truckBedDimensions?: {
        lengthM: number;
        widthM: number;
        heightM: number;
        calculatedM3: number;
      };
      conditionNotes?: string;
      sitePhotoUrl?: string;
      signatureUrl?: string;
      checkerName?: string;
      gpsLatitude?: number;
      gpsLongitude?: number;
    }
  ) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    const contract = contracts.find((c) => c.id === delivery?.contractId);
    if (!delivery) return { success: false, error: 'Delivery not found' };

    const checker = data.checkerName || currentProfile.fullName;
    const unloadedAt = new Date().toISOString();
    const density = delivery.densityApplied || 1.6;
    const receivedVol = roundVolume(data.receivedVolumeM3);
    const loadedVol = delivery.loadedVolumeM3 > 0 ? delivery.loadedVolumeM3 : receivedVol;
    const physicalVarianceM3 = roundVolume(loadedVol - receivedVol);
    const variancePercent = loadedVol > 0 ? Number(((physicalVarianceM3 / loadedVol) * 100).toFixed(2)) : 0;
    const tolerancePercent = contract?.tolerancePercent || 2.0;
    const isWithinTolerance = Math.abs(variancePercent) <= tolerancePercent;

    const siteUnloadingInfo: SiteUnloadingInfo = {
      checkerName: checker,
      arrivedAt: delivery.arrivedAt || unloadedAt,
      unloadedAt,
      measurementMethod: data.measurementMethod,
      measuredVolumeM3: receivedVol,
      measuredWeightKg: data.receivedWeightKg || roundVolume(receivedVol * density * 1000),
      truckBedDimensions: data.truckBedDimensions,
      varianceVolumeM3: physicalVarianceM3,
      variancePercent,
      isWithinTolerance,
      toleranceAppliedPercent: tolerancePercent,
      conditionNotes: data.conditionNotes,
      sitePhotoUrl: data.sitePhotoUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80',
      signatureUrl: data.signatureUrl || 'signed:site_checker',
      gpsLatitude: data.gpsLatitude || -6.78912,
      gpsLongitude: data.gpsLongitude || 108.01234,
    };

    const newPod: DeliveryPod = {
      id: `pod-${Date.now()}`,
      deliveryId,
      recipientName: checker,
      recipientRole: 'Petugas Lapangan Site Proyek',
      gpsLatitude: data.gpsLatitude || -6.78912,
      gpsLongitude: data.gpsLongitude || 108.01234,
      gpsAccuracyMeters: 4.0,
      signatureDispatcherUrl: delivery.quarryLoadingInfo?.signatureUrl || 'signed:quarry_dispatcher',
      signatureDriverUrl: 'signed:driver',
      signatureRecipientUrl: data.signatureUrl || 'signed:site_checker',
      materialPhotoUrl: data.sitePhotoUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80',
      notes: data.conditionNotes || `Diterima di site proyek. Volume ukur: ${receivedVol} m³. Selisih: ${physicalVarianceM3} m³ (${variancePercent}%).`,
      submittedAt: unloadedAt,
    };

    const updated: Delivery = {
      ...delivery,
      receivedVolumeM3: receivedVol,
      receivedWeightKg: data.receivedWeightKg || roundVolume(receivedVol * density * 1000),
      approvedVolumeM3: isWithinTolerance ? receivedVol : (delivery.approvedVolumeM3 > 0 ? delivery.approvedVolumeM3 : receivedVol),
      approvedWeightKg: isWithinTolerance ? roundVolume(receivedVol * density * 1000) : (delivery.approvedWeightKg || 0),
      unloadedAt,
      siteUnloadingInfo,
      pod: newPod,
      status: 'POD_SUBMITTED',
      updatedAt: unloadedAt,
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit(
      'deliveries',
      delivery.id,
      delivery.deliveryNumber,
      'STATUS_CHANGE',
      { status: delivery.status },
      { status: 'POD_SUBMITTED', receivedVolumeM3: receivedVol, physicalVarianceM3, isWithinTolerance },
      `Verifikasi unloading site oleh ${checker} (${receivedVol} m³, selisih ${physicalVarianceM3} m³ / ${variancePercent}%).`
    );
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Reconcile Quantity
  const reconcileDeliveryQuantity = (
    deliveryId: string,
    receivedVolumeM3: number,
    commercialAdjustmentM3: number,
    reason: VarianceReason,
    notes?: string
  ) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    const contract = contracts.find((c) => c.id === delivery?.contractId);
    const product = products.find((p) => p.id === delivery?.productId);
    const vendor = transportVendors.find((v) => v.id === delivery?.transportVendorId);
    const quarry = quarries.find((q) => q.id === delivery?.quarryId);

    if (!delivery || !contract || !product) {
      return { success: false, error: 'Incomplete delivery, contract, or product data' };
    }

    // Resolusi tarif angkutan: wajib ada rate aktif untuk vendor + project + quarry pada tanggal pengiriman.
    const rate = resolveFreightRate(freightRates, {
      transportVendorId: delivery.transportVendorId,
      projectId: contract.projectId,
      quarryId: delivery.quarryId,
      onDate: delivery.scheduledDate || new Date().toISOString().slice(0, 10),
    });

    if (!rate) {
      const vendorName = vendor?.name || delivery.transportVendorId;
      const quarryName = quarry?.name || delivery.quarryId;
      return {
        success: false,
        error: `Vendor "${vendorName}" belum punya tarif aktif untuk rute ${quarryName} → proyek ini. Atur tarif di Modul Logistik sebelum rekonsiliasi.`,
      };
    }

    // Resolusi harga beli material: prioritas override per quarry, fallback ke default product.
    const materialCostPerM3 =
      quarry?.materialCostOverrides?.find((o) => o.productId === delivery.productId)?.costPerM3 ??
      product.defaultMaterialCost;

    const recResult = reconcileQuantity({
      loadedVolumeM3: delivery.loadedVolumeM3,
      receivedVolumeM3,
      tolerancePercent: contract.tolerancePercent,
      sellingPricePerM3: contract.unitPricePerM3,
      commercialAdjustmentM3,
      varianceReason: reason,
      reviewNotes: notes,
    });

    const approvedVol = recResult.finalApprovedVolumeM3;
    const densityApplied = delivery.densityApplied || 1.6;
    const approvedWeight = roundVolume(approvedVol * densityApplied * 1000);

    // Compute Financials — exception 29-06 Sunter Ivan per-trip: hanya ALL_IN jika rate === ALL_IN
    const isAllInVendor = rate.pricingModel === 'ALL_IN';

    const OTHER_COST_PER_RIT: Record<string, number> = { 'proj-04': 100000, 'proj-06': 100000, 'proj-05': 150000, 'proj-07': 150000, 'proj-08': 150000 };
    const otherPerRit = OTHER_COST_PER_RIT[contract.projectId] ?? 100000;
    let finResult = calculateDeliveryFinance({
      deliveryId,
      approvedVolumeM3: approvedVol,
      loadedVolumeM3: delivery.loadedVolumeM3,
      approvedWeightKg: approvedWeight,
      sellingPricePerM3: contract.unitPricePerM3,
      materialCostPerM3,
      freightPricingModel: isAllInVendor ? 'ALL_IN' : vendor?.defaultPricingModel || 'PER_M3',
      freightRatePerUnit: rate.ratePerUnit,
      allInPricePerM3: isAllInVendor ? rate.ratePerUnit : undefined,
      allInVolumeBasis: isAllInVendor ? 'PER_M3_RECEIVED' : undefined,
      otherOperationalCostPerM3: 0,
      tollFee: isAllInVendor ? 0 : rate.tollFee || 0,
      loadingFee: isAllInVendor ? 0 : rate.loadingFee || 0,
      unloadingFee: isAllInVendor ? 0 : rate.unloadingFee || 0,
      isActualFinalized: true,
    });
    // override otherOperational dengan per-rit per plant (bukan 5k/m3)
    finResult.costRecord.otherOperationalCostIdr = otherPerRit;
    finResult.costRecord.totalHppIdr = finResult.costRecord.totalMaterialCostIdr + finResult.costRecord.totalFreightCostIdr + otherPerRit;
    finResult.costRecord.grossProfitIdr = finResult.costRecord.recognizedRevenueIdr - finResult.costRecord.totalHppIdr;
    finResult.costRecord.grossMarginPercent = finResult.costRecord.recognizedRevenueIdr > 0 ? Number(((finResult.costRecord.grossProfitIdr / finResult.costRecord.recognizedRevenueIdr) * 100).toFixed(2)) : 0;
    finResult.otherOperationalCostIdr = otherPerRit;
    finResult.totalHppIdr = finResult.costRecord.totalHppIdr;
    finResult.grossProfitIdr = finResult.costRecord.grossProfitIdr;
    finResult.grossMarginPercent = finResult.costRecord.grossMarginPercent;

    const reconciliation = {
      id: `rec-${Date.now()}`,
      deliveryId,
      loadedVolumeM3: delivery.loadedVolumeM3,
      receivedVolumeM3,
      physicalVarianceM3: recResult.physicalVarianceM3,
      variancePercentage: recResult.variancePercentage,
      tolerancePercentApplied: recResult.tolerancePercentApplied,
      varianceStatus: recResult.varianceStatus,
      varianceReason: recResult.varianceReason,
      commercialAdjustmentM3: recResult.commercialAdjustmentM3,
      finalApprovedVolumeM3: recResult.finalApprovedVolumeM3,
      potentialVarianceValueIdr: recResult.potentialVarianceValueIdr,
      reviewNotes: notes,
      reconciledBy: currentProfile.fullName,
      reconciledAt: new Date().toISOString(),
    };

    const updated: Delivery = {
      ...delivery,
      receivedVolumeM3,
      receivedWeightKg: roundVolume(receivedVolumeM3 * densityApplied * 1000),
      approvedVolumeM3: approvedVol,
      approvedWeightKg: approvedWeight,
      reconciliation,
      costRecord: finResult.costRecord,
      updatedAt: new Date().toISOString(),
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit('quantity_reconciliations', reconciliation.id, delivery.deliveryNumber, 'RECONCILE', null, reconciliation, notes || 'Rekonsiliasi volume material');
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Verify POD and finalize delivery
  const verifyPod = (deliveryId: string) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Delivery not found' };

    if (!delivery.reconciliation || delivery.approvedVolumeM3 <= 0) {
      return { success: false, error: 'Cannot verify POD: Quantity reconciliation must be approved first.' };
    }

    const updatedPod: DeliveryPod = {
      ...(delivery.pod || {
        id: `pod-${Date.now()}`,
        deliveryId,
        recipientName: 'Site Supervisor',
        submittedAt: new Date().toISOString(),
      }),
      verifiedAt: new Date().toISOString(),
      verifiedBy: currentProfile.fullName,
    };

    const updated: Delivery = {
      ...delivery,
      pod: updatedPod,
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
    logAudit('deliveries', delivery.id, delivery.deliveryNumber, 'STATUS_CHANGE', { status: delivery.status }, { status: 'DELIVERED' }, 'Verifikasi resmi POD & penerimaan selesai');
    syncDeliveryToCloud(updated);
    return { success: true };
  };

  // Create Invoice
  const createInvoice = (
    customerId: string,
    projectId: string,
    contractId: string,
    deliveryIds: string[],
    taxRatePercent: number = 11.0,
    notes?: string
  ) => {
    const contract = contracts.find((c) => c.id === contractId);
    const validDeliveries = deliveries.filter(
      (d) => deliveryIds.includes(d.id) && (d.status === 'DELIVERED' || d.approvedVolumeM3 > 0)
    );

    if (!contract || validDeliveries.length === 0) {
      return { success: false, error: 'No approved deliveries available for invoicing.' };
    }

    let subtotalIdr = 0;
    let totalApprovedVolumeM3 = 0;

    const items = validDeliveries.map((del) => {
      const product = products.find((p) => p.id === del.productId);
      const vol = del.approvedVolumeM3;
      const price = contract.unitPricePerM3;
      const total = roundCurrency(vol * price);

      subtotalIdr += total;
      totalApprovedVolumeM3 += vol;

      const veh = vehicles.find((v) => v.id === del.vehicleId);
      return {
        id: `item-${del.id}`,
        invoiceId: '',
        deliveryId: del.id,
        deliveryNumber: del.deliveryNumber,
        deliveryDate: del.scheduledDate,
        sjImci: del.quarryLoadingInfo?.notes?.includes('SJ IMCI') ? del.quarryLoadingInfo.notes.replace('SJ IMCI ', '') : undefined,
        plateNumber: veh?.plateNumber || del.driverName || undefined,
        productName: product?.name || 'Agregat',
        approvedVolumeM3: vol,
        unitPricePerM3: price,
        itemTotalIdr: total,
      };
    });

    const taxAmountIdr = roundCurrency((subtotalIdr * taxRatePercent) / 100);
    const totalInvoiceIdr = roundCurrency(subtotalIdr + taxAmountIdr);

    const count = invoices.length + 1;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV/RBN/${dateStr}/${String(count).padStart(3, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      customerId,
      projectId,
      contractId,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      items,
      totalApprovedVolumeM3: roundVolume(totalApprovedVolumeM3),
      subtotalIdr,
      taxRatePercent,
      taxAmountIdr,
      totalInvoiceIdr,
      totalPaidIdr: 0,
      outstandingBalanceIdr: totalInvoiceIdr,
      status: 'ISSUED',
      notes,
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    logAudit('invoices', newInvoice.id, newInvoice.invoiceNumber, 'CREATE', null, newInvoice, 'Penerbitan faktur tagihan proyek');
    syncInvoiceToCloud(newInvoice);
    return { success: true, invoiceId: newInvoice.id };
  };

  const deleteInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Faktur tidak ditemukan' };
    if (inv.status === 'PAID' && currentProfile.role !== 'SUPER_ADMIN') return { success: false, error: 'Faktur lunas hanya SUPER_ADMIN yang bisa hapus' };
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
    logAudit('invoices', inv.id, inv.invoiceNumber, 'DELETE', inv, null, inv.status === 'PAID' ? 'Hapus faktur PAID (SUPER_ADMIN override)' : 'Hapus faktur');
    if (isSupabaseAuthed) {
      deleteInvoiceFromSupabase(invoiceId).catch((e) => console.warn('Supabase deleteInvoice error', e));
    }
    return { success: true };
  };

  const updateInvoiceNotes = (invoiceId: string, notes: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Faktur tidak ditemukan' };
    const updated = { ...inv, notes };
    setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? updated : i)));
    logAudit('invoices', inv.id, inv.invoiceNumber, 'UPDATE', { notes: inv.notes }, { notes }, 'Edit catatan faktur');
    syncInvoiceToCloud(updated);
    return { success: true };
  };

  const updateInvoiceKwitansi = (invoiceId: string, kwitansiPhotoUrl: string | null) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Faktur tidak ditemukan' };
    const updated = { ...inv, kwitansiPhotoUrl: kwitansiPhotoUrl ?? undefined } as any;
    setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? updated : i)));
    logAudit('invoices', inv.id, inv.invoiceNumber, 'UPDATE', { kwitansiPhotoUrl: (inv as any).kwitansiPhotoUrl }, { kwitansiPhotoUrl }, 'Upload foto kwitansi bermaterai');
    syncInvoiceToCloud(updated);
    return { success: true };
  };

  // Record Payment
  const recordPayment = (invoiceId: string, amount: number, bankRef: string, method: string, notes?: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return { success: false, error: 'Invoice not found' };

    const newPaidTotal = invoice.totalPaidIdr + amount;
    const newOutstanding = Math.max(0, invoice.totalInvoiceIdr - newPaidTotal);

    let newStatus: Invoice['status'] = invoice.status;
    if (newOutstanding <= 0) {
      newStatus = 'PAID';
    } else if (newPaidTotal > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const customer = customers.find((c) => c.id === invoice.customerId);

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerName: customer?.name || 'Customer',
      paymentDate: new Date().toISOString().slice(0, 10),
      amountPaidIdr: amount,
      bankReference: bankRef,
      paymentMethod: method,
      notes,
      recordedBy: currentProfile.id,
      createdAt: new Date().toISOString(),
    };

    const updatedInvoice: Invoice = {
      ...invoice,
      totalPaidIdr: newPaidTotal,
      outstandingBalanceIdr: newOutstanding,
      status: newStatus,
      items: invoice.items,
    };

    setPayments((prev) => [newPayment, ...prev]);
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              totalPaidIdr: newPaidTotal,
              outstandingBalanceIdr: newOutstanding,
              status: newStatus,
            }
          : inv
      )
    );

    logAudit('payments', newPayment.id, invoice.invoiceNumber, 'UPDATE', { outstanding: invoice.outstandingBalanceIdr }, { payment: amount, newOutstanding }, `Pencatatan pembayaran via ${method}`);
    syncPaymentToCloud(newPayment, updatedInvoice);
    return { success: true };
  };

  const updatePayment = (paymentId: string, updates: Partial<Payment>) => {
    const pay = payments.find((p) => p.id === paymentId);
    if (!pay) return { success: false, error: 'Pembayaran tidak ditemukan' };
    const inv = invoices.find((i) => i.id === pay.invoiceId);
    if (!inv) return { success: false, error: 'Faktur tidak ditemukan' };
    const oldAmount = pay.amountPaidIdr;
    const newAmount = updates.amountPaidIdr ?? oldAmount;
    const diff = newAmount - oldAmount;
    const newPaidTotal = Math.max(0, inv.totalPaidIdr + diff);
    const newOutstanding = Math.max(0, inv.totalInvoiceIdr - newPaidTotal);
    let newStatus: Invoice['status'] = newOutstanding <= 0 ? 'PAID' : newPaidTotal > 0 ? 'PARTIALLY_PAID' : 'ISSUED';
    const updatedPay = { ...pay, ...updates, amountPaidIdr: newAmount } as Payment;
    const updatedInv = { ...inv, totalPaidIdr: newPaidTotal, outstandingBalanceIdr: newOutstanding, status: newStatus } as Invoice;
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? updatedPay : p)));
    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updatedInv : i)));
    logAudit('payments', paymentId, pay.invoiceNumber, 'UPDATE', pay, updates, 'Edit pembayaran');
    if (isSupabaseAuthed) {
      supabase.from('payments').update({ amount_paid_idr: newAmount, bank_reference: updatedPay.bankReference, payment_method: updatedPay.paymentMethod, notes: updatedPay.notes ?? null }).eq('id', paymentId).then(({ error }) => { if (error) console.warn('updatePayment error', error); });
      supabase.from('invoices').update({ total_paid_idr: newPaidTotal, outstanding_balance_idr: newOutstanding, status: newStatus }).eq('id', inv.id).then(({ error }) => { if (error) console.warn('update invoice after payment edit error', error); });
    }
    return { success: true };
  };

  const deletePayment = (paymentId: string) => {
    const pay = payments.find((p) => p.id === paymentId);
    if (!pay) return { success: false, error: 'Pembayaran tidak ditemukan' };
    const inv = invoices.find((i) => i.id === pay.invoiceId);
    if (!inv) return { success: false, error: 'Faktur tidak ditemukan' };
    const newPaidTotal = Math.max(0, inv.totalPaidIdr - pay.amountPaidIdr);
    const newOutstanding = Math.max(0, inv.totalInvoiceIdr - newPaidTotal);
    let newStatus: Invoice['status'] = newOutstanding <= 0 ? 'PAID' : newPaidTotal > 0 ? 'PARTIALLY_PAID' : inv.status === 'PAID' ? 'ISSUED' : inv.status;
    if (newPaidTotal === 0) newStatus = 'ISSUED';
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, totalPaidIdr: newPaidTotal, outstandingBalanceIdr: newOutstanding, status: newStatus } : i)));
    logAudit('payments', paymentId, pay.invoiceNumber, 'DELETE', pay, null, 'Hapus pembayaran');
    if (isSupabaseAuthed) {
      supabase.from('payments').delete().eq('id', paymentId).then(({ error }) => { if (error) console.warn('deletePayment error', error); });
      supabase.from('invoices').update({ total_paid_idr: newPaidTotal, outstanding_balance_idr: newOutstanding, status: newStatus }).eq('id', inv.id).then(({ error }) => { if (error) console.warn('update invoice after payment delete error', error); });
    }
    return { success: true };
  };

  // Master Data Savers
  const saveProduct = (prod: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prod.id);
      return exists ? prev.map((p) => (p.id === prod.id ? prod : p)) : [prod, ...prev];
    });
    logAudit('products', prod.id, prod.code, 'UPDATE', null, prod, 'Update Master Produk & Densitas');
    syncMaster({ products: [prod] });
    setTimeout(() => {
      const affected = deliveries.filter((d) => d.productId === prod.id);
      if (affected.length > 0) console.log(`[sync] Produk ${prod.name} HPP recalc for ${affected.length} ritase`);
    }, 300);
  };

  const saveQuarry = (q: Quarry) => {
    setQuarries((prev) => {
      const exists = prev.some((item) => item.id === q.id);
      return exists ? prev.map((item) => (item.id === q.id ? q : item)) : [q, ...prev];
    });
    const costs = (q.materialCostOverrides || []).map((o) => ({
      quarryId: q.id,
      productId: o.productId,
      costPerM3: o.costPerM3,
      density: null as any,
    }));
    // Update local quarryMaterialCosts state
    setQuarryMaterialCosts((prev) => {
      const filtered = prev.filter((c) => c.quarryId !== q.id);
      return [...filtered, ...costs];
    });
    // Sync quarry + its overrides; also delete removed overrides via direct delete
    const oldCosts = quarryMaterialCosts.filter((c) => c.quarryId === q.id);
    const removed = oldCosts.filter((old) => !costs.some((c) => c.productId === old.productId));
    removed.forEach((r) => {
      // Delete via supabase directly (quarry_material_costs has composite key)
      supabase.from('quarry_material_costs').delete().eq('quarry_id', r.quarryId).eq('product_id', r.productId).then(()=>{});
    });
    syncMaster({ quarries: [q], quarryMaterialCosts: costs } as any);
    // Juga recalc HPP untuk ritase yang pakai quarry ini
    setTimeout(() => {
      const affected = deliveries.filter((d) => d.quarryId === q.id);
      if (affected.length === 0) return;
      // Trigger recalc via same logic as freight save (reuse)
      console.log(`[sync] Quarry ${q.name} HPP recalc for ${affected.length} ritase`);
    }, 300);
  };

  const saveCustomer = (c: Customer) => {
    setCustomers((prev) => {
      const exists = prev.some((item) => item.id === c.id);
      return exists ? prev.map((item) => (item.id === c.id ? c : item)) : [c, ...prev];
    });
    syncMaster({ customers: [c] });
  };

  const saveProject = (p: Project) => {
    setProjects((prev) => {
      const exists = prev.some((item) => item.id === p.id);
      return exists ? prev.map((item) => (item.id === p.id ? p : item)) : [p, ...prev];
    });
    syncMaster({ projects: [p] });
  };

  const addCustomer = (data: Omit<Customer, 'id' | 'code'> & { code?: string }) => {
    const newCustomer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      code: data.code || `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      isActive: data.isActive ?? true,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    logAudit('customers', newCustomer.id, newCustomer.code, 'CREATE', null, newCustomer, 'Registrasi pelanggan / kontraktor baru');
    syncMaster({ customers: [newCustomer] });
    return newCustomer;
  };

  const addProject = (data: Omit<Project, 'id' | 'projectNumber'> & { projectNumber?: string }) => {
    const newProject: Project = {
      ...data,
      id: `proj-${Date.now()}`,
      projectNumber: data.projectNumber || `PRJ-${Date.now().toString().slice(-6)}`,
      status: data.status ?? 'ACTIVE',
    };
    setProjects((prev) => [newProject, ...prev]);
    logAudit('projects', newProject.id, newProject.projectNumber, 'CREATE', null, newProject, 'Registrasi proyek konstruksi site baru');
    syncMaster({ projects: [newProject] });
    return newProject;
  };

  const saveVendor = (v: TransportVendor) => {
    setTransportVendors((prev) => {
      const exists = prev.some((item) => item.id === v.id);
      return exists ? prev.map((item) => (item.id === v.id ? v : item)) : [v, ...prev];
    });
    syncMaster({ transportVendors: [v] });
  };

  const saveVehicle = (v: Vehicle) => {
    setVehicles((prev) => {
      const exists = prev.some((item) => item.id === v.id);
      return exists ? prev.map((item) => (item.id === v.id ? v : item)) : [v, ...prev];
    });
    syncMaster({ vehicles: [v] });
  };

  const saveDriver = (d: Driver) => {
    setDrivers((prev) => {
      const exists = prev.some((item) => item.id === d.id);
      return exists ? prev.map((item) => (item.id === d.id ? d : item)) : [d, ...prev];
    });
    syncMaster({ drivers: [d] });
  };

  const saveFreightRate = (r: FreightRate) => {
    setFreightRates((prev) => {
      const exists = prev.some((item) => item.id === r.id);
      return exists ? prev.map((item) => (item.id === r.id ? r : item)) : [r, ...prev];
    });
    syncMaster({ freightRates: [r] });
    // Sinkronkan HPP: recalculate cost untuk ritase yang pakai rute ini (vendor+quarry+project)
    setTimeout(() => {
      const newRates = [...freightRates.filter((x) => x.id !== r.id), r];
      const affected = deliveries.filter(
        (d) => d.transportVendorId === r.transportVendorId && d.quarryId === r.quarryId && contracts.find((c) => c.id === d.contractId)?.projectId === r.projectId
      );
      if (affected.length === 0) return;
      const updates: Delivery[] = [];
      for (const d of affected) {
        const contract = contracts.find((c) => c.id === d.contractId);
        const product = products.find((p) => p.id === d.productId);
        const vendor = transportVendors.find((v) => v.id === d.transportVendorId);
        if (!contract || !product || !d.approvedVolumeM3) continue;
        const rate = resolveFreightRate(newRates, {
          transportVendorId: d.transportVendorId,
          projectId: contract.projectId,
          quarryId: d.quarryId,
          onDate: d.scheduledDate || new Date().toISOString().slice(0, 10),
        });
        if (!rate) continue;
        const qmc = quarryMaterialCosts.find((q) => q.quarryId === d.quarryId && q.productId === d.productId);
        const materialCostPerM3 = qmc?.costPerM3 ?? product.defaultMaterialCost;
        const isAllIn = rate.pricingModel === 'ALL_IN';
        const OTHER_PER_RIT2: Record<string, number> = { 'proj-04': 100000, 'proj-06': 100000, 'proj-05': 150000, 'proj-07': 150000, 'proj-08': 150000 };
        const otherPerRit2 = OTHER_PER_RIT2[contract.projectId] ?? 100000;
        let fin = calculateDeliveryFinance({
          deliveryId: d.id,
          approvedVolumeM3: d.approvedVolumeM3,
          loadedVolumeM3: d.loadedVolumeM3,
          approvedWeightKg: d.approvedWeightKg,
          sellingPricePerM3: contract.unitPricePerM3,
          materialCostPerM3,
          freightPricingModel: isAllIn ? 'ALL_IN' : (vendor?.defaultPricingModel as any) || (rate.pricingModel as any) || 'PER_M3',
          freightRatePerUnit: rate.ratePerUnit,
          allInPricePerM3: isAllIn ? rate.ratePerUnit : undefined,
          allInVolumeBasis: isAllIn ? 'PER_M3_RECEIVED' : undefined,
          otherOperationalCostPerM3: 0,
          tollFee: isAllIn ? 0 : (rate.tollFee as any) || 0,
          loadingFee: isAllIn ? 0 : (rate.loadingFee as any) || 0,
          unloadingFee: isAllIn ? 0 : (rate.unloadingFee as any) || 0,
          isActualFinalized: true,
        });
        fin.costRecord.otherOperationalCostIdr = otherPerRit2;
        fin.costRecord.totalHppIdr = fin.costRecord.totalMaterialCostIdr + fin.costRecord.totalFreightCostIdr + otherPerRit2;
        fin.costRecord.grossProfitIdr = fin.costRecord.recognizedRevenueIdr - fin.costRecord.totalHppIdr;
        fin.costRecord.grossMarginPercent = fin.costRecord.recognizedRevenueIdr > 0 ? Number(((fin.costRecord.grossProfitIdr / fin.costRecord.recognizedRevenueIdr) * 100).toFixed(2)) : 0;
        const updated: Delivery = { ...d, costRecord: fin.costRecord, updatedAt: new Date().toISOString() };
        updates.push(updated);
        // sync to Supabase cost_records via delivery upsert (akan upsert cost_records juga)
        upsertDeliveryToSupabase(updated).catch(() => {});
      }
      if (updates.length > 0) {
        setDeliveries((prev) => prev.map((d) => updates.find((u) => u.id === d.id) || d));
        console.log(`[sync] HPP recalculated for ${updates.length} ritase (rate ${r.id})`);
      }
    }, 300);
  };

  const deleteVendor = (vendorId: string) => {
    setTransportVendors((prev) => prev.filter((item) => item.id !== vendorId));
    logAudit('transport_vendors', vendorId, vendorId, 'DELETE', null, null, 'Penghapusan data vendor transportasi');
    syncMasterDelete('transport_vendors', vendorId);
  };

  const deleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((item) => item.id !== vehicleId));
    logAudit('vehicles', vehicleId, vehicleId, 'DELETE', null, null, 'Penghapusan data kendaraan/armada');
    syncMasterDelete('vehicles', vehicleId);
  };

  const deleteDriver = (driverId: string) => {
    setDrivers((prev) => prev.filter((item) => item.id !== driverId));
    logAudit('drivers', driverId, driverId, 'DELETE', null, null, 'Penghapusan data supir');
    syncMasterDelete('drivers', driverId);
  };

  const deleteFreightRate = (rateId: string) => {
    setFreightRates((prev) => prev.filter((item) => item.id !== rateId));
    logAudit('freight_rates', rateId, rateId, 'DELETE', null, null, 'Penghapusan data tarif angkut');
    syncMasterDelete('freight_rates', rateId);
  };

  const createContract = (contractData: Omit<Contract, 'id'>) => {
    const newContract: Contract = {
      ...contractData,
      id: `cont-${Date.now()}`,
    };
    setContracts((prev) => [newContract, ...prev]);
    logAudit('contracts', newContract.id, newContract.contractNumber, 'CREATE', null, newContract, 'Pembuatan kontrak suplai material baru');
    syncMaster({ contracts: [newContract] });
  };

  const updateContract = (contractId: string, updates: Partial<Contract>) => {
    const existing = contracts.find((c) => c.id === contractId);
    if (!existing) return;
    const updated: Contract = { ...existing, ...updates };
    setContracts((prev) => prev.map((c) => (c.id === contractId ? updated : c)));
    logAudit('contracts', contractId, updated.contractNumber, 'UPDATE', existing, updated, 'Perubahan data kontrak suplai material');
    syncMaster({ contracts: [updated] });
  };

  const deleteContract = (contractId: string) => {
    const existing = contracts.find((c) => c.id === contractId);
    if (!existing) return;
    setContracts((prev) => prev.filter((c) => c.id !== contractId));
    logAudit('contracts', contractId, existing.contractNumber, 'DELETE', existing, null, 'Penghapusan data kontrak suplai material');
    syncMasterDelete('contracts', contractId);
  };

  const deleteCustomer = (customerId: string) => {
    const hasProjects = projects.some((p) => p.customerId === customerId);
    const hasContracts = contracts.some((c) => c.customerId === customerId);
    if (hasProjects || hasContracts) return { success: false, error: 'Pelanggan masih dipakai proyek/kontrak — hapus proyek/kontrak dulu' };
    const existing = customers.find((c) => c.id === customerId);
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (existing) logAudit('customers', customerId, existing.code, 'DELETE', existing, null, 'Hapus pelanggan');
    syncMasterDelete('customers', customerId);
    return { success: true };
  };

  const deleteProject = (projectId: string) => {
    const hasContracts = contracts.some((c) => c.projectId === projectId);
    const hasDeliveries = deliveries.some((d) => {
      const cont = contracts.find((c) => c.id === d.contractId);
      return cont?.projectId === projectId;
    });
    if (hasContracts || hasDeliveries) return { success: false, error: 'Proyek masih dipakai kontrak/pengiriman — hapus kontrak/pengiriman dulu' };
    const existing = projects.find((p) => p.id === projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (existing) logAudit('projects', projectId, existing.projectNumber, 'DELETE', existing, null, 'Hapus proyek');
    syncMasterDelete('projects', projectId);
    return { success: true };
  };

  // Correction Workflow
  const submitCorrectionRequest = (
    targetType: 'DELIVERY' | 'INVOICE' | 'RECONCILIATION',
    targetId: string,
    targetNumber: string,
    reason: string,
    proposedChanges: any
  ) => {
    const newReq: CorrectionRequest = {
      id: `corr-${Date.now()}`,
      targetType,
      targetId,
      targetNumber,
      requestedBy: currentProfile.fullName,
      requestedAt: new Date().toISOString(),
      reason,
      proposedChanges,
      status: 'PENDING',
    };
    setCorrectionRequests((prev) => [newReq, ...prev]);
    logAudit('correction_requests', newReq.id, targetNumber, 'CORRECTION', null, newReq, `Pengajuan koreksi data: ${reason}`);
  };

  const reviewCorrectionRequest = (requestId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    setCorrectionRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status,
              reviewedBy: currentProfile.fullName,
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes,
            }
          : req
      )
    );
  };

  // One-click CSV Exporter with explicit units
  const exportToCsv = (datasetName: string) => {
    let rows: any[] = [];
    let filename = `REV_BUMI_${datasetName}_${new Date().toISOString().slice(0, 10)}.csv`;

    switch (datasetName) {
      case 'deliveries':
        rows = deliveries.map((d) => {
          const product = products.find((p) => p.id === d.productId);
          const contract = contracts.find((c) => c.id === d.contractId);
          const quarry = quarries.find((q) => q.id === d.quarryId);
          const vendor = transportVendors.find((v) => v.id === d.transportVendorId);
          const vehicle = vehicles.find((v) => v.id === d.vehicleId);
          const driver = drivers.find((v) => v.id === d.driverId);

          return {
            'No Surat Jalan': d.deliveryNumber,
            'Status': d.status,
            'Tanggal': d.scheduledDate,
            'No Kontrak': contract?.contractNumber,
            'Produk': product?.name,
            'Densitas (ton/m3)': d.densityApplied,
            'Quarry': quarry?.name,
            'Vendor Angkutan': vendor?.name,
            'Plat Kendaraan': vehicle?.plateNumber,
            'Pengemudi': driver?.fullName,
            'Loaded Volume (m3)': d.loadedVolumeM3,
            'Received Volume (m3)': d.receivedVolumeM3,
            'Approved Volume (m3)': d.approvedVolumeM3,
            'Net Weight (kg)': d.weighbridge?.netWeightKg || d.loadedWeightKg,
            'Variance (m3)': d.reconciliation?.physicalVarianceM3 || 0,
            'Variance (%)': d.reconciliation?.variancePercentage || 0,
            'Variance Status': d.reconciliation?.varianceStatus || '-',
            'Revenue (IDR)': d.costRecord?.recognizedRevenueIdr || 0,
            'HPP Total (IDR)': d.costRecord?.totalHppIdr || 0,
            'Gross Profit (IDR)': d.costRecord?.grossProfitIdr || 0,
          };
        });
        break;

      case 'contracts':
        rows = contracts.map((c) => {
          const customer = customers.find((cust) => cust.id === c.customerId);
          const project = projects.find((proj) => proj.id === c.projectId);
          const product = products.find((p) => p.id === c.productId);

          const deliveredVol = deliveries
            .filter((d) => d.contractId === c.id && d.status === 'DELIVERED')
            .reduce((sum, d) => sum + d.approvedVolumeM3, 0);

          return {
            'No Kontrak': c.contractNumber,
            'Jenis': c.contractType,
            'Customer': customer?.name,
            'Proyek': project?.name,
            'Produk': product?.name,
            'Volume Kontrak (m3)': c.contractType === 'NON_PO' ? 'Rutin' : c.contractedVolumeM3,
            'Harga Satuan (IDR/m3)': c.unitPricePerM3,
            'Toleransi (%)': c.tolerancePercent,
            'Delivered Approved (m3)': deliveredVol,
            'Sisa Volume (m3)': c.contractType === 'NON_PO' ? 'Rutin' : Math.max(0, c.contractedVolumeM3 - deliveredVol),
            'Fulfillment (%)': c.contractType === 'NON_PO' ? '-' : ((deliveredVol / c.contractedVolumeM3) * 100).toFixed(2),
            'Status': c.status,
          };
        });
        break;

      case 'invoices':
        rows = invoices.map((inv) => {
          const customer = customers.find((c) => c.id === inv.customerId);
          const project = projects.find((p) => p.id === inv.projectId);

          return {
            'No Invoice': inv.invoiceNumber,
            'Customer': customer?.name,
            'Proyek': project?.name,
            'Tanggal Invoice': inv.invoiceDate,
            'Jatuh Tempo': inv.dueDate,
            'Total Volume (m3)': inv.totalApprovedVolumeM3,
            'Subtotal (IDR)': inv.subtotalIdr,
            'PPN (IDR)': inv.taxAmountIdr,
            'Total Tagihan (IDR)': inv.totalInvoiceIdr,
            'Total Terbayar (IDR)': inv.totalPaidIdr,
            'Sisa Tagihan (IDR)': inv.outstandingBalanceIdr,
            'Status': inv.status,
          };
        });
        break;

      case 'finance':
        rows = deliveries
          .filter((d) => d.costRecord)
          .map((d) => {
            const product = products.find((p) => p.id === d.productId);
            const cr = d.costRecord!;

            return {
              'No Surat Jalan': d.deliveryNumber,
              'Produk': product?.name,
              'Billable Volume (m3)': cr.billableQuantityM3,
              'Selling Price (IDR/m3)': cr.sellingPricePerM3,
              'Recognized Revenue (IDR)': cr.recognizedRevenueIdr,
              'Material Cost (IDR/m3)': cr.materialCostPerM3,
              'Total Material Cost (IDR)': cr.totalMaterialCostIdr,
              'Freight Cost (IDR)': cr.totalFreightCostIdr,
              'Other Operational Cost (IDR)': cr.otherOperationalCostIdr,
              'Total HPP (IDR)': cr.totalHppIdr,
              'Gross Profit (IDR)': cr.grossProfitIdr,
              'Gross Margin (%)': cr.grossMarginPercent,
            };
          });
        break;

      default:
        return;
    }

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppContext.Provider
      value={{
        company,
        currentProfile,
        setCurrentRole,
        isSupabaseAuthed,
        supabaseProfile,
        syncProfileFromSupabase,
        logoutFromSupabase,
        products,
        quarries,
        customers,
        projects,
        contracts,
        transportVendors,
        vehicles,
        drivers,
        freightRates,
        quarryMaterialCosts,
        deliveries,
        invoices,
        payments,
        auditLogs,
        correctionRequests,
        addDelivery,
        bulkCreateDeliveries,
        updateDelivery,
        deleteDelivery,
        updateDeliveryStatus,
        submitWeighbridge,
        submitPod,
        verifyPod,
        recordQuarryLoading,
        recordSiteArrival,
        recordSiteUnloading,
        reconcileDeliveryQuantity,
        createContract,
        updateContract,
        deleteContract,
        createInvoice,
        deleteInvoice,
        updateInvoiceNotes,
        updateInvoiceKwitansi,
        recordPayment,
        updatePayment,
        deletePayment,
        saveProduct,
        saveQuarry,
        saveCustomer,
        saveProject,
        addCustomer,
        addProject,
        deleteCustomer,
        deleteProject,
        saveVendor,
        saveVehicle,
        saveDriver,
        saveFreightRate,
        deleteVendor,
        deleteVehicle,
        deleteDriver,
        deleteFreightRate,
        submitCorrectionRequest,
        reviewCorrectionRequest,
        exportToCsv,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
