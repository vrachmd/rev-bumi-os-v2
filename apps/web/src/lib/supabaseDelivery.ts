import { supabase } from './supabase';
import { Delivery, WeighbridgeRecord, DeliveryPod, QuantityReconciliation, CostRecord } from '../types';

/**
 * Service layer delivery ↔ Supabase (Fase 0.6).
 * Memetakan bentuk aplikasi (camelCase, nested) ke tabel DB (snake_case)
 * dan sebaliknya, serta men-subscribe Realtime perubahan ritase.
 * Backend dapat ditukar (Supabase → GCP/Alibaba) di sini tanpa mengubah UI.
 */

export interface DeliverySyncResult {
  deliveryId: string;
  tables: { table: string; ok: boolean; error?: string }[];
}

interface DeliveryDbRow {
  id: string;
  delivery_number: string;
  contract_id: string;
  product_id: string;
  quarry_id: string;
  transport_vendor_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  status: Delivery['status'];
  loaded_volume_m3: number;
  received_volume_m3: number;
  approved_volume_m3: number;
  loaded_weight_kg: number;
  received_weight_kg: number;
  approved_weight_kg: number;
  density_applied: number | null;
  measurement_mode: Delivery['measurementMode'];
  scheduled_date: string;
  departure_date: string | null;
  notes: string | null;
  loaded_at: string | null;
  arrived_at: string | null;
  unloaded_at: string | null;
  delivered_at: string | null;
  quarry_loading_info: Record<string, unknown> | null;
  site_unloading_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface WeighbridgeDbRow {
  id: string;
  delivery_id: string;
  gross_weight_kg: number;
  tare_weight_kg: number;
  net_weight_kg: number;
  scale_slip_photo_url: string | null;
  weighed_at: string;
}

interface PodDbRow {
  id: string;
  delivery_id: string;
  recipient_name: string;
  recipient_role: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy_meters: number | null;
  signature_dispatcher_url: string | null;
  signature_driver_url: string | null;
  signature_recipient_url: string | null;
  delivery_slip_photo_url: string | null;
  material_photo_url: string | null;
  notes: string | null;
  submitted_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

interface ReconciliationDbRow {
  id: string;
  delivery_id: string;
  loaded_volume_m3: number;
  received_volume_m3: number;
  physical_variance_m3: number;
  variance_percentage: number;
  tolerance_percent_applied: number;
  variance_status: QuantityReconciliation['varianceStatus'];
  variance_reason: QuantityReconciliation['varianceReason'];
  commercial_adjustment_m3: number;
  final_approved_volume_m3: number;
  potential_variance_value_idr: number;
  review_notes: string | null;
  reconciled_at: string;
}

interface CostRecordDbRow {
  id: string;
  delivery_id: string;
  billable_quantity_m3: number;
  selling_price_per_m3: number;
  recognized_revenue_idr: number;
  material_cost_per_m3: number;
  total_material_cost_idr: number;
  freight_rate_per_unit: number;
  freight_pricing_model: CostRecord['freightPricingModel'];
  pricing_basis: string | null;
  all_in_price_per_m3: number | null;
  all_in_volume_basis: string | null;
  total_freight_cost_idr: number;
  other_operational_cost_idr: number;
  total_hpp_idr: number;
  gross_profit_idr: number;
  gross_margin_percent: number;
  is_actual_finalized: boolean;
}

const mapWeighbridge = (r: WeighbridgeDbRow): WeighbridgeRecord => ({
  id: r.id,
  deliveryId: r.delivery_id,
  grossWeightKg: Number(r.gross_weight_kg),
  tareWeightKg: Number(r.tare_weight_kg),
  netWeightKg: Number(r.net_weight_kg),
  scaleSlipPhotoUrl: r.scale_slip_photo_url ?? undefined,
  weighedAt: r.weighed_at,
});

const mapPod = (r: PodDbRow): DeliveryPod => ({
  id: r.id,
  deliveryId: r.delivery_id,
  recipientName: r.recipient_name,
  recipientRole: r.recipient_role ?? undefined,
  gpsLatitude: r.gps_latitude ?? undefined,
  gpsLongitude: r.gps_longitude ?? undefined,
  gpsAccuracyMeters: r.gps_accuracy_meters ?? undefined,
  signatureDispatcherUrl: r.signature_dispatcher_url ?? undefined,
  signatureDriverUrl: r.signature_driver_url ?? undefined,
  signatureRecipientUrl: r.signature_recipient_url ?? undefined,
  deliverySlipPhotoUrl: r.delivery_slip_photo_url ?? undefined,
  materialPhotoUrl: r.material_photo_url ?? undefined,
  notes: r.notes ?? undefined,
  submittedAt: r.submitted_at,
  verifiedAt: r.verified_at ?? undefined,
  verifiedBy: r.verified_by ?? undefined,
});

const mapReconciliation = (r: ReconciliationDbRow): QuantityReconciliation => ({
  id: r.id,
  deliveryId: r.delivery_id,
  loadedVolumeM3: Number(r.loaded_volume_m3),
  receivedVolumeM3: Number(r.received_volume_m3),
  physicalVarianceM3: Number(r.physical_variance_m3),
  variancePercentage: Number(r.variance_percentage),
  tolerancePercentApplied: Number(r.tolerance_percent_applied),
  varianceStatus: r.variance_status,
  varianceReason: r.variance_reason,
  commercialAdjustmentM3: Number(r.commercial_adjustment_m3),
  finalApprovedVolumeM3: Number(r.final_approved_volume_m3),
  potentialVarianceValueIdr: Number(r.potential_variance_value_idr),
  reviewNotes: r.review_notes ?? undefined,
  reconciledAt: r.reconciled_at,
});

const mapCostRecord = (r: CostRecordDbRow): CostRecord => ({
  id: r.id,
  deliveryId: r.delivery_id,
  billableQuantityM3: Number(r.billable_quantity_m3),
  sellingPricePerM3: Number(r.selling_price_per_m3),
  recognizedRevenueIdr: Number(r.recognized_revenue_idr),
  materialCostPerM3: Number(r.material_cost_per_m3),
  totalMaterialCostIdr: Number(r.total_material_cost_idr),
  freightRatePerUnit: Number(r.freight_rate_per_unit),
  freightPricingModel: r.freight_pricing_model,
  pricingBasis: (r.pricing_basis as CostRecord['pricingBasis']) ?? undefined,
  allInPricePerM3: r.all_in_price_per_m3 ?? undefined,
  allInVolumeBasis: (r.all_in_volume_basis as CostRecord['allInVolumeBasis']) ?? undefined,
  totalFreightCostIdr: Number(r.total_freight_cost_idr),
  otherOperationalCostIdr: Number(r.other_operational_cost_idr),
  totalHppIdr: Number(r.total_hpp_idr),
  grossProfitIdr: Number(r.gross_profit_idr),
  grossMarginPercent: Number(r.gross_margin_percent),
  isActualFinalized: r.is_actual_finalized,
});

/**
 * Ambil seluruh delivery beserta data nested (weighbridge, pod,
 * reconciliation, costRecord) dari Supabase dalam bentuk tipe aplikasi.
 */
export async function fetchDeliveriesFromSupabase(): Promise<Delivery[]> {
  const [deliveryRes, wbRes, podRes, recRes, costRes] = await Promise.all([
    supabase.from('deliveries').select('*').order('created_at', { ascending: false }),
    supabase.from('weighbridge_records').select('*'),
    supabase.from('delivery_pods').select('*'),
    supabase.from('quantity_reconciliations').select('*'),
    supabase.from('cost_records').select('*'),
  ]);

  if (deliveryRes.error) throw deliveryRes.error;

  const wbByDelivery = new Map<string, WeighbridgeDbRow>();
  (wbRes.data ?? []).forEach((r) => wbByDelivery.set(r.delivery_id, r as WeighbridgeDbRow));
  const podByDelivery = new Map<string, PodDbRow>();
  (podRes.data ?? []).forEach((r) => podByDelivery.set(r.delivery_id, r as PodDbRow));
  const recByDelivery = new Map<string, ReconciliationDbRow>();
  (recRes.data ?? []).forEach((r) => recByDelivery.set(r.delivery_id, r as ReconciliationDbRow));
  const costByDelivery = new Map<string, CostRecordDbRow>();
  (costRes.data ?? []).forEach((r) => costByDelivery.set(r.delivery_id, r as CostRecordDbRow));

  return (deliveryRes.data ?? []).map((d) => {
    const row = d as DeliveryDbRow;
    const delivery: Delivery = {
      id: row.id,
      deliveryNumber: row.delivery_number,
      contractId: row.contract_id,
      productId: row.product_id,
      quarryId: row.quarry_id,
      transportVendorId: row.transport_vendor_id,
      vehicleId: row.vehicle_id ?? undefined,
      driverId: row.driver_id ?? undefined,
      driverName: row.driver_name ?? undefined,
      driverPhone: row.driver_phone ?? undefined,
      status: row.status,
      loadedVolumeM3: Number(row.loaded_volume_m3),
      receivedVolumeM3: Number(row.received_volume_m3),
      approvedVolumeM3: Number(row.approved_volume_m3),
      loadedWeightKg: Number(row.loaded_weight_kg),
      receivedWeightKg: Number(row.received_weight_kg),
      approvedWeightKg: Number(row.approved_weight_kg),
      densityApplied: row.density_applied ?? undefined,
      measurementMode: row.measurement_mode,
      scheduledDate: row.scheduled_date,
      departureDate: row.departure_date ?? undefined,
      notes: row.notes ?? undefined,
      loadedAt: row.loaded_at ?? undefined,
      arrivedAt: row.arrived_at ?? undefined,
      unloadedAt: row.unloaded_at ?? undefined,
      deliveredAt: row.delivered_at ?? undefined,
      quarryLoadingInfo: (row.quarry_loading_info as unknown as Delivery['quarryLoadingInfo']) ?? undefined,
      siteUnloadingInfo: (row.site_unloading_info as unknown as Delivery['siteUnloadingInfo']) ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    const wb = wbByDelivery.get(delivery.id);
    const pod = podByDelivery.get(delivery.id);
    const rec = recByDelivery.get(delivery.id);
    const cost = costByDelivery.get(delivery.id);
    if (wb) delivery.weighbridge = mapWeighbridge(wb);
    if (pod) delivery.pod = mapPod(pod);
    if (rec) delivery.reconciliation = mapReconciliation(rec);
    if (cost) delivery.costRecord = mapCostRecord(cost);
    return delivery;
  });
}

const toDeliveryDbRow = (d: Delivery): DeliveryDbRow => ({
  id: d.id,
  delivery_number: d.deliveryNumber,
  contract_id: d.contractId,
  product_id: d.productId,
  quarry_id: d.quarryId,
  transport_vendor_id: d.transportVendorId,
  vehicle_id: d.vehicleId ?? null,
  driver_id: d.driverId ?? null,
  driver_name: d.driverName ?? null,
  driver_phone: d.driverPhone ?? null,
  status: d.status,
  loaded_volume_m3: d.loadedVolumeM3,
  received_volume_m3: d.receivedVolumeM3,
  approved_volume_m3: d.approvedVolumeM3,
  loaded_weight_kg: d.loadedWeightKg,
  received_weight_kg: d.receivedWeightKg,
  approved_weight_kg: d.approvedWeightKg,
  density_applied: d.densityApplied ?? null,
  measurement_mode: d.measurementMode,
  scheduled_date: d.scheduledDate,
  departure_date: d.departureDate ?? null,
  notes: d.notes ?? null,
  loaded_at: d.loadedAt ?? null,
  arrived_at: d.arrivedAt ?? null,
  unloaded_at: d.unloadedAt ?? null,
  delivered_at: d.deliveredAt ?? null,
  quarry_loading_info: (d.quarryLoadingInfo as Record<string, unknown> | undefined) ?? null,
  site_unloading_info: (d.siteUnloadingInfo as Record<string, unknown> | undefined) ?? null,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
});

/**
 * Simpan satu delivery (beserta nested) ke Supabase via upsert.
 * Setiap tabel dipisah agar kegagalan satu tabel (mis. RLS role) tidak
 * memblokir tabel lain; hasil per tabel dikembalikan untuk audit.
 */
export async function upsertDeliveryToSupabase(delivery: Delivery): Promise<DeliverySyncResult> {
  const tables: DeliverySyncResult['tables'] = [];

  const push = async (table: string, rows: object[], onConflict?: string) => {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: onConflict ?? 'id' });
    tables.push({ table, ok: !error, error: error?.message });
  };

