import { supabase } from './supabase';
import { Delivery } from '../types';

const CHUNK = 50;

const toRow = (d: Delivery, bulkBatchId: string) => ({
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
  quarry_loading_info: (d.quarryLoadingInfo as unknown as Record<string, unknown>) ?? null,
  site_unloading_info: (d.siteUnloadingInfo as unknown as Record<string, unknown>) ?? null,
  bulk_batch_id: bulkBatchId,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
});

export async function bulkInsertDeliveriesToSupabase(
  deliveries: Delivery[],
  bulkBatchId: string
): Promise<{ ok: number; failed: { id: string; error: string }[] }> {
  let ok = 0;
  const failed: { id: string; error: string }[] = [];
  for (let i = 0; i < deliveries.length; i += CHUNK) {
    const chunk = deliveries.slice(i, i + CHUNK);
    const rows = chunk.map((d) => toRow(d, bulkBatchId));
    const { error } = await supabase.from('deliveries').insert(rows);
    if (error) {
      // fallback per-row to isolate failures
      for (const r of rows) {
        const { error: e2 } = await supabase.from('deliveries').insert([r]);
        if (e2) failed.push({ id: r.id, error: e2.message });
        else ok++;
      }
    } else {
      ok += chunk.length;
    }
  }
  return { ok, failed };
}

export async function bulkEnsureVehiclesToSupabase(
  vehicles: { id: string; transport_vendor_id: string; plate_number: string; vehicle_type?: string; nominal_capacity_m3?: number }[]
): Promise<void> {
  if (vehicles.length === 0) return;
  for (let i = 0; i < vehicles.length; i += CHUNK) {
    const chunk = vehicles.slice(i, i + CHUNK);
    await supabase.from('vehicles').upsert(chunk, { onConflict: 'id' });
  }
}
