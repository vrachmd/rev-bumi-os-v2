import { supabase } from './supabase';
import type {
  ContractItem,
  DeliveryItem,
  FreightRateItem,
  MobileMasterBundle,
  MobileSyncResult,
  PickItem,
  VehicleItem,
  VendorItem,
} from '../types';

/**
 * Service layer data mobile ↔ Supabase (Fase 0.6).
 * Memetakan bentuk aplikasi mobile (camelCase) ke tabel DB (snake_case)
 * dan sebaliknya. Saat online, seluruh master & ritase bersumber dari
 * Supabase (ID DB: prod-01, quarry-01, cont-01, vendor-01, veh-01, ...);
 * seed lokal hanya fallback saat mode demo/offline.
 * Backend dapat ditukar (Supabase → GCP/Alibaba) di sini tanpa mengubah UI.
 */

const MAP_MEASUREMENT: Record<string, DeliveryItem['measurementMode']> = {
  ACTUAL_MEASURED: 'ACTUAL_MEASURED',
  CALCULATED_FROM_WEIGHT: 'CALCULATED_FROM_WEIGHT',
  ESTIMATED: 'ESTIMATED',
};

const toMeasurementMode = (mode: string | null | undefined): DeliveryItem['measurementMode'] =>
  MAP_MEASUREMENT[mode ?? ''] ?? 'ACTUAL_MEASURED';

const DB_TO_PRICING: Record<string, FreightRateItem['pricingModel']> = {
  PER_TRIP: 'PER_TRIP',
  PER_M3: 'PER_M3',
  PER_TON: 'PER_TON',
  ALL_IN: 'ALL_IN',
  ROUTE_BASED: 'ROUTE_BASED',
  HYBRID: 'HYBRID',
};

const dateToIso = (date: string | null | undefined): string =>
  date ? `${date.slice(0, 10)}T00:00:00.000Z` : new Date().toISOString();

const isoToDate = (iso: string | null | undefined): string | null =>
  iso ? iso.slice(0, 10) : null;

interface ContractDbRow {
  id: string;
  contract_number: string;
  customer_id: string;
  project_id: string;
  product_id: string;
  quarry_id: string;
}

interface ProjectDbRow {
  id: string;
  name: string;
  customer_id: string;
  location: string;
  gps_lat: number | null;
  gps_lng: number | null;
}

