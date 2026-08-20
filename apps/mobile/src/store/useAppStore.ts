import { create } from 'zustand';
import {
  calculateVariance,
  calculateVolumeFromDimensions,
  canTransition,
  convertWeightToVolume,
  evaluateTolerance,
} from 'shared-engine';
import type { DeliveryStatus } from 'shared-types';
// seed tidak dipakai lagi — fallback last sync, bukan prod-01
// import seed dihapus sesuai permintaan "jangan pakai seed lagi"
import {
  deleteMobileDeliveryFromSupabase,
  upsertMobileDeliveryToSupabase,
} from '../utils/supabaseData';
import {
  bumpAttempts,
  dequeueDelete,
  dequeueDelivery,
  enqueueDelete,
  enqueueDelivery,
  loadDeleteQueue,
  loadQueue,
} from '../utils/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuditLogItem,
  ContractItem,
  DeliveryItem,
  FieldProfile,
  FreightRateItem,
  MobileMasterBundle,
  MobileVendorSupplyType,
  PickItem,
  QuarryLoadingInput,
  QuarryMaterialCost,
  UnloadingInput,
  VehicleItem,
  VendorItem,
} from '../types';

export interface NewRitaseInput {
  contractId: string;
  productId: string;
  quarryId: string;
  transportVendorId: string;
  vehicleId: string;
  driverName: string;
  driverPhone: string;
}

interface AppState {
  profile: FieldProfile;
  deliveries: DeliveryItem[];
  auditLogs: AuditLogItem[];
  products: PickItem[];
  quarries: PickItem[];
  vendors: VendorItem[];
  vehicles: VehicleItem[];
  contracts: ContractItem[];
  freightRates: FreightRateItem[];
  quarryMaterialCosts: QuarryMaterialCost[];
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  isReplaying: boolean;
  setProfile: (profile: FieldProfile) => void;
  setOnline: (online: boolean) => void;
  refreshQueueStatus: () => Promise<void>;
  hydrateMaster: (bundle: MobileMasterBundle) => void;
  hydrateDeliveries: (deliveries: DeliveryItem[]) => void;
  getDensity: (productId: string, quarryId: string) => number;
  addVendor: (name: string, detail?: string, supplyType?: MobileVendorSupplyType) => string;
  addVehicle: (transportVendorId: string, name: string, detail?: string) => string;
  addRitase: (input: NewRitaseInput) => void;
  editRitase: (id: string, input: NewRitaseInput, reason?: string) => void;
  deleteRitase: (id: string, reason: string) => void;
  recordQuarryLoading: (id: string, input: QuarryLoadingInput) => void;
  dispatchTruck: (id: string, signature: string, signatureDriverQuarry?: string) => void;
  confirmArrival: (id: string, gps: { lat: number; lng: number }) => void;
  recordUnloading: (id: string, input: UnloadingInput) => void;
  submitPod: (id: string, signatureDriver: string) => void;
  advancePod: (id: string) => void;
  reset: () => void;
}

const densityByProduct = (productId: string): number => {
  const map: Record<string, number> = {
    'prod-01': 1.6,
    'prod-02': 1.7,
    'prod-03': 1.55,
    'prod-04': 1.5,
    'prod-05': 1.65,
  };
  // fallback legacy P1..P5
  const legacy: Record<string, number> = { P1: 1.6, P2: 1.7, P3: 1.45, P4: 1.5, P5: 1.7 };
  return map[productId] ?? legacy[productId] ?? 1.6;
};

const patchDelivery = (
  deliveries: DeliveryItem[],
  id: string,
  patch: Partial<DeliveryItem>
): DeliveryItem[] => deliveries.map((d) => (d.id === id ? { ...d, ...patch } : d));

const auditEntry = (
  actor: string,
  action: AuditLogItem['action'],
  entityId: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  reason?: string,
  entityType: AuditLogItem['entityType'] = 'RITASE'
): AuditLogItem => ({
  id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  actor,
  action,
  entityType,
  entityId,
  timestamp: new Date().toISOString(),
  reason,
  oldValues,
  newValues,
});

const KEY_LAST_MASTER = 'rev_last_master';
const KEY_LAST_DELIVERIES = 'rev_last_deliveries';

const persistDeliveries = (deliveries: DeliveryItem[]) => {
  void AsyncStorage.setItem(KEY_LAST_DELIVERIES, JSON.stringify(deliveries));
};

export async function loadLastSync(): Promise<{ master?: MobileMasterBundle; deliveries?: DeliveryItem[] }> {
  try {
    const [m, d] = await Promise.all([AsyncStorage.getItem(KEY_LAST_MASTER), AsyncStorage.getItem(KEY_LAST_DELIVERIES)]);
    return {
      master: m ? (JSON.parse(m) as MobileMasterBundle) : undefined,
      deliveries: d ? (JSON.parse(d) as DeliveryItem[]) : undefined,
    };
  } catch {
    return {};
  }
}

