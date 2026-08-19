# Plan F1-1 — Densitas per Quarry×Material + Validasi Kapasitas

> DRAFT arsitek-only. Gap F-06: densitas hardcoded `?? 1.6` drift.

## Kontrak
- Sumber densitas: `products.density` (global fallback) → `quarry_material_costs.density` (per quarry override). Tambah kolom `density numeric(6,3)` ke `quarry_material_costs` via migration `0006_quarry_density.sql`.
- Validasi: `grossKg - tareKg` vs `vehicles.nominal_capacity_m3 * density` + toleransi 5% (peringatan, bukan block).

## File & baris
- `supabase/migrations/0006_quarry_density.sql` — `alter table quarry_material_costs add column density numeric(6,3);` + `update` seed dari `products`.
- `supabase/migrations/0003_seed_master.sql` — isi `quarry_material_costs` per quarry×product (Rumpin, Sudamanik, Bojonegara).
- `apps/web/src/lib/supabaseMaster.ts:41` — `fetchMasterFromSupabase` join `quarry_material_costs`.
- `apps/mobile/src/utils/supabaseData.ts:103` — sama, `densityByQuarryProduct` map.
- `apps/web/src/context/AppContext.tsx:740` & `apps/mobile/src/store/useAppStore.ts:86` — `densityByProduct(productId, quarryId)` ganti ke lookup `quarry_material_costs` fallback `products.density`.
- `apps/web/src/components/operations/FieldHandoverView.tsx:170` & `apps/mobile/src/screens/QuarryScreen.tsx:1` — panggil validator kapasitas, tampil warning kuning jika overload.

## Langkah
1. Migration 0006 (idempotent): `if not exists`.
2. Seed: untuk tiap `quarry-01..03` × `prod-01..05` set density awal = `products.density` ±0.05 (variasi geologi).
3. SDK: `supabaseMaster/fetch` & `supabaseData/fetch` bawa `quarry_material_costs`.
4. Engine: helper `getDensity(productId, quarryId, bundle)` di `shared-engine`.
5. UI: warning `Muatan melebihi kapasitas ${capacityM3} m³ × ${density} = ${maxKg} kg`.

## Exit criteria
- `turbo check-types` 7/7, `e2e_mobile_full.js` densitas `prod-01` via `quarry-01` = 1.6 ± variasi.
- `weighbridge` overload warning muncul di QuarryScreen & FieldHandoverView.

## Risiko
- Migration `alter` tanpa lock — jalan di free tier ok.
- Fallback tetap `products.density` bila baris belum ada (tidak breaking).