interface DeliveryDbRow {
  id: string;
  delivery_number: string;
  contract_id: string;
  product_id: string;
  quarry_id: string;
  transport_vendor_id: string;
  vehicle_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  status: DeliveryItem['status'];
  loaded_volume_m3: number;
  received_volume_m3: number;
  approved_volume_m3: number;
  loaded_weight_kg: number;
  received_weight_kg: number;
  approved_weight_kg: number;
  density_applied: number | null;
  measurement_mode: string;
  scheduled_date: string;
  loaded_at: string | null;
  arrived_at: string | null;
  unloaded_at: string | null;
  delivered_at: string | null;
  quarry_loading_info: Record<string, unknown> | null;
  site_unloading_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ReconciliationDbRow {
  delivery_id: string;
  physical_variance_m3: number;
  variance_percentage: number;
}

/**
 * Ambil seluruh master (produk, quarry, kontrak, vendor, armada, tarif)
 * dari Supabase dalam bentuk tipe mobile, dengan ID = ID DB asli.
 */
export async function fetchMobileMasterFromSupabase(): Promise<MobileMasterBundle> {
  const [prodRes, quarryRes, vendorRes, vehicleRes, contractRes, projectRes, freightRes] =
    await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('quarries').select('*').eq('is_active', true),
      supabase.from('transport_vendors').select('*').eq('is_active', true),
      supabase.from('vehicles').select('*').eq('is_active', true),
      supabase.from('contracts').select('*').eq('status', 'ACTIVE'),
      supabase.from('projects').select('*'),
      supabase.from('freight_rates').select('*').eq('is_active', true),
    ]);

  if (prodRes.error) throw prodRes.error;
  if (quarryRes.error) throw quarryRes.error;
  if (vendorRes.error) throw vendorRes.error;
  if (vehicleRes.error) throw vehicleRes.error;
  if (contractRes.error) throw contractRes.error;
  if (projectRes.error) throw projectRes.error;
  if (freightRes.error) throw freightRes.error;

  const products: PickItem[] = (prodRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    detail: `Densitas ${Number(p.density)} ton/m³`,
  }));

  const quarries: PickItem[] = (quarryRes.data ?? []).map((q) => ({
    id: q.id,
    name: q.name,
    detail: q.location_name ?? '',
    gps:
      q.gps_lat != null && q.gps_lng != null ? { lat: Number(q.gps_lat), lng: Number(q.gps_lng) } : undefined,
  }));

  const projects = new Map<string, ProjectDbRow>();
  (projectRes.data ?? []).forEach((p) => projects.set(p.id, p as ProjectDbRow));

  const vehicles: VehicleItem[] = (vehicleRes.data ?? []).map((v) => ({
    id: v.id,
    name: v.plate_number,
    detail: `${v.vehicle_type ?? 'Truk'} ${Number(v.nominal_capacity_m3 ?? 0)} m³`,
    vendorId: v.transport_vendor_id,
  }));

  const vendors: VendorItem[] = (vendorRes.data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    detail: `${vehicles.filter((vh) => vh.vendorId === v.id).length} armada`,
    supplyType: v.supply_type === 'MATERIAL_AND_TRANSPORT' ? 'MATERIAL_AND_TRANSPORT' : 'TRANSPORT_ONLY',
  }));

  const contracts: ContractItem[] = (contractRes.data ?? []).map((c) => {
    const row = c as ContractDbRow;
    const project = projects.get(row.project_id);
    return {
      id: row.id,
      contractNumber: row.contract_number,
      projectId: row.project_id,
      name: project?.name ?? row.contract_number,
      detail: row.contract_number,
      gps:
        project?.gps_lat != null && project?.gps_lng != null
          ? { lat: Number(project.gps_lat), lng: Number(project.gps_lng) }
          : undefined,
    };
  });

  // Tarif berbasis projectId (kanonik web/DB: freight_rates.project_id).
  const freightRates: FreightRateItem[] = (freightRes.data ?? []).map((r) => ({
    id: r.id,
    vendorId: r.transport_vendor_id,
    quarryId: r.quarry_id,
    projectId: r.project_id,
    pricingModel: DB_TO_PRICING[r.pricing_model] ?? 'PER_M3',
    ratePerUnit: Number(r.rate_per_unit),
    tollFee: r.toll_fee != null ? Number(r.toll_fee) : undefined,
    loadingFee: r.loading_fee != null ? Number(r.loading_fee) : undefined,
    unloadingFee: r.unloading_fee != null ? Number(r.unloading_fee) : undefined,
  }));

  return { products, quarries, vendors, vehicles, contracts, freightRates };
}

/**
 * Ambil seluruh ritase dari Supabase dalam bentuk DeliveryItem mobile.
 * Plate number di-resolve dari tabel vehicles.
 */
