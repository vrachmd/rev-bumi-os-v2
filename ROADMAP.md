# ROADMAP — REV Bumi OS menuju Produksi

> Tujuan akhir: **sistem operasional dan management** untuk REV BUMI NUSANTARA.
> Status: prototype/demo → **produksi**. Dokumen ini menjadi acuan prioritas kerja seluruh tim/agen berikutnya.
> Keputusan backend: **Supabase (free tier) sekarang → deployment penuh di cloud GCP / Alibaba Cloud** (lihat §3, §4-Fase 4, §5).

---

## 1. Kondisi Saat Ini (Inventory)

Sudah ada dan berfungsi:
- **Dual-platform**: `apps/web` (cockpit desktop, Next.js 16) + `apps/mobile` (Expo/React Native PWA lapangan).
- **Engine bisnis** (web): `quantity`, `freight`, `finance`, `contract`, `state-machine` — fungsi murni, mudah di-unit-test.
- **State machine pengiriman**: SCHEDULED → LOADING → IN_TRANSIT → ARRIVED → UNLOADED → POD_SUBMITTED → POD_VERIFIED → DELIVERED.
- **8 role pengguna** (model RBAC, masih client-side).
- **Audit trail** tercatat (masih di localStorage).
- **Routing & geocoding**: OSRM (ETA truk 45 km/jam) di mobile, Nominatim (geocode alamat) di web.
- **Master data + CRUD**: pelanggan, proyek/site (dengan koordinat + auto-geocode), kontrak, quarry multi-sumber, vendor armada, tarif angkut.
- **Monorepo Turborepo** dengan paket siap pakai: `packages/api-client` (HTTP client — digantikan Supabase SDK), `shared-engine`, `shared-types`, `shared-utils`, `ui`.

Batas utama (gabungan 8 gap fondasi di bawah) → solusinya: **migrasi ke Supabase** (single source of truth) dengan jalur portabel ke cloud.

---

## 2. Backlog Fondasi Produksi (8 Gap)

| ID | Gap | Dampak | Prioritas |
|----|-----|--------|-----------|
| **F-01** | Tidak ada backend / single source of truth. Web & mobile berjalan di localStorage terpisah; data lapangan tidak pernah sampai ke cockpit kantor. | Integrasi 3 pilar (quarry→site→keuangan) belum nyata; data hilang saat browser dibersihkan; tidak multi-user. | 🔴 Kritikal |
| **F-02** | Auth & RBAC tidak ditegakkan (8 role hanya switch profil client-side). | Modul keuangan/audit tidak aman untuk produksi. | 🔴 Kritikal |
| **F-03** | Audit trail "immutable" palsu (localStorage, bisa diubah via console). | Pelanggaran aturan immutability audit (AGENTS.md) di lingkungan nyata. | 🟠 Tinggi |
| **F-04** | GPS, tanda tangan, timestamp 100% dipercaya tanpa verifikasi server. | Rentan manipulasi klaim susut & ongkos angkut (nilai uang). | 🟠 Tinggi |
| **F-05** | Tidak ada offline queue & sinkronisasi mobile. | Lapangan (quarry/site) sering minim sinyal. | 🟠 Tinggi |
| **F-06** | Master data tidak konsisten antar-app (densitas hardcoded `?? 1.6`, seed di-mirror manual). | Drift data → ETA/perhitungan bisa salah. | 🟡 Sedang |
| **F-07** | Belum ada unit test engine bisnis & CI. | Perubahan regresi tidak terdeteksi. | 🟡 Sedang |
| **F-08** | Tidak ada migrasi/versioning data tersimpan saat struktur berubah. | Data lama bisa rusak setelah update. | 🟡 Sedang |

---

## 3. Keputusan Arsitektur (Ditetapkan)

| Keputusan | Nilai | Catatan |
|---|---|---|
| **Backend sekarang** | **Supabase** (Postgres + Auth + RLS + Realtime + Storage + Edge Functions) | Gratis (free tier) untuk development & operasional awal |
| **Target akhir** | **Deployment penuh di cloud GCP / Alibaba Cloud** | Migrasi bertahap, bukan tulis ulang (lihat §5) |
| **Jalur migrasi DB** | Supabase Postgres → **GCP Cloud SQL / Alibaba RDS PostgreSQL** | Postgres standar → portabilitas terjaga, schema & query tetap |
| **Auth** | Supabase Auth (JWT) sekarang → auth cloud/self-host saat produksi penuh | RLS tetap dipakai selama Supabase |
| **Web & PWA** | Vercel (free) sekarang → GCP Cloud Run / Alibaba (containerized Next.js) saat produksi penuh | PWA mobile di-host statis bersama web |
| **Storage** | Supabase Storage → GCS / Alibaba OSS | Foto bukti & tanda tangan |
| **Migrasi data lama** | Tool import sekali pakai dari localStorage → Supabase | Fase 0 |

