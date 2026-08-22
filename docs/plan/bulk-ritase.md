# Plan — Tambah Ritase Massal (Bulk) Web + Mobile

> Keputusan: 6 `FreightPricingModel` tetap aktif (ALL_IN, PER_TRIP primary + PER_M3/PER_TON/ROUTE_BASED/HYBRID advanced). Mobile grid 10 baris.

## 1. Template Web `bulk_ritase_template.xlsx`
Kolom: tanggal_muat*, quarry*, produk*, plat_nomor*, supir, vendor_armada*, project_tujuan*, metode (auto dari freight_rates, dropdown 6 opsi urutan ALL_IN, PER_TRIP, —, PER_M3, PER_TON, ROUTE_BASED, HYBRID, boleh override), gross_kg/tare_kg atau P×L×T, sj_imci.
* auto-resolve: quarry+produk→density (quarry_material_costs), vendor+quarry+project→freight_rates.pricingModel+rate, produk+quarry+project→contractId.
* SJ `SJ/RBN/YYYYMMDD/NNN-HHMMSS` auto, bukan input.

## 2. Web `apps/web/src/components/operations/BulkDeliveriesView.tsx`
Role: OPERATIONS/DISPATCHER/SUPER_ADMIN. Flow: Upload drag-drop xlsx/csv (SheetJS) + Download Template → Preview grid 20 baris + badge valid/warning/error (quantity.engine + freight.engine calculateFreightCost live, chip ALL-IN hijau/PER TRIP biru/PER_M3 amber) → Mapping manual jika master tidak ketemu → Submit chunk 50 via `lib/supabaseBulk.ts` insert deliveries+weighbridge + audit_logs BULK_CREATE {bulk_batch_id} + progress X/500 → ringkasan sukses/gagal + download error.csv. `bulk_batch_id` (`bulk-20260822-XXXX`) simpan di `deliveries.bulk_batch_id` (migration 0011 nullable index) untuk Batalkan Batch 24j jika belum POD_SUBMITTED.

## 3. Mobile `apps/mobile/src/screens/BulkQuarryScreen.tsx`
Role: QUARRY_CHECKER, offline-first. Grid **10 baris** editable default (plat picker dari vehicles, produk dropdown, gross/tare numeric), + Tambah Baris (max 20), Scan Plat (v2). Simpan Massal → `offlineQueue` type `bulk_deliveries` payload rows → replay 1-1 via `supabaseData.upsertDelivery` saat online, SJ YYYYMMDD/NNN-HHMMSS anti-duplikat, banner pendingCount/lastSyncAt reuse.

## 4. Validasi blokir
Plat duplikat dalam file, gross<tare, dimensi 0, master tidak ada, ALL_IN tanpa quarry_material_cost, PER_TRIP/PER_M3/PER_TON tanpa freight_rates aktif → baris merah, submit disabled.

## 5. File ubah
- `docs/plan/bulk-ritase.md` (ini)
- `supabase/migrations/0011_bulk_batch_id.sql` (deliveries.bulk_batch_id)
- `apps/web/src/lib/supabaseBulk.ts` (baru, chunk insert)
- `apps/web/src/context/AppContext.tsx` bulkCreateDeliveries
- `apps/web/src/components/operations/BulkDeliveriesView.tsx` (baru)
- `apps/mobile/src/store/useAppStore.ts` bulkCreateDeliveries
- `apps/mobile/src/utils/offlineQueue.ts` tipe bulk_deliveries
- `apps/mobile/src/utils/supabaseData.ts` bulk upsert
- `apps/mobile/src/navigation/QuarryStack.tsx` + `BulkQuarryScreen.tsx` (baru)

## 6. Estimasi
Spec+template 0.5d → Web import 1.5d → Mobile bulk 10-row 1.5d → E2E 50 baris campur ALL_IN/PER_TRIP/PER_M3 0.5d = 4–5 hari.