export async function fetchMobileDeliveriesFromSupabase(): Promise<DeliveryItem[]> {
  const [deliveryRes, vehicleRes, wbRes, podRes, recRes] = await Promise.all([
    supabase.from('deliveries').select('*').order('created_at', { ascending: false }),
    supabase.from('vehicles').select('id, plate_number'),
    supabase.from('weighbridge_records').select('*'),
    supabase.from('delivery_pods').select('*'),
    supabase.from('quantity_reconciliations').select('*'),
  ]);

  if (deliveryRes.error) throw deliveryRes.error;

  const plateByVehicle = new Map<string, string>();
  (vehicleRes.data ?? []).forEach((v) => plateByVehicle.set(v.id, v.plate_number));
  const wbByDelivery = new Map<string, Record<string, unknown>>();
  (wbRes.data ?? []).forEach((r) => wbByDelivery.set(r.delivery_id, r as Record<string, unknown>));
  const podByDelivery = new Map<string, Record<string, unknown>>();
  (podRes.data ?? []).forEach((r) => podByDelivery.set(r.delivery_id, r as Record<string, unknown>));
  const recByDelivery = new Map<string, ReconciliationDbRow>();
  (recRes.data ?? []).forEach((r) => recByDelivery.set(r.delivery_id, r as ReconciliationDbRow));

  return (deliveryRes.data ?? []).map((d) => {
    const row = d as DeliveryDbRow;
    const qli = (row.quarry_loading_info ?? {}) as Record<string, unknown>;
    const sui = (row.site_unloading_info ?? {}) as Record<string, unknown>;
    const wb = wbByDelivery.get(row.id);
    const pod = podByDelivery.get(row.id);
    const rec = recByDelivery.get(row.id);

    const item: DeliveryItem = {
      id: row.id,
      deliveryNumber: row.delivery_number,
      contractId: row.contract_id,
      productId: row.product_id,
      quarryId: row.quarry_id,
      transportVendorId: row.transport_vendor_id,
      vehicleId: row.vehicle_id ?? '',
      driverName: row.driver_name ?? '',
      driverPhone: row.driver_phone ?? '',
      plateNumber: plateByVehicle.get(row.vehicle_id ?? '') ?? '',
      status: row.status,
      scheduledAt: dateToIso(row.scheduled_date),
      createdAt: row.created_at,
      loadedVolumeM3: Number(row.loaded_volume_m3),
      loadedWeightKg: Number(row.loaded_weight_kg) || undefined,
      receivedVolumeM3: Number(row.received_volume_m3) || undefined,
      receivedWeightKg: Number(row.received_weight_kg) || undefined,
      approvedVolumeM3: Number(row.approved_volume_m3) || undefined,
      approvedWeightKg: Number(row.approved_weight_kg) || undefined,
      densityApplied: row.density_applied != null ? Number(row.density_applied) : undefined,
      measurementMode: toMeasurementMode(row.measurement_mode),
      receivedAt: row.unloaded_at ?? undefined,
      deliveredAt: row.delivered_at ?? undefined,
      varianceM3: rec ? Number(rec.physical_variance_m3) : undefined,
      variancePercent: rec ? Number(rec.variance_percentage) : undefined,
    };

    // quarry_loading_info kanonik web: measurementMethod + grossWeightKg/tareWeightKg/quarryPhotoUrl/signatureUrl/loadedAt/notes/truckBedDimensions.
    // Backward-compat: fallback ke key legacy mobile (method/grossKg/photoUrl/place/gps/lengthM).
    const mm = (qli.measurementMethod as string) ?? (qli.method as string) ?? null;
    if (mm === 'WEIGHBRIDGE') {
      item.loadingMethod = 'WEIGHBRIDGE';
      item.grossKg =
        (qli.grossWeightKg as number | undefined) ??
        (qli.grossKg as number | undefined) ??
        (wb?.gross_weight_kg as number | undefined);
      item.tareKg =
        (qli.tareWeightKg as number | undefined) ??
        (qli.tareKg as number | undefined) ??
        (wb?.tare_weight_kg as number | undefined);
    } else if (mm === 'TRUCK_BED_VOLUME' || mm === 'DIMENSION') {
      item.loadingMethod = 'DIMENSION';
      const tbd = qli.truckBedDimensions as
        | { lengthM: number; widthM: number; heightM: number }
        | undefined;
      if (tbd) {
        item.dimension = {
          lengthM: Number(tbd.lengthM),
          widthM: Number(tbd.widthM),
          heightM: Number(tbd.heightM),
        };
      } else if (qli.lengthM != null) {
        item.dimension = {
          lengthM: Number(qli.lengthM),
          widthM: Number(qli.widthM),
          heightM: Number(qli.heightM),
        };
      }
    }
    // evidence / foto / tanda tangan — kanonik dulu, fallback legacy
    const loadedAtVal = (qli.loadedAt as string | undefined) ?? (qli.timestamp as string | undefined) ?? row.loaded_at ?? undefined;
    if (loadedAtVal) item.evidenceAt = loadedAtVal;
    const photo = (qli.quarryPhotoUrl as string | undefined) ?? (qli.photoUrl as string | undefined);
    if (photo) item.photoUri = photo;
    const sigQ = (qli.signatureUrl as string | undefined) ?? (qli.signatureUrl as string | undefined);
    // qli.signatureUrl adalah kanonik; legacy juga signatureUrl (sama)
    if (sigQ) item.signatureQuarry = sigQ;
    const place = (qli.notes as string | undefined) ?? (qli.place as string | undefined);
    if (place) item.evidencePlace = place;
    const egps = (qli as Record<string, unknown>).gps as { lat: number; lng: number } | undefined;
    if (egps) item.evidenceGps = egps;
    // site_unloading_info kanonik web: measuredVolumeM3/gpsLatitude/gpsLongitude/signatureUrl/unloadedAt
    const siteLat = sui.gpsLatitude as number | undefined;
    const siteLng = sui.gpsLongitude as number | undefined;
    if (siteLat != null && siteLng != null) {
      item.gps = { lat: Number(siteLat), lng: Number(siteLng) };
    } else if (sui.coordinates) {
      item.gps = sui.coordinates as { lat: number; lng: number };
    } else if (sui.gps) {
      item.gps = sui.gps as { lat: number; lng: number };
    }
    const siteSig = (sui.signatureUrl as string | undefined) ?? (sui.signatureQuarry as string | undefined);
    if (siteSig) item.signatureSite = siteSig;
    // variance sudah dari reconciliation; tapi jika JSONB punya, pakai itu untuk mode demo
    if (item.varianceM3 == null && sui.varianceVolumeM3 != null) item.varianceM3 = Number(sui.varianceVolumeM3);
    if (item.variancePercent == null && sui.variancePercent != null) item.variancePercent = Number(sui.variancePercent);
    if (pod && (pod as Record<string, unknown>).signature_driver_url) {
      item.signatureDriver = (pod as Record<string, unknown>).signature_driver_url as string;
    } else if (sui.signatureDriver) {
      item.signatureDriver = sui.signatureDriver as string;
    }

    return item;
  });
}