Dasar pertimbangan: efisiensi pengembangan berbasis AI (kode minimal, siklus cepat) + cepat ke produksi + biaya Rp 0 di awal. Supabase adalah Postgres, sehingga **keputusan ini tidak mengunci vendor** — jalur ke GCP/Alibaba tetap mulus.

---

## 4. Fase Pengerjaan (Urutan Kerja)

### Fase 0 — Fondasi Data & Autentikasi 🔴
Deliverable:
- Setup **Supabase project** (region terdekat) + schema database via **SQL migrations** (customer, project, kontrak, quarry, vendor, kendaraan, delivery, weighbridge, pod, reconciliation, invoice, payment, audit_log) — data model dari `MARKDOWN.md.md` §Fase 1 menjadi acuan.
- **Seed data** dipindah dari `seedData.ts` → seed SQL / script migrasi.
- Web & mobile memakai **`@supabase/supabase-js`** (+ `@supabase/ssr` untuk Next.js) — `packages/api-client` tidak dipakai untuk CRUD, cukup layanan Supabase.
- **Auth + RBAC server-side**: Supabase Auth (8 role) + **Row Level Security (RLS)** per tabel.
- Halaman login web & mobile + sesi.
- Tool **import data localStorage lama** ke Supabase.
**Exit criteria:** ritase yang dibuat di mobile muncul real-time di cockpit web (single source of truth via Supabase Realtime). Akses modul keuangan/audit hanya untuk role berwenang (teruji RLS).

**Status (Fase 0 berjalan):**
- ✅ Schema + RLS + seed via SQL migrations ter-apply (24 tabel, 46 policy; `0001`–`0004`).
- ✅ 3 akun riil (SUPER_ADMIN, QUARRY_CHECKER, SITE_CHECKER); `disable_signup` aktif.
- ✅ Login web & mobile + gating sesi; **profil & role asli diambil dari tabel `profiles`** (bukan demo).
- ✅ Tool **Sinkronisasi Data** (localStorage → Supabase) sukses: 0 failed untuk seluruh data operasional (delivery, weighbridge, POD, reconciliation, invoice, payment). Master data tidak di-import karena sudah ada dari seed SQL.
- ⏳ **Belum**: realtime (ritase mobile → cockpit web) & data layer web masih baca dari localStorage.

