# Plan — Skema KBS Internal 1 Kontrak 2 Harga + Vendor Internal + Bulk

> Berlaku semua proyek KBS (`proj-04` Sunter, `proj-05` Legok, `proj-06` Pluit, `proj-07` Dadap, `proj-08` Bogor). Harga fix menyusul (nullable, fallback eksternal). Faktur template sama. Hanya `.md` di fase ini — tidak ubah aplikasi.

## Keputusan
- **1 kontrak 2 opsi harga:** `contracts.unit_price_per_m3` (eksternal) + `contracts.unit_price_internal_m3` (internal KBS, nullable). Ritase internal pakai harga internal jika terisi, fallback harga eksternal.
- **Vendor internal:** `transport_vendors` `vendor-07` `KBS-INT` `KARYA BETON INTERNAL` `supply_type=INTERNAL` `default_pricing_model=INTERNAL_KBS`. Armada `vehicles` `B 9xxx KBS` milik KBS.
- **Faktur sama:** `ImciAgregatTemplate` / `StandardPerRit` tetap; harga jual beda otomatis ikut `cost_records.selling_price_per_m3`.

## Skema DB (akan di `supabase/migrations/0014_kbs_internal.sql` saat eksekusi — belum dibuat di fase `.md` ini)
```sql
-- vendor internal
INSERT INTO transport_vendors (id, code, name, supply_type, default_pricing_model, is_active)
VALUES ('vendor-07','KBS-INT','KARYA BETON INTERNAL','INTERNAL','INTERNAL_KBS',true);

-- freight internal 0 untuk 5 proyek KBS
INSERT INTO freight_rates (id, transport_vendor_id, quarry_id, project_id, pricing_model, rate_per_unit, effective_date, is_active)
SELECT 'frate-kbs-'||p.id, 'vendor-07', q.id, p.id, 'INTERNAL_KBS', 0, CURRENT_DATE, true
FROM projects p CROSS JOIN quarries q WHERE p.id IN ('proj-04','proj-05','proj-06','proj-07','proj-08');

-- 2 harga di kontrak
ALTER TABLE contracts ADD COLUMN unit_price_internal_m3 numeric NULL;
ALTER TABLE contracts ADD COLUMN pricing_variant text DEFAULT 'EXTERNAL';

-- armada KBS awal 10 plat (contoh)
INSERT INTO vehicles (id, transport_vendor_id, plate_number, vehicle_type, nominal_capacity_m3, is_active)
VALUES ('veh-KBS-9001','vendor-07','B 9001 KBS','Tronton 22 m³',22,true)
-- + 9 plat lain B 9002..B 9010 KBS (isi via bulk/manual)
ON CONFLICT DO NOTHING;
```
- `freight_rates.pricing_model` tambah `INTERNAL_KBS` (CHECK).
- `contracts.unit_price_internal_m3` nullable biar harga fix menyusul tidak block.

## Engine & Data Layer (rencana — belum ubah kode)
- `freightRate.ts` / `supabaseData.ts` mapping `INTERNAL_KBS`.
- `finance.engine.ts` / `AppContext bulkCreateDeliveries` branch:
  ```ts
  const isInternalKbs = vendorId === 'vendor-07' || rate?.pricingModel === 'INTERNAL_KBS';
  const sellingPrice = isInternalKbs ? (contract.unit_price_internal_m3 ?? contract.unit_price_per_m3) : contract.unit_price_per_m3;
  const freightCost = isInternalKbs ? 0 : resolveRate(...);
  const hpp = isInternalKbs ? mat + other : mat + freight + other; // other 100K Sunter/Pluit, 150K Legok/Dadap/Bogor
  ```
- `supabaseMaster.ts` `mapContract` include `unit_price_internal_m3`.
- `cost_records` `freight_pricing_model='INTERNAL_KBS'` `freight_rate 0` untuk ritase baru; ledger lama 499 tetap.

## UI (rencana — belum ubah kode)
- Dashboard `Tambah Ritase` + Bulk: `Select Vendor` badge `KBS INTERNAL • IMCI tanggung ongkos` hijau jika `vendor-07`, `VehiclePlateInput` filter `vehicles where vendorId=KBS-INT`, `Tarif Berlaku` `Material only` vs `ALL_IN`.
- `BulkQuarryScreen` 10→20 baris: `Select` Kontrak/Produk/Quarry/Vendor + `VehiclePlateInput` per baris, valid 5 field, `+ Tambah Baris` / `Simpan validCount`.
- Web `BulkDeliveriesView` 15 kolom (`tanggal_muat,plat_nomor,sj_imci,panjang_cm,lebar_cm,tinggi_cm,project_tujuan,produk,quarry,metode,gross_kg,tare_kg,supir,vendor_armada,status`) — `vendor_armada=KBS-INT` `plat=B 9xxx KBS` via `normalizePlate`, `sorted tanggal→proyek→sj_imci`, `Note/SJ IMCI`.
- `HppFinanceView`/`ReportsView`/`FinanceScreen` kolom `Freight 0` untuk internal, `HPP = Mat+Other`, filter `Jenis Armada: Semua/Eksternal/Internal`.

## Bulk Update Rinci
- Web: `BulkDeliveriesView` sudah 15 kolom `8096dea` + `normalizePlate` `eea8f79` + `sort A-Z` `b9a026b` — internal otomatis `vendor KBS-INT` dikenali via `fallback vendor 'kbs'` → `vendor-07`, plat `B 9xxx KBS` dinormalisasi.
- Mobile: `BulkQuarryScreen` sudah polish `5b6f35b` (`Select` + `VehiclePlateInput` searchable) — akan tambah `vendor KBS-INT` ke `eligibleVendors`, `onCreateFromPlate` `addVehicle(vendor-07, plate)` untuk plat baru lapangan.
- `supabaseBulk.ts` chunk 50 + `AppContext bulkCreateDeliveries` sort + `other per-rit` `80dc48e` tetap; hanya `sellingPrice` pilih internal jika vendor internal.

## Harga Fix Menyusul
- Saat harga didapat: `UPDATE contracts SET unit_price_internal_m3 = <nilai> WHERE id IN ('cont-04'..'cont-08')` tanpa migrasi baru.
- Contoh selisih referensi: eksternal `ALL_IN 345k` vs material `230k` → internal `230k` (material only). Isi sesuai real.

## Risiko
- Harga internal `NULL` → fallback eksternal (tidak error).
- Margin internal naik (freight 0) → footnote `IMCI tanggung ongkos`.
- Armada KBS belum lengkap → petugas tambah manual via `VehiclePlateInput`.

## Eksekusi (1 hari saat approved)
1. Tulis `0014` + `pnpm db push`.
2. Seed `vendor-07` + 5 `freight INTERNAL_KBS 0` + 10 `vehicles KBS`.
3. Patch `finance/freight` + `supabaseMaster` + `AppContext` + 3 HPP view (sudah ada plan, belum ubah).
4. `turbo check-types 7/7` `lint 0` `build`, `e2e` 1 ritase internal `D-TEST-INT` verifikasi `hpp = mat+other`.

## Exit
- Ritase baru plat `B 9xxx KBS` otomatis `HPP material only`, tagihan pakai harga internal jika terisi, faktur sama, `check-types` hijau, `TASKS`/`ROADMAP` terupdate (fase `.md` ini).