const toDeliveryDbRow = (d: DeliveryItem): DeliveryDbRow => ({
  id: d.id,
  delivery_number: d.deliveryNumber,
  contract_id: d.contractId,
  product_id: d.productId,
  quarry_id: d.quarryId,
  transport_vendor_id: d.transportVendorId,
  vehicle_id: d.vehicleId || null,
  driver_name: d.driverName || null,
  driver_phone: d.driverPhone || null,
  status: d.status,
  loaded_volume_m3: d.loadedVolumeM3,
  received_volume_m3: d.receivedVolumeM3 ?? 0,
  approved_volume_m3: d.approvedVolumeM3 ?? 0,
  loaded_weight_kg: d.loadedWeightKg ?? 0,
  received_weight_kg: d.receivedWeightKg ?? 0,
  approved_weight_kg: d.approvedWeightKg ?? 0,
  density_applied: d.densityApplied ?? null,
  measurement_mode:
    d.loadingMethod === 'WEIGHBRIDGE'
      ? 'CALCULATED_FROM_WEIGHT'
      : d.loadingMethod === 'DIMENSION'
      ? 'ACTUAL_MEASURED'
      : (d.measurementMode ?? 'ACTUAL_MEASURED'),
  scheduled_date: isoToDate(d.scheduledAt) ?? new Date().toISOString().slice(0, 10),
  loaded_at: d.evidenceAt ?? null,
  arrived_at: d.status === 'ARRIVED' || d.status === 'UNLOADED' || d.status === 'POD_SUBMITTED' ? d.createdAt : null,
  unloaded_at: d.receivedAt ?? null,
  delivered_at: d.deliveredAt ?? null,
  quarry_loading_info: d.loadingMethod
    ? (() => {
        const loadedAt = d.evidenceAt ?? d.createdAt;
        const common = {
          checkerName: d.driverName || 'Petugas Lapangan',
          loadedAt,
          densityUsed: d.densityApplied ?? null,
          notes: d.evidencePlace ?? null,
          quarryPhotoUrl: d.photoUri ?? null,
          signatureUrl: d.signatureQuarry ?? null,
          // extra mobile context (web akan ignore, mobile tetap bisa baca)
          gps: d.evidenceGps ?? null,
          place: d.evidencePlace ?? null,
        };
        if (d.loadingMethod === 'WEIGHBRIDGE') {
          const gross = d.grossKg ?? null;
          const tare = d.tareKg ?? null;
          return {
            ...common,
            measurementMethod: 'WEIGHBRIDGE' as const,
            grossWeightKg: gross,
            tareWeightKg: tare,
            netWeightKg: gross != null && tare != null ? gross - tare : null,
            // legacy fallback (web lama / mobile lama tetap terbaca)
            method: 'WEIGHBRIDGE',
            grossKg: gross,
            tareKg: tare,
          };
        }
        // DIMENSION -> TRUCK_BED_VOLUME (kanonik web)
        return {
          ...common,
          measurementMethod: 'TRUCK_BED_VOLUME' as const,
          truckBedDimensions: d.dimension
            ? {
                lengthM: d.dimension.lengthM,
                widthM: d.dimension.widthM,
                heightM: d.dimension.heightM,
                calculatedM3: d.loadedVolumeM3,
              }
            : null,
          // legacy fallback
          method: 'DIMENSION',
          lengthM: d.dimension?.lengthM ?? null,
          widthM: d.dimension?.widthM ?? null,
          heightM: d.dimension?.heightM ?? null,
        };
      })()
    : null,
  site_unloading_info: d.receivedVolumeM3 != null
    ? (() => {
        const varianceM3 = d.varianceM3 ?? (d.loadedVolumeM3 ? d.loadedVolumeM3 - d.receivedVolumeM3 : 0);
        const variancePct = d.variancePercent ?? (d.loadedVolumeM3 ? (varianceM3 / d.loadedVolumeM3) * 100 : 0);
        return {
          checkerName: 'Petugas Site',
          arrivedAt: d.receivedAt ?? d.createdAt,
          unloadedAt: d.receivedAt ?? d.createdAt,
          measurementMethod: 'TRUCK_BED_VOLUME' as const,
          measuredVolumeM3: d.receivedVolumeM3,
          varianceVolumeM3: varianceM3,
          variancePercent: variancePct,
          isWithinTolerance: Math.abs(variancePct) <= 2,
          toleranceAppliedPercent: 2,
          gpsLatitude: d.gps?.lat ?? null,
          gpsLongitude: d.gps?.lng ?? null,
          signatureUrl: d.signatureSite ?? null,
          sitePhotoUrl: null,
          // legacy fallback
          volumeM3: d.receivedVolumeM3,
          coordinates: d.gps ?? null,
          signatureQuarry: d.signatureSite ?? null,
          signatureDriver: d.signatureDriver ?? null,
          timestamp: d.receivedAt ?? d.createdAt,
        };
      })()
    : null,
  created_at: d.createdAt,
  updated_at: new Date().toISOString(),
});