**Status (Fase 0.6 berjalan):**
- ✅ **Deliveries sudah single-source via Supabase**: `AppContext` saat terautentikasi memuat delivery dari DB (fetch + nested) dan **subscribe Realtime** (deliveries, weighbridge, POD, reconciliation, cost).
- ✅ **Write-through delivery**: seluruh aksi (terbitkan, update, status, timbang, POD, rekonsiliasi, verifikasi, hapus) menulis ke Supabase.
- ✅ **Finance single-source**: `supabaseFinance.ts` (fetch invoices+items+payments, upsert invoice/items, upsert payment + update invoice, subscribe Realtime); `AppContext` load + realtime saat authed; write-through di `createInvoice` & `recordPayment`.
- ✅ **Master data single-source**: `supabaseMaster.ts` (fetch 9 tabel master + contract_source_quarries saat authed; upsert bundle & delete per entitas); seluruh saver master web write-through.
- ✅ Teruji E2E: insert delivery/invoice di DB → muncul otomatis di cockpit tanpa reload; submit invoice dari UI → tersimpan di DB (+ items); catat payment dari UI → tersimpan + invoice jadi PARTIALLY_PAID; master produk dari DB tampil (5 produk).
 - ✅ **Mobile online**: `supabaseData.ts` (fetch master + deliveries dari DB dengan ID DB riil, upsert delivery + weighbridge + pod, delete, subscribe Realtime); `useAppStore` → `setOnline`/`hydrateMaster`/`hydrateDeliveries`, seluruh aksi ritase **write-through** ke Supabase saat online; `App.tsx` hydrate online saat login + realtime refresh. Typecheck mobile lulus.
 - ✅ **Penyamaan format web↔mobile (anti-konflik)**: seed mobile ID diselaraskan DB (`prod-01`/`quarry-01`/`vendor-01`/`veh-01`/`cont-01`+`proj-01`/`frate-01`); `MobileFreightPricingModel` 6 nilai + `FreightRateItem.projectId` (kanonik DB `freight_rates.project_id`); `measurementMode` 3 nilai DB; `quarry_loading_info`/`site_unloading_info` pakai skema kanonik web (`measurementMethod`/`grossWeightKg`/`quarryPhotoUrl`/`loadedAt`/`truckBedDimensions` + `measuredVolumeM3`/`gpsLatitude`/`gpsLongitude`/`signatureUrl`/`varianceVolumeM3` dll) dengan fallback legacy; `DashboardScreen` `resolveRate`/`eligibleVendorIds` via `projectIdOf(contractId)`; `useAppStore` `densityByProduct` `prod-01..05` + `contracts: ContractItem[]`. Typecheck `turbo check-types` 7/7 lulus.
  - ✅ **Offline queue + SJ RBN + audit + GPS + density**: `offlineQueue.ts` mutex + `pendingCount/lastSyncAt` banner `DashboardScreen`, `SJ` `SJ/RBN/${YYYYMMDD}/${NNN}-${HHMMSS}` anti-duplicate + retry, `audit` `supabaseAudit.ts` insert-only + RPC `get_audit_logs` 500/1000m `haversine_m`, `quarry_material_costs.density` `0006` 15 baris, `QuarryScreen`/`FieldHandover` overload warning.
  - ✅ **GitHub + Vercel Go-Live**: `git init` `9399a70` → `1289c49` `main` di `https://github.com/vrachmd/rev-bumi-os-v2`, `Vercel` `rev-bumi-os-v2-web.vercel.app` `Ready` `c201fa9→119de1a→8ee51b2` (fix `devEngines` → `packageManager`), `ci.yml` `lint/typecheck/test/build + e2e` + Secrets `SUPABASE_URL/ANON` + `NEXT_PUBLIC_*`, `demo` dihapus Go-Live wajib RLS, `data-sync` dihapus `8ee51b2` (Fase 0.6 exit).
  - 🔧 Bug diperbaiki selama E2E: form Record Payment `step` mismatch (min=1 + step=10000 memblokir submit nilai normal → `step="any"`); `payments.recorded_by` uuid (sebelumnya dikirim `fullName`).
   - ✅ **Checkpoint** `checkpoint-20260820-golive` di `8ee51b2` + `F3-mobile-finance-analytics` plan + `FinanceScreen` `MANAGEMENT` OTA.
   - ✅ **Finance polish 2026-08-22** `checkpoint-20260822-invoice` di `88e207e`: PDF faktur mirror preview HTML (header 12×12, bill-to `bg-green-50`, totals box, footer fixed `y=255`, agregat group IMCI 4-kolom + Standard per-rit 5-kolom), `CV REV BUMI NUSANTARA` Cigudeg + BCA 6044884563, multi-template registry Fase A+B (`0008`/`0010` + bucket `kwitansi` 5MB, kompresi 1280px, hal 2 preview/PDF), CRUD pelanggan/proyek + pembayaran/piutang sync DB, auto-push `AGENTS.md#7`.
    - ✅ **Bulk Ritase Massal 2026-08-23** `checkpoint-20260823-bulk` di `f8bd64e`: `0011 bulk_batch_id` + `0012 vehicles/drivers RLS QUARRY_CHECKER`, web `BulkDeliveriesView` CSV 10/50 chunk valid/error 6 model + template, mobile `BulkQuarryScreen` 10 baris (max 20) + `store bulkAddRitase` + offline queue, E2E `e2e_bulk 20/20` + `e2e_mobile_full 50/50`, UAT checklist `docs/UAT-20260823-bulk.md` — polish 2026-08-29: `15 kolom` hapus `m3_otomatis` + cm 2 des + plat normalize + sort A-Z + Note SJ IMCI + other per-rit `100k/150k` (`8096dea→13ae88c`).
    - ✅ **UI shadcn + Quarry×Produk + HPP sinkron 2026-08-24** `checkpoint-20260824-hpp-sync` di `a2d4e3f`: shadcn Fase 0-3 (`fa79aa6→851c378` + `4fb6175` screenshots), `0013 quarry_cost_history` (`quarry_material_costs.effective_date` unique `quarry_id,product_id,effective_date` + RLS) + `resolveQuarryCost` + Master grid Quarry→Produk & hapus Katalog Produk (`99a0d47→32bc9c8`), `finance.loadedVolume` non-ALL_IN + `resolveFreightRate` + backfill 511 cost (`6fc8b40→4be52fc`), HPP `ReportsView` + `HppFinanceView` `15 kolom alias` (`No SJ/Tgl/Mat/Cust/Proyek/Vol Load/Vol App/Quarry/Plat/Vendor/Pendapatan/Mat/Angkut/HPP/Laba/Margin`) `getDynamicCost()` dinamis sinkron KPI & `handleExport` (`e540728→a2d4e3f`, polish `airy KPI + striped 49ffcc3`) — fix 2026-08-29: ledger pakai `costRecords` `08cbde3` + alias `e826fe8` + `isAllIn` only `ALL_IN` `ac6039a` + Note kolom `26600f4` + keepalive daily `13ae88c`.