const syncDelivery = (delivery: DeliveryItem | undefined) => {
  if (!delivery) return;
  const online = useAppStore.getState().isOnline;
  const refresh = () => void useAppStore.getState().refreshQueueStatus();
  if (!online) {
    void enqueueDelivery(delivery).then(refresh).catch(() => {});
    return;
  }
  void upsertMobileDeliveryToSupabase(delivery)
    .then((r) => {
      const failed = r.tables.some((t) => !t.ok);
      if (failed) void enqueueDelivery(delivery).then(refresh);
      else void dequeueDelivery(delivery.id).then(refresh);
    })
    .catch(() => {
      void enqueueDelivery(delivery).then(refresh);
    });
};

const syncDelete = (id: string) => {
  const online = useAppStore.getState().isOnline;
  const refresh = () => void useAppStore.getState().refreshQueueStatus();
  if (!online) {
    void enqueueDelete(id).then(refresh);
    return;
  }
  void deleteMobileDeliveryFromSupabase(id)
    .then((r) => {
      if (!r.ok) void enqueueDelete(id).then(refresh);
      else void dequeueDelete(id).then(refresh);
    })
    .catch(() => void enqueueDelete(id).then(refresh));
};

const replayOfflineQueue = async () => {
  const pending = await loadQueue();
  for (const item of pending) {
    try {
      const r = await upsertMobileDeliveryToSupabase(item.delivery);
      if (r.tables.every((t) => t.ok)) {
        await dequeueDelivery(item.delivery.id);
        continue;
      }
      // cek duplicate delivery_number (23505) → regenerasi SJ/RBN dengan suffix baru
      const msg = r.tables
        .filter((t) => t.error)
        .map((t) => t.error)
        .join(' ')
        .toLowerCase();
      const isDuplicate = msg.includes('duplicate') || msg.includes('23505') || msg.includes('delivery_number');
      if (isDuplicate) {
        const d = new Date();
        const todayStr = d.toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
        const newNumber = `SJ/RBN/${todayStr}/${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}-${rand}`;
        const updated = { ...item.delivery, deliveryNumber: newNumber };
        // update state lokal agar UI konsisten
        useAppStore.setState((s) => ({
          deliveries: s.deliveries.map((x) => (x.id === updated.id ? updated : x)),
        }));
        const r2 = await upsertMobileDeliveryToSupabase(updated);
        if (r2.tables.every((t) => t.ok)) await dequeueDelivery(updated.id);
        else await bumpAttempts(item.delivery.id);
        continue;
      }
      await bumpAttempts(item.delivery.id);
    } catch {
      await bumpAttempts(item.delivery.id);
    }
  }
  const dels = await loadDeleteQueue();
  for (const id of dels) {
    try {
      const r = await deleteMobileDeliveryFromSupabase(id);
      if (r.ok) await dequeueDelete(id);
    } catch {}
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  profile: { name: 'Petugas Quarry', role: 'QUARRY_CHECKER' },
  deliveries: [],
  auditLogs: [],
  products: [],
  quarries: [],
  vendors: [],
  vehicles: [],
  contracts: [],
  freightRates: [],
  quarryMaterialCosts: [],
  isOnline: false,
  pendingCount: 0,
  lastSyncAt: null,
  isReplaying: false,

  setProfile: (profile) => set({ profile }),

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) {
      set({ isReplaying: true });
      void replayOfflineQueue()
        .then(async () => {
          const q = await loadQueue();
          const d = await loadDeleteQueue();
          set({ pendingCount: q.length + d.length, lastSyncAt: new Date().toISOString(), isReplaying: false });
        })
        .catch(() => set({ isReplaying: false }));
    } else {
      void get().refreshQueueStatus();
    }
  },

  refreshQueueStatus: async () => {
    const q = await loadQueue();
    const d = await loadDeleteQueue();
    set({ pendingCount: q.length + d.length });
  },

  hydrateMaster: (bundle) => {
    set({
      products: bundle.products,
      quarries: bundle.quarries,
      vendors: bundle.vendors,
      vehicles: bundle.vehicles,
      contracts: bundle.contracts,
      freightRates: bundle.freightRates,
      quarryMaterialCosts: bundle.quarryMaterialCosts ?? [],
    });
    void AsyncStorage.setItem(KEY_LAST_MASTER, JSON.stringify(bundle));
  },

  hydrateDeliveries: (deliveries) => {
    set({ deliveries });
    void AsyncStorage.setItem(KEY_LAST_DELIVERIES, JSON.stringify(deliveries));
  },

  getDensity: (productId, quarryId) => {
    const state = get();
    const override = state.quarryMaterialCosts.find((x) => x.productId === productId && x.quarryId === quarryId);
    if (override?.density != null) return override.density;
    return densityByProduct(productId);
  },

  addVendor: (name, detail, supplyType = 'TRANSPORT_ONLY') => {
    const id = `V-${Date.now()}`;
    set((state) => {
      const entry = auditEntry(
        state.profile.name,
        'CREATE',
        id,
        undefined,
        { name, detail, supplyType },
        'Tambah vendor transportasi baru dari form ritase',
        'VENDOR'
      );
      return {
        vendors: [...state.vendors, { id, name, detail: detail || '0 armada', supplyType }],
        auditLogs: [entry, ...state.auditLogs],
      };
    });
    return id;
  },

  addVehicle: (transportVendorId, name, detail) => {
    const id = `VH-${Date.now()}`;
    set((state) => {
      const entry = auditEntry(
        state.profile.name,
        'CREATE',
        id,
        undefined,
        { transportVendorId, name, detail },
        'Tambah armada truk baru dari form ritase',
        'VEHICLE'
      );
      return {
        vehicles: [...state.vehicles, { id, name, detail: detail || '', vendorId: transportVendorId }],
        vendors: state.vendors.map((v) =>
          v.id === transportVendorId
            ? {
                ...v,
                detail: `${state.vehicles.filter((vh) => vh.vendorId === v.id).length + 1} armada`,
              }
            : v
        ),
        auditLogs: [entry, ...state.auditLogs],
      };
    });
    return id;
  },

  addRitase: (input) => {
    const state = get();
    const vehicle = state.vehicles.find((v) => v.id === input.vehicleId);
    const quarry = state.quarries.find((q) => q.id === input.quarryId);
    const contract = state.contracts.find((c) => c.id === input.contractId);
    const d = new Date();
    const todayStr = d.toISOString().slice(0, 7).replace(/-/g, '');
    const count = state.deliveries.length + 1;
    const nextNumber = `SJ/RBN/${todayStr}/${String(count).padStart(3, '0')}`;
    const now = d.toISOString();
    const delivery: DeliveryItem = {
      id: `D-${Date.now()}`,
      deliveryNumber: nextNumber,
      contractId: input.contractId,
      productId: input.productId,
      quarryId: input.quarryId,
      transportVendorId: input.transportVendorId,
      vehicleId: input.vehicleId,
      driverName: input.driverName,
      driverPhone: input.driverPhone,
      plateNumber: vehicle?.name ?? '',
      status: 'SCHEDULED',
      scheduledAt: new Date().toISOString(),
      createdAt: now,
      loadedVolumeM3: 0,
      // Auto-populate GPS data for ETA feature
      evidenceAt: now,
      evidenceGps: quarry?.gps,
      evidencePlace: quarry?.name,
      gps: contract?.gps,
    };
    const entry = auditEntry(state.profile.name, 'CREATE', delivery.id, undefined, {
      ...input,
      plateNumber: delivery.plateNumber,
      deliveryNumber: nextNumber,
    });
    set({
      deliveries: [delivery, ...state.deliveries],
      auditLogs: [entry, ...state.auditLogs],
    });
    syncDelivery(delivery);
  },

  editRitase: (id, input, reason) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery || delivery.status !== 'SCHEDULED') return;
    const vehicle = state.vehicles.find((v) => v.id === input.vehicleId);
    const oldValues: Record<string, unknown> = {
      contractId: delivery.contractId,
      productId: delivery.productId,
      quarryId: delivery.quarryId,
      transportVendorId: delivery.transportVendorId,
      vehicleId: delivery.vehicleId,
      driverName: delivery.driverName,
      driverPhone: delivery.driverPhone,
      plateNumber: delivery.plateNumber,
    };
    const newValues: Record<string, unknown> = {
      ...input,
      plateNumber: vehicle?.name ?? '',
    };
    const entry = auditEntry(
      state.profile.name,
      'UPDATE',
      id,
      oldValues,
      newValues,
      reason
    );
    set({
      deliveries: patchDelivery(state.deliveries, id, newValues),
      auditLogs: [entry, ...state.auditLogs],
    });
    const updated = get().deliveries.find((d) => d.id === id);
    syncDelivery(updated);
  },

  deleteRitase: (id, reason) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery || delivery.status !== 'SCHEDULED') return;
    const entry = auditEntry(state.profile.name, 'DELETE', id, { ...delivery }, undefined, reason);
    const next = state.deliveries.filter((d) => d.id !== id);
    set({
      deliveries: next,
      auditLogs: [entry, ...state.auditLogs],
    });
    persistDeliveries(next);
    syncDelete(id);
  },

  recordQuarryLoading: (id, input) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery) return;
    if (!canTransition(delivery.status, 'LOADING')) return;

    let loadedVolumeM3 = 0;
    let loadedWeightKg = 0;
    let densityApplied = input.method === 'WEIGHBRIDGE' ? input.densityTonPerM3 : state.getDensity(delivery.productId, delivery.quarryId);
    const base: Partial<DeliveryItem> = { status: 'LOADING', densityApplied, quarryCheckerName: state.profile.name };

    if (input.method === 'WEIGHBRIDGE') {
      loadedVolumeM3 = convertWeightToVolume(
        input.grossKg,
        input.tareKg,
        input.densityTonPerM3
      );
      loadedWeightKg = Math.max(0, input.grossKg - input.tareKg);
      Object.assign(base, {
        loadingMethod: 'WEIGHBRIDGE' as const,
        grossKg: input.grossKg,
        tareKg: input.tareKg,
        loadedWeightKg,
      });
    } else {
      loadedVolumeM3 = calculateVolumeFromDimensions(
        input.lengthM,
        input.widthM,
        input.heightM
      );
      loadedWeightKg = Math.round(loadedVolumeM3 * densityApplied * 1000);
      Object.assign(base, {
        loadingMethod: 'DIMENSION' as const,
        dimension: { lengthM: input.lengthM, widthM: input.widthM, heightM: input.heightM },
        loadedWeightKg,
      });
    }

    set({
      deliveries: patchDelivery(state.deliveries, id, {
        ...base,
        loadedVolumeM3,
        loadedWeightKg,
        densityApplied,
        quarryCheckerName: state.profile.name,
        evidenceAt: input.evidenceAt,
        photoUri: input.photoUri,
        evidenceGps: input.evidenceGps,
        evidencePlace: input.evidencePlace,
      }),
    });
    syncDelivery(get().deliveries.find((d) => d.id === id));
  },

  dispatchTruck: (id, signature, signatureDriverQuarry) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery || !canTransition(delivery.status, 'IN_TRANSIT')) return;
    set({
      deliveries: patchDelivery(state.deliveries, id, {
        status: 'IN_TRANSIT',
        signatureQuarry: signature,
        ...(signatureDriverQuarry ? { signatureDriverQuarry } : {}),
      }),
    });
    syncDelivery(get().deliveries.find((d) => d.id === id));
  },

  confirmArrival: (id, gps) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery || !canTransition(delivery.status, 'ARRIVED')) return;
    set({
      deliveries: patchDelivery(state.deliveries, id, { status: 'ARRIVED', gps }),
    });
    syncDelivery(get().deliveries.find((d) => d.id === id));
  },

  recordUnloading: (id, input) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery || !canTransition(delivery.status, 'UNLOADED')) return;

    const { varianceM3, variancePercent } = calculateVariance(
      delivery.loadedVolumeM3,
      input.receivedVolumeM3
    );
    const tolerance = 2.0;
    evaluateTolerance(variancePercent, tolerance);

    set({
      deliveries: patchDelivery(state.deliveries, id, {
        status: 'UNLOADED',
        receivedVolumeM3: input.receivedVolumeM3,
        receivedAt: new Date().toISOString(),
        gps: input.gps,
        signatureSite: input.signatureSite,
        varianceM3,
        variancePercent,
      }),
    });
    syncDelivery(get().deliveries.find((d) => d.id === id));
  },

  submitPod: (id, signatureDriver) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery || !canTransition(delivery.status, 'POD_SUBMITTED')) return;
    set({
      deliveries: patchDelivery(state.deliveries, id, {
        status: 'POD_SUBMITTED',
        signatureDriver,
      }),
    });
    syncDelivery(get().deliveries.find((d) => d.id === id));
  },

  advancePod: (id) => {
    const state = get();
    const delivery = state.deliveries.find((d) => d.id === id);
    if (!delivery) return;
    const target: DeliveryStatus | null =
      delivery.status === 'POD_SUBMITTED'
        ? 'POD_VERIFIED'
        : delivery.status === 'POD_VERIFIED'
        ? 'DELIVERED'
        : null;
    if (!target || !canTransition(delivery.status, target)) return;
    const patch: Partial<DeliveryItem> = { status: target };
    if (target === 'DELIVERED') patch.deliveredAt = new Date().toISOString();
    const entry = auditEntry(
      state.profile.name,
      'UPDATE',
      id,
      { status: delivery.status },
      { status: target }
    );
    set({
      deliveries: patchDelivery(state.deliveries, id, patch),
      auditLogs: [entry, ...state.auditLogs],
    });
    syncDelivery(get().deliveries.find((d) => d.id === id));
  },

  reset: () => set({ deliveries: [] }),
}));