/**
 * Simpan satu ritase (beserta weighbridge/pod bila ada) ke Supabase via upsert.
 * Setiap tabel dipisah agar kegagalan satu tabel tidak memblokir tabel lain.
 */
export async function upsertMobileDeliveryToSupabase(
  delivery: DeliveryItem
): Promise<MobileSyncResult> {
  const tables: MobileSyncResult['tables'] = [];

  const push = async (table: string, rows: object[], onConflict?: string) => {
    if (rows.length === 0) return;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: onConflict ?? 'id' });
    tables.push({ table, ok: !error, error: error?.message });
  };

  await push('deliveries', [toDeliveryDbRow(delivery)]);

  if (delivery.loadingMethod === 'WEIGHBRIDGE' && delivery.grossKg != null && delivery.tareKg != null) {
    await push('weighbridge_records', [
      {
        id: `WB-${delivery.id}`,
        delivery_id: delivery.id,
        gross_weight_kg: delivery.grossKg,
        tare_weight_kg: delivery.tareKg,
        net_weight_kg: delivery.grossKg - delivery.tareKg,
        scale_slip_photo_url: delivery.photoUri ?? null,
        weighed_at: delivery.evidenceAt ?? delivery.createdAt,
      },
    ]);
  }

  if (delivery.status === 'POD_SUBMITTED' && (delivery.signatureDriver || delivery.signatureSite)) {
    await push(
      'delivery_pods',
      [
        {
          id: `POD-${delivery.id}`,
          delivery_id: delivery.id,
          recipient_name: delivery.driverName || 'Petugas Lapangan',
          recipient_role: 'SITE_CHECKER',
          gps_latitude: delivery.gps?.lat ?? null,
          gps_longitude: delivery.gps?.lng ?? null,
          signature_driver_url: delivery.signatureDriver ?? null,
          signature_recipient_url: delivery.signatureSite ?? null,
          submitted_at: delivery.receivedAt ?? new Date().toISOString(),
        },
      ],
      'delivery_id'
    );
  }

  return { deliveryId: delivery.id, tables };
}

/**
 * Hapus satu ritase dari Supabase (nested terhapus via ON DELETE CASCADE).
 */
export async function deleteMobileDeliveryFromSupabase(
  deliveryId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);
  return { ok: !error, error: error?.message };
}

/**
 * Subscribe perubahan Realtime ritase di lapangan. Callback dipanggil setiap
 * ada INSERT/UPDATE/DELETE; pemanggil menentukan strategi refresh.
 */
export function subscribeMobileDeliveryChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('mobile-deliveries-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'weighbridge_records' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_pods' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}