### Fase 0.5 — Persiapan Migrasi Cloud (sejalan dengan Fase 0-1)
Deliverable:
- Dokumentasi skema & RLS dalam **SQL ter-portable** (tanpa fitur eksklusif Supabase yang menghambat).
- Strategi pemisahan konfigurasi (env) Supabase vs GCP/Alibaba agar swap provider tidak mengubah kode aplikasi (hanya SDK endpoint).
**Exit criteria:** aplikasi berjalan sama baik di endpoint Supabase maupun endpoint Postgres/API standar dengan perubahan konfigurasi minimal.

### Fase 0.6 — Supabase sebagai Single Source of Truth (Pengganti Sinkronisasi Manual) 🔴
Latar: tombol **Sinkronisasi Data** (`data-sync`) adalah **jembatan migrasi sementara** (localStorage → Supabase). Setelah data layer web/mobile dibaca langsung dari Supabase, tombol ini **tidak diperlukan lagi**.
Deliverable:
- Refactor `AppContext` web agar **baca/tulis langsung via Supabase** (fetch + realtime subscribe), bukan init dari localStorage/seed.
- Mobile memakai Supabase sebagai sumber data online (offline queue tetap di Fase 1).
- Hapus/hilangkan tab `data-sync` (dan `supabaseImport.ts`) setelah verifikasi tidak ada lagi pembaca localStorage; jangan dihapus sebelum itu.
- Tampilkan status koneksi "terhubung langsung" sebagai pengganti indikator sinkron.
**Exit criteria:** tidak ada lagi alur import manual — perubahan di mobile/quarry muncul di cockpit web tanpa menekan tombol apa pun.

### Fase 1 — Integritas Data, Evidence & Offline 🟠
Deliverable:
- Audit log **append-only** di server (RLS insert-only, tanpa update/delete).
- Verifikasi server-side: GPS dalam radius quarry/site, timestamp memakai server clock, watermark foto bukti.
- **Offline queue** mobile (antrian aksi + sinkron saat online via Realtime/PostgREST, konflik di-handle per delivery).
- Konsolidasi master data: densitas per material × quarry, kapasitas payload kendaraan (validasi jembatan timbang), tarif angkut terpusat.
**Exit criteria:** petugas lapangan dapat bekerja offline penuh lalu tersinkron otomatis; audit log tidak dapat diubah dari sisi mana pun; foto/koordinat bukti diverifikasi server.

### Fase 2 — Kualitas, Pengujian & Ketahanan 🟡
Deliverable:
- Pindahkan engine bisnis ke `packages/shared-engine` agar web & mobile memakai kode yang sama.
- Unit test: `quantity`, `freight`, `finance`, `contract`, `state-machine` + engine ETA.
- CI (mis. GitHub Actions): lint + typecheck + test di setiap PR.
- Skema migrasi/versioning data (pattern migrations).
**Exit criteria:** semua engine lolos unit test; PR tidak bisa merge bila lint/test gagal; upgrade skema tidak merusak data.

