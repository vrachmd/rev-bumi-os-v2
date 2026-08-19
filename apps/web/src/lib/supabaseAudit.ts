import { supabase } from './supabase';

/**
 * Service layer audit ↔ Supabase (Fase 1).
 * Audit bersifat append-only: insert saja, tidak ada update/delete.
 * RLS: audit_logs_insert_any (with check true) — semua role terautentikasi
 * boleh insert; select hanya via RPC get_audit_logs (SUPER_ADMIN/MANAGEMENT).
 * Timestamp diambil dari server (default now()), bukan dari client.
 */

export interface AuditInsert {
  tableName: string;
  recordId: string;
  recordIdentifier: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'RECONCILE' | 'CORRECTION';
  oldValues?: unknown;
  newValues?: unknown;
  reason?: string;
}

/**
 * Insert satu baris audit ke DB. Fire-and-forget; gagal tidak memblokir UX.
 * changed_by diambil dari auth.uid() yang sedang login, user_role dari
 * profiles via current_user_role() namun kita kirim eksplisit agar
 * konsisten dengan AuditLog lokal (fullName disimpan di newValues jika perlu).
 */
export async function insertAuditLogToSupabase(entry: AuditInsert & { userRole?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const changedBy = userData.user?.id ?? null;
    const { error } = await supabase.from('audit_logs').insert([
      {
        table_name: entry.tableName,
        record_id: entry.recordId,
        record_identifier: entry.recordIdentifier,
        action: entry.action,
        changed_by: changedBy,
        user_role: entry.userRole ?? null,
        old_values: entry.oldValues ?? null,
        new_values: entry.newValues ?? null,
        reason: entry.reason ?? null,
        // timestamp, ip_address, user_agent dibiarkan default (server now())
      },
    ]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Baca audit via RPC get_audit_logs (security definer, hanya SUPER_ADMIN/MANAGEMENT).
 * Mengembalikan baris audit_logs mentah dari server.
 */
export async function fetchAuditLogsFromSupabase(
  opts: { limit?: number; offset?: number; tableName?: string } = {}
): Promise<{ data: AuditLogRow[]; error?: string }> {
  const { data, error } = await supabase.rpc('get_audit_logs', {
    p_limit: opts.limit ?? 100,
    p_offset: opts.offset ?? 0,
    p_table: opts.tableName ?? null,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as AuditLogRow[] };
}

export interface AuditLogRow {
  id: number;
  table_name: string;
  record_id: string;
  record_identifier: string | null;
  action: string;
  changed_by: string | null;
  user_role: string | null;
  old_values: unknown;
  new_values: unknown;
  reason: string | null;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Verifikasi GPS server-side: cek apakah koordinat (lat,lng) berada dalam
 * radius meter dari quarry (untuk loading) atau project (untuk unloading)
 * terkait delivery. Memanggil RPC verify_delivery_gps.
 */
export async function verifyDeliveryGps(
  deliveryId: string,
  lat: number,
  lng: number,
  context: 'QUARRY' | 'SITE'
): Promise<{ withinRadius: boolean; distanceM: number; allowedRadiusM: number; error?: string }> {
  const { data, error } = await supabase.rpc('verify_delivery_gps', {
    p_delivery_id: deliveryId,
    p_lat: lat,
    p_lng: lng,
    p_context: context,
  });
  if (error) return { withinRadius: false, distanceM: -1, allowedRadiusM: -1, error: error.message };
  const row = data as { within_radius: boolean; distance_m: number; allowed_radius_m: number } | null;
  if (!row) return { withinRadius: false, distanceM: -1, allowedRadiusM: -1, error: 'no result' };
  return { withinRadius: row.within_radius, distanceM: row.distance_m, allowedRadiusM: row.allowed_radius_m };
}
