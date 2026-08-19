# Visi REV Bumi OS 12 Bulan — dari Aplikasi ke OS Rantai Pasok

> Arsitek-only. Sumber: `AGENTS.md:1` 3 pilar + 8 role, `ROADMAP.md:4`, `engine/*`, `supabase/migrations/0001-0006`.

## Prinsip
- **Lapangan dulu, kantor ngikut:** PWA offline-first, cockpit realtime. Satu `delivery_number` `SJ/RBN/${YYYYMMDD}/${NNN}` untuk semua.
- **Uang tidak bocor:** 1 `shared-engine` untuk web & mobile, audit insert-only.
- **Portabel:** Supabase Free sekarang (`kspgtupzjzdskeonnvvu`) → GCP/Alibaba hanya jika storage penuh (Fase 4 opsional).

## 0-3 bulan (Fondasi kokoh — yang sedang jalan)
- SJ seragam `SJ/RBN` (`AppContext.tsx:559` ↔ `useAppStore.ts:260` + suffix `${HHMMSS}` anti-duplicate), `quarry_loading_info`/`site_unloading_info` kanonik `measurementMethod/grossWeightKg/quarryPhotoUrl` + `measuredVolumeM3/gpsLatitude`.
- Offline queue `offlineQueue.ts:22` mutex + `pendingCount/lastSyncAt` banner Dashboard, `audit_logs` insert-only `0002:234` + RPC `get_audit_logs` + `haversine_m` 500/1000m.
- Densitas per `quarry×product` (`quarry_material_costs.density` `0006`) hapus `densityByProduct` hardcoded.

## 3-6 bulan (Kontrol uang)
- `quantity` toleransi 2% → `min(Muat,Terima)` + penalti vendor otomatis, `finance` `PPN 11%` + `AR aging/piutang` per customer.
- Cockpit MANAGEMENT: margin kotor per `proj-01..08` (HPP `quarry_cost + freight frate-01..13` vs harga kontrak), burn-rate volume, alert `ABOVE_TOLERANCE`.
- RLS 8 role di DB, bukan switch profil client-side.

## 6-9 bulan (Jembatan BUMN)
- QR e-SJ di gate Tol Cisumdawu / Bendungan Ciawi / MRT CP-201 — scan → `ARRIVED` GPS lock auto.
- Vendor portal (tanpa login supir): vendor lihat SJ, `POD` ttd, tagihan `PER_M3/PER_TRIP/ALL_IN`.
- `OSRM` ETA 45 km/jam + `Nominatim` geocode jadi geofence `POD` (tidak bisa submit di luar radius).

## 9-12 bulan (Go-Live & skala)
- Deploy `Vercel` (web+PWA) + `Supabase` monitor `pause/egress`, backup harian `pg_dump`.
- Pindah `quantity/freight/finance/state-machine` ke `packages/shared-engine`, CI `turbo lint/check-types/test + e2e_mobile_full.js 50/50` di PR.
- Fase 4 opsional: `Cloud SQL + GCS/OSS + Cloud Run` hanya jika storage Supabase penuh — `supabase/migrations` standar, `env-driven` tanpa tulis ulang.

## Exit 12 bulan
Cockpit lihat uang live, lapangan ayo tanpa sinyal tetap sync, audit tidak bisa dihapus, `SJ/RBN` jadi bahasa bersama quarry→site→keuangan.
