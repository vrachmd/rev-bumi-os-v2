const { createClient } = require('@supabase/supabase-js');

const URL = process.env.SUPABASE_URL || 'https://kspgtupzjzdskeonnvvu.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGd0dXB6anpkc2tlb25udnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTQwNzMsImV4cCI6MjEwMjczMDA3M30.ksvBrLfEQy4fBlh3az2RLZZ7wMcWqQbCzuS-8hQZ-8o';

const results = [];
const push = (ok, label, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} | ${label}${detail ? ' | ' + detail : ''}`);

async function main() {
  // ============ LOGIN QUARRY_CHECKER ============
  const quarry = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const qr = await quarry.auth.signInWithPassword({ email: 'quarry@revbumi.co.id', password: 'Revbumi123!' });
  push(!qr.error, 'login quarry@revbumi.co.id', qr.error?.message ?? '');

  // ============ FETCH MASTER (seperti fetchMobileMasterFromSupabase) ============
  const [p, qu, vd, ve, ct, pr, fr] = await Promise.all([
    quarry.from('products').select('id,name,density').eq('is_active', true),
    quarry.from('quarries').select('id,name,gps_lat,gps_lng').eq('is_active', true),
    quarry.from('transport_vendors').select('id,name,supply_type').eq('is_active', true),
    quarry.from('vehicles').select('id,transport_vendor_id,plate_number').eq('is_active', true),
    quarry.from('contracts').select('id,contract_number,project_id').eq('status', 'ACTIVE'),
    quarry.from('projects').select('id,name,gps_lat,gps_lng'),
    quarry.from('freight_rates').select('id,transport_vendor_id,quarry_id,project_id,pricing_model,rate_per_unit').eq('is_active', true),
  ]);
  push(!p.error && (p.data ?? []).length > 0, 'fetch products (quarry role)', `count=${(p.data ?? []).length}`);
  push(!qu.error && (qu.data ?? []).length > 0, 'fetch quarries (quarry role)', `count=${(qu.data ?? []).length}`);
  push(!vd.error && (vd.data ?? []).length > 0, 'fetch vendors (quarry role)', `count=${(vd.data ?? []).length}`);
  push(!ve.error && (ve.data ?? []).length > 0, 'fetch vehicles (quarry role)', `count=${(ve.data ?? []).length}`);
  push(!ct.error && (ct.data ?? []).length > 0, 'fetch contracts (quarry role)', `count=${(ct.data ?? []).length}`);
  push(!fr.error, 'fetch freight_rates (quarry role)', `count=${(fr.data ?? []).length}`);

  console.log('DEBUG counts', { products: (p.data ?? []).length, quarries: (qu.data ?? []).length, vendors: (vd.data ?? []).length, vehicles: (ve.data ?? []).length, contracts: (ct.data ?? []).length, projects: (pr.data ?? []).length, freight: (fr.data ?? []).length });
  const contract = (ct.data ?? [])[0];
  const product = (p.data ?? [])[0];
  const quarryRow = (qu.data ?? [])[0];
  const vendor = (vd.data ?? [])[0];
  const vehicle = (ve.data ?? []).find((v) => v.transport_vendor_id === vendor.id) ?? (ve.data ?? [])[0];

  push(Boolean(contract && product && quarryRow && vendor && vehicle), 'master refs resolved',
    `contract=${contract?.id} product=${product?.id} quarry=${quarryRow?.id} vendor=${vendor?.id} veh=${vehicle?.id}`);

  const delId = `D-E2E-MOB-${Date.now()}`;
  const now = new Date().toISOString();

  // ============ UPSERT DELIVERY (seperti addRitase → upsertMobileDeliveryToSupabase) ============
  const delRow = {
    id: delId,
    delivery_number: `SJ/MOB/E2E/${Date.now()}`,
    contract_id: contract.id,
    product_id: product.id,
    quarry_id: quarryRow.id,
    transport_vendor_id: vendor.id,
    vehicle_id: vehicle.id,
    driver_name: 'E2E Driver',
    driver_phone: '0800-0000-0000',
    status: 'SCHEDULED',
    loaded_volume_m3: 0,
    received_volume_m3: 0,
    approved_volume_m3: 0,
    loaded_weight_kg: 0,
    received_weight_kg: 0,
    approved_weight_kg: 0,
    measurement_mode: 'ACTUAL_MEASURED',
    scheduled_date: now.slice(0, 10),
    created_at: now,
    updated_at: now,
  };
  const up = await quarry.from('deliveries').upsert([delRow]);
  push(!up.error, 'upsert deliveries (quarry role)', up.error?.message ?? '');

  // ============ UPDATE STATUS IN_TRANSIT + WEIGHBRIDGE (seperti recordQuarryLoading+dispatchTruck) ============
  const wbRow = {
    id: `WB-${delId}`,
    delivery_id: delId,
    gross_weight_kg: 38000,
    tare_weight_kg: 14000,
    net_weight_kg: 24000,
    scale_slip_photo_url: null,
    weighed_at: now,
  };
  const wb = await quarry.from('weighbridge_records').upsert([wbRow]);
  push(!wb.error, 'upsert weighbridge_records (quarry role)', wb.error?.message ?? '');

  const qli = { method: 'WEIGHBRIDGE', grossKg: 38000, tareKg: 14000, volumeM3: 15.48, weightTon: 24, signatureUrl: 'data:image/svg+xml;base64,PHN2Zy8+', timestamp: now };
  const upd = await quarry.from('deliveries').update({
    status: 'IN_TRANSIT',
    loaded_volume_m3: 15.48,
    loaded_weight_kg: 24000,
    density_applied: 1.55,
    measurement_mode: 'CALCULATED_FROM_WEIGHT',
    loaded_at: now,
    quarry_loading_info: qli,
    updated_at: now,
  }).eq('id', delId);
  push(!upd.error, 'update deliveries → IN_TRANSIT (quarry role)', upd.error?.message ?? '');

  // ============ LOGIN SITE_CHECKER ============
  const site = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const sr = await site.auth.signInWithPassword({ email: 'site@revbumi.co.id', password: 'Revbumi123!' });
  push(!sr.error, 'login site@revbumi.co.id', sr.error?.message ?? '');

  // ============ UNLOADING + POD (seperti recordUnloading + submitPod) ============
  const sui = { volumeM3: 15.2, coordinates: { lat: -6.78912, lng: 108.01234 }, signatureQuarry: 'data:image/svg+xml;base64,PHN2Zy8+', timestamp: now };
  const unload = await site.from('deliveries').update({
    status: 'UNLOADED',
    received_volume_m3: 15.2,
    unloaded_at: now,
    site_unloading_info: sui,
    updated_at: now,
  }).eq('id', delId);
  push(!unload.error, 'update deliveries → UNLOADED (site role)', unload.error?.message ?? '');

  const pod = await site.from('delivery_pods').upsert([{
    id: `POD-${delId}`,
    delivery_id: delId,
    recipient_name: 'E2E Site Checker',
    recipient_role: 'SITE_CHECKER',
    gps_latitude: -6.78912,
    gps_longitude: 108.01234,
    signature_driver_url: 'data:image/svg+xml;base64,PHN2Zy8+',
    signature_recipient_url: 'data:image/svg+xml;base64,PHN2Zy8+',
    submitted_at: now,
  }], { onConflict: 'delivery_id' });
  push(!pod.error, 'upsert delivery_pods (site role)', pod.error?.message ?? '');

  const podStatus = await site.from('deliveries').update({
    status: 'POD_SUBMITTED',
    updated_at: now,
  }).eq('id', delId);
  push(!podStatus.error, 'update deliveries → POD_SUBMITTED (site role)', podStatus.error?.message ?? '');

  // ============ READ BACK (baca dari web/admin-style client) ============
  const admin = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const ar = await admin.auth.signInWithPassword({ email: 'ghifarisausans@gmail.com', password: 'Ucihavieri11' });
  push(!ar.error, 'login admin', ar.error?.message ?? '');
  const rb = await admin.from('deliveries').select('id,delivery_number,status,loaded_volume_m3,received_volume_m3,quarry_loading_info,site_unloading_info').eq('id', delId).single();
  push(!rb.error && rb.data?.status === 'POD_SUBMITTED' && rb.data?.received_volume_m3 === 15.2,
    'read-back delivery via admin', `status=${rb.data?.status} received=${rb.data?.received_volume_m3}`);

  // ============ CLEANUP (hapus delivery, cascade weighbridge/pod) ============
  const del = await admin.from('deliveries').delete().eq('id', delId);
  push(!del.error, 'delete delivery (cascade)', del.error?.message ?? '');

  const checkWb = await admin.from('weighbridge_records').select('id').eq('delivery_id', delId);
  const checkPod = await admin.from('delivery_pods').select('id').eq('delivery_id', delId);
  push(checkWb.data?.length === 0 && checkPod.data?.length === 0, 'cascade cleaned weighbridge/pod',
    `wb=${checkWb.data?.length} pod=${checkPod.data?.length}`);

  // ============ HASIL ============
  console.log(results.join('\n'));
  const fails = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\nTOTAL: ${results.length} | PASS: ${results.length - fails} | FAIL: ${fails}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERROR', e); process.exit(1); });