### Fase 3 — Go-Live & Operasional 🚀 — ✅ LIVE di `https://app.revbuminusantara.biz.id` + `https://rev-bumi-os-v2-web.vercel.app` (`119de1a→13ae88c Ready`, `Vercel` `Root apps/web` `turbo`, `NEXT_PUBLIC_SUPABASE_*`, `checkpoint-20260830-bulk-internal-plan`)
### Fase 3.5 — UI shadcn (Web) 🎨 — ✅ Fase 0-3 selesai (`fa79aa6→a2d4e3f`), polish 2026-08-29 done — 🔒 UI-Only (2026-08-23 → 2026-08-24, lewat)
### Fase 3.6 — Skema KBS Internal 1 Kontrak 2 Harga (Plan .md only) 📋 — ⏳ `docs/plan/kbs-internal-1kontrak-2harga.md` 2026-08-30 (belum ubah app) — vendor `KBS-INT` + `INTERNAL_KBS 0` + `vehicles B 9xxx KBS` + `contracts unit_price_internal_m3` + bulk 15 kolom/10→20 support internal; faktur sama; harga fix menyusul.
### Fase 3.7 — Push Expo (Plan .md only) 🔔 — ⏳ `docs/plan/push-expo-fcm.md` 2026-08-30 — `push_tokens/outbox` + `send-push` Edge Function + `registerForPush` deep link; **WA hold mahal** (`whatsapp-cloud-api.md` hold).
- Scope: migrasi `apps/web` ke **shadcn/ui** (New York, Tailwind v4, cssVariables, Inter, radius 0.75, primary `#003C16`) — hanya `components/ui/*`, `components/layout/*`, `components/operations/*`, `components/finance/*`, `components/commercial/*`, `app/globals.css`, `lib/utils.ts`.
- Larangan: **jangan ubah** `context/*`, `engine/*`, `lib/supabase*.ts`, `supabase/migrations/*`, `packages/*`, `types/*` (AGENTS.md #8). Pelanggaran = rollback.
- Fase: 0 Setup (init) ✅ → 1 Primitives (button/card/dialog/table) ✅ → 2 Layout (Sidebar/Navbar) ✅ → 3 Operasi/Keuangan (Deliveries/Bulk/Invoices) ✅ + HPP 15 kolom `a2d4e3f` → 4 Polish (responsive, a11y, dark, toast) ✅ striped/airy `49ffcc3` + HPP ledger fix `08cbde3` + alias/bulk polish `e826fe8→13ae88c`.
- Exit: semua view utama pakai primitives shadcn, brand `#003C16` konsisten, `lint/build` hijau. Detail: `docs/plan/ui-shadcn-roadmap.md`.
Deliverable:
- Deploy tahap awal (gratis): **Supabase Free + Vercel** (web + PWA), domain & SSL — ✅ `web` `Ready` `33s`, `quarry@` login ok, `demo` hapus wajib RLS.
- Seed data master riil (quarry, vendor, kontrak, densitas) + onboarding — ✅ `quarry_material_costs` 15 baris `0006` + `0013` history `effective_date` per Quarry×Produk + alias `KBS`/`VND-YDH`.
 - UAT lapangan (quarry & site) + pelatihan petugas — ✅ E2E 50/50 + 27 unit test + `e2e_mobile_full` `verify_delivery_gps` 500/1000m + `e2e_bulk 20/20` + audit `rawdata/clean 499 rows 100% match` + bulk 15 kolom `B 9945 TYT` sort A-Z + `BulkQuarryScreen` searchable `5b6f35b`.
 - Monitoring, backup harian, runbook pemulihan — ✅ keepalive daily `0 3 * * * UTC` `.github/workflows/keepalive.yml` `13ae88c Success 29/08` + manual ping 11 tabel `17:17Z`; ⏳ `pg_dump` cron + runbook `docs/runbook.md` next.
- **Mitigasi free tier**: ✅ keepalive anti-pause 7 hari; kuota egress storage (bucket `kwitansi` 5MB/file, public), dan kuota fungsi.
**Exit criteria:** sistem dipakai operasional harian multi-user, backup terverifikasi, SLA internal disepakati — ⏳ UAT lapangan final bulk+HPP+Note SJ IMCI + `FinanceScreen` OTA `eas update` + verifikasi multi-template 2 faktur uji next.

### Fase 4 — Migrasi Penuh ke Cloud (GCP / Alibaba Cloud) 🏢
Tujuan: deployment production-grade di cloud publik sesuai target akhir, sambil **mempertahankan fungsi yang sudah berjalan** (tanpa tulis ulang besar).
Deliverable:
- **Database**: migrasi data Supabase → GCP Cloud SQL / Alibaba RDS PostgreSQL (pg_dump/restore atau streaming).
- **API/Auth**: pindah dari Supabase → API self-host (mis. container di GCP Cloud Run / Alibaba) + auth cloud; RLS digantikan validasi di service layer.
- **Web & PWA**: containerized Next.js di Cloud Run / Alibaba; static PWA di CDN.
- **Storage**: foto/tanda tangan → GCS / Alibaba OSS (dengan signed URL).
- **Realtime**: WebSocket/gRPC self-managed menggantikan Supabase Realtime (atau tetap via gateway).
- **Observability**: logging, tracing, alerting (GCP Cloud Monitoring / Alibaba CloudMonitor).
- **Penskalaan & biaya**: sizing instance, auto-scaling, backup otomatis, DR.
**Exit criteria:** seluruh alur operasional (quarry → site → invoice) berjalan di cloud GCP/Alibaba dengan downtime migrasi minimal, data terverifikasi utuh.

---

## 5. Strategi Migrasi ke Cloud (GCP / Alibaba Cloud)

Prinsip: **jaga portabilitas dari hari pertama** agar keputusan Supabase tidak mengunci vendor.

1. **Skema & RLS dalam SQL standar** — hindari fitur eksklusif provider; dokumentasikan sebagai migrasi versioning.
2. **Enkapsulasi akses data** — aplikasi memakai interface (mis. `DataService`) sehingga backend (Supabase SDK vs REST/Prisma) bisa ditukar via konfigurasi.
3. **Env-driven** — endpoint, kunci, region di environment variable, bukan hardcode.
4. **Backup berjalan** — export berkala dari Supabase (data + storage) agar migrasi cloud tidak kehilangan data.
5. **Uji paralel** — jalankan instance cloud (staging) berdampingan sebelum cutover, verifikasi rekonsiliasi & audit identik.

---

## 6. Fitur Produk yang Bisa Menyusul (setelah fondasi kokoh)

- Tarif angkut **per-km** (jarak sudah dihitung via OSRM).
- **AR aging / umur piutang** pelanggan.
- Analitik eksekutif: margin kotor per proyek, burn-rate kontrak — **mobile Finance & Analytics** (`docs/plan/F3-mobile-finance-analytics.md:1`, checkpoint `checkpoint-20260820-golive`).
- Integrasi **Surat Jalan elektronik** & QR scan di gate.
- Notifikasi realtime dispatcher (ritase masuk / truk tiba / ETA).
- **Mobile Finance Dashboard PWA** — KPI `Pendapatan/HPP/Laba` per `proj-01..08` di HP `MANAGEMENT` (OTA via `eas update` tanpa rebuild APK).

---

## 7. Catatan Proses untuk Agen Berikutnya

0. **Fase Polish Bisnis — HOLD Lapangan**: mulai 2026-08-30, pengembangan fokus **pencatatan bisnis** (`docs/plan/polish-bisnis-pencatatan.md` 9 prioritas: closing, PPN dinamis, AR aging, addendum, Product CRUD, DRY HPP, laporan PDF/Excel, audit pagination, dashboard tren). **Operasional lapangan di-HOLD** (`Deliveries/Recon/Field/Bulk` + Mobile PWA tidak di-touch) sampai polish bisnis stabil. `docs/plan/kbs-internal-1kontrak-2harga.md` juga hold (harga fix menyusul). **Push Expo** `docs/plan/push-expo-fcm.md` hold sampai bisnis stabil, **WA hold mahal**.
0b. **Fase UI shadcn — UI-Only**: selama `docs/plan/ui-shadcn-roadmap.md` aktif (2026-08-23→2026-08-24, lewat), **hanya ubah UI** (lihat AGENTS.md #8). Jangan sentuh logika bisnis/data — fase lewat, sekarang buka untuk fix ledger/bulk.
1. **Tidak membangun fitur baru sebelum F-01 & F-02 selesai** — fondasi data & auth adalah prioritas mutlak.
2. **Backend = Supabase** (free tier), target akhir GCP/Alibaba — selalu tulis kode & SQL yang **portabel** (env-driven, hindari vendor lock-in).
3. Setiap perubahan skema data: tulis **SQL migration** (versioning), jangan mengubah langsung.
4. Pertahankan invariant yang sudah ada: state machine pengiriman, toleransi susut ≤ 2%, audit immutability (RLS insert-only), dual-platform, densitas per material.
5. Verifikasi build/lint: `turbo check-types`, `turbo lint`, `turbo test` (setelah Fase 2).
6. Pantau limit free tier (pause Supabase, egress storage, kuota fungsi) sejak operasional awal.