  await push('deliveries', [toDeliveryDbRow(delivery)]);

  if (delivery.weighbridge) {
    await push('weighbridge_records', [
      {
        id: delivery.weighbridge.id,
        delivery_id: delivery.id,
        gross_weight_kg: delivery.weighbridge.grossWeightKg,
        tare_weight_kg: delivery.weighbridge.tareWeightKg,
        net_weight_kg: delivery.weighbridge.netWeightKg,
        scale_slip_photo_url: delivery.weighbridge.scaleSlipPhotoUrl ?? null,
        weighed_at: delivery.weighbridge.weighedAt,
      },
    ]);
  }

  if (delivery.pod) {
    await push('delivery_pods', [
      {
        id: delivery.pod.id,
        delivery_id: delivery.id,
        recipient_name: delivery.pod.recipientName,
        recipient_role: delivery.pod.recipientRole ?? null,
        gps_latitude: delivery.pod.gpsLatitude ?? null,
        gps_longitude: delivery.pod.gpsLongitude ?? null,
        gps_accuracy_meters: delivery.pod.gpsAccuracyMeters ?? null,
        signature_dispatcher_url: delivery.pod.signatureDispatcherUrl ?? null,
        signature_driver_url: delivery.pod.signatureDriverUrl ?? null,
        signature_recipient_url: delivery.pod.signatureRecipientUrl ?? null,
        delivery_slip_photo_url: delivery.pod.deliverySlipPhotoUrl ?? null,
        material_photo_url: delivery.pod.materialPhotoUrl ?? null,
        notes: delivery.pod.notes ?? null,
        submitted_at: delivery.pod.submittedAt,
        verified_at: delivery.pod.verifiedAt ?? null,
        verified_by: delivery.pod.verifiedBy ?? null,
      },
    ]);
  }

  if (delivery.reconciliation) {
    await push('quantity_reconciliations', [
      {
        id: delivery.reconciliation.id,
        delivery_id: delivery.id,
        loaded_volume_m3: delivery.reconciliation.loadedVolumeM3,
        received_volume_m3: delivery.reconciliation.receivedVolumeM3,
        physical_variance_m3: delivery.reconciliation.physicalVarianceM3,
        variance_percentage: delivery.reconciliation.variancePercentage,
        tolerance_percent_applied: delivery.reconciliation.tolerancePercentApplied,
        variance_status: delivery.reconciliation.varianceStatus,
        variance_reason: delivery.reconciliation.varianceReason,
        commercial_adjustment_m3: delivery.reconciliation.commercialAdjustmentM3,
        final_approved_volume_m3: delivery.reconciliation.finalApprovedVolumeM3,
        potential_variance_value_idr: delivery.reconciliation.potentialVarianceValueIdr,
        review_notes: delivery.reconciliation.reviewNotes ?? null,
        reconciled_at: delivery.reconciliation.reconciledAt,
      },
    ]);
  }

  if (delivery.costRecord) {
    await push('cost_records', [
      {
        id: delivery.costRecord.id,
        delivery_id: delivery.id,
        billable_quantity_m3: delivery.costRecord.billableQuantityM3,
        selling_price_per_m3: delivery.costRecord.sellingPricePerM3,
        recognized_revenue_idr: delivery.costRecord.recognizedRevenueIdr,
        material_cost_per_m3: delivery.costRecord.materialCostPerM3,
        total_material_cost_idr: delivery.costRecord.totalMaterialCostIdr,
        freight_rate_per_unit: delivery.costRecord.freightRatePerUnit,
        freight_pricing_model: delivery.costRecord.freightPricingModel,
        pricing_basis: delivery.costRecord.pricingBasis ?? null,
        all_in_price_per_m3: delivery.costRecord.allInPricePerM3 ?? null,
        all_in_volume_basis: delivery.costRecord.allInVolumeBasis ?? null,
        total_freight_cost_idr: delivery.costRecord.totalFreightCostIdr,
        other_operational_cost_idr: delivery.costRecord.otherOperationalCostIdr,
        total_hpp_idr: delivery.costRecord.totalHppIdr,
        gross_profit_idr: delivery.costRecord.grossProfitIdr,
        gross_margin_percent: delivery.costRecord.grossMarginPercent,
        is_actual_finalized: delivery.costRecord.isActualFinalized,
      },
    ]);
  }

  return { deliveryId: delivery.id, tables };
}

/**
 * Hapus satu delivery dari Supabase. Baris nested (weighbridge, pod,
 * reconciliation, cost) terhapus otomatis via ON DELETE CASCADE.
 */
export async function deleteDeliveryFromSupabase(deliveryId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);
  return { ok: !error, error: error?.message };
}

/**
 * Subscribe perubahan Realtime pada tabel operasional ritase.
 * Callback dipanggil setiap ada INSERT/UPDATE/DELETE; pemanggil menentukan
 * strategi refresh (mis. re-fetch seluruh delivery).
 */
export function subscribeDeliveryChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('deliveries-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'weighbridge_records' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_pods' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quantity_reconciliations' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cost_records' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}