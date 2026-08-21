# TASKS.md — Status Pekerjaan REV Bumi OS

> Terakhir diperbarui: 2026-08-22
> Repo: https://github.com/vrachmd/rev-bumi-os-v2 (branch `main`)
> Tag checkpoint: `checkpoint-20260820-golive` (@8ee51b2), `checkpoint-20260821-finance` (@67c0519), `checkpoint-20260822-invoice` (@88e207e)

---

## 1. Konteks Project

**REV Bumi OS** — Sistem Operasi Rantai Pasok Material Konstruksi (agregat: batu split, base course, pasir cor, abu batu, makadam) untuk **PT REV Bumi Nusantara Perkasa**.

- **Monorepo**: `rev-bumi-os/` (`apps/web` Next.js cockpit desktop, `apps/mobile` Expo React Native PWA lapangan, `packages/*` shared engine/types).
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Storage + Edge Functions), ref `kspgtupzjzdskeonnvvu`.
- **Deployment**: Vercel project `rev-bumi-os-v2-web` → domain produksi `app.revbuminusantara.biz.id` + `rev-bumi-os-v2-web.vercel.app`.
- **CI**: `.github/workflows/ci.yml` — npm ci, lint, check-types, `npx turbo run test`, build web, e2e RLS.
- **Domain bisnis inti**: ritase quarry→site, state machine SCHEDULED→LOADING→IN_TRANSIT→ARRIVED→UNLOADED→POD_SUBMITTED→POD_VERIFIED→DELIVERED, engine quantity/variance (toleransi susut ≤2%), freight (PER_TRIP/PER_M3/PER_TON), finance (invoice + PPN 11%).
- **8 Role**: SUPER_ADMIN, MANAGEMENT, OPERATIONS, COMMERCIAL, FINANCE, DISPATCHER, QUARRY_CHECKER, SITE_CHECKER. Mobile hanya 3 role: MANAGEMENT / QUARRY_CHECKER / SITE_CHECKER.
- **Aturan UI**: selalu react-icon (`lucide-react` web, `lucide-react-native` mobile) — **dilarang emoji** di UI.
- **Format SJ kanonik**: `SJ/RBN/YYYYMM/NNN`.

---

## 2. Task yang Sudah Selesai

### Fase 0–0.6 — Fondasi Supabase
- [x] Migrasi data layer web & mobile ke Supabase SDK (single source of truth).
- [x] Penyamaan format web↔mobile: seed ID DB kanonik (prod-01..05, quarry-01..03, vendor-01..06, cont-01..08, frate-01..13), JSONB `quarry_loading_info`/`site_unloading_info` skema web + fallback legacy, `ContractItem.unitPricePerM3`, freight `projectId`, `measurementMode` 3 nilai.
- [x] Verifikasi: turbo check-types 7/7 PASS, lint 0 error, build web OK, E2E RLS mobile 19/19 PASS.

### Fase 1 — Audit & Bukti Lapangan
- [x] Audit log insert-only via RLS + RPC `get_audit_logs` + verifikasi GPS haversine (`verify_delivery_gps`, radius 500m/1000m) — migration `0005_audit_and_gps.sql`.
- [x] Web: `supabaseAudit.ts`, write-through audit di AppContext, AuditAdminView fetch via RPC.
- [x] Offline queue mobile: mutex, bumpAttempts, replay saat online kembali, indikator pendingCount/lastSyncAt/isReplaying + banner, pull-to-refresh (RefreshControl + fetch deliveries). Tanpa seed fallback — hydrate dari AsyncStorage `rev_last_master/rev_last_deliveries`.
- [x] Density per quarry: migration `0006_quarry_density.sql` (kolom density + 15 baris), overload warning QuarryScreen & FieldHandoverView.
- [x] Watermark SJ + timestamp server enforcement: migration `0007_timestamp_check.sql` trigger `check_delivery_timestamp`.
- [x] Anti-duplikat SJ: suffix sekuensial → final format `SJ/RBN/YYYYMM/NNN` (web AppContext.tsx + mobile useAppStore.ts); data SJ lama ber-suffix sudah dibersihkan dari DB.

### Fase 1.5 — Go-Live GitHub + Vercel
- [x] Git init + push ke GitHub `vrachmd/rev-bumi-os-v2`.
- [x] CI pipeline lengkap (lint, typecheck, unit test, build web, e2e RLS dengan Secrets).
- [x] Vercel deploy Ready: Root Directory `apps/web`, Build `turbo run build`; fix `packageManager: npm@11.13.0`, transpilePackages jspdf; custom domain `app.revbuminusantara.biz.id` Valid.
- [x] Demo mode & data-sync dummy dihapus total (web + mobile) — wajib login Supabase.

### Fase 2 — Unifikasi Engine + Test
- [x] `shared-engine`: 27 unit test vitest (quantity 14, freight 6, state-machine 7).
- [x] `shared-types`: VarianceReason, APPROVED_ADJUSTMENT.
- [x] CI menambah step `npx turbo run test`.

### Mobile Field App (Expo)
- [x] Finance tab khusus MANAGEMENT: KPI real (Pendapatan = vol × contract price per proyek, HPP ALL_IN = rate armada / terpisah = qmc + freight), Laba Hari Ini.
- [x] Rekonsil: chart variance per quarry + filter compact (Select proyek scrollable maxHeight 220, tanggal DD-MM-YYYY, status chip) di bawah chart.
- [x] Dashboard: header presisi (avatar kiri, nama+role, subtitle "Sistem Operasional REV Bumi Nusantara", online dot), Ringkasan 3-3 MANAGEMENT, Ritase Hari Ini filter tanggal benar, empty state Truck icon.
- [x] Profile screen baru: avatar dari galeri/kamera, logout, swipe back.
- [x] Animasi: tab spring scale, stack slide 220ms bezier(0.2,0,0,1).
- [x] Full icon lucide-react-native (MainTabs, Finance, Quarry, Rekonsil) — emoji dihapus dari UI.
- [x] Fix bug: supir vs petugas tertukar (quarryCheckerName terpisah), tonase 0 (loadedWeightKg computed gross−tare / vol×density×1000), tujuan proyek tampil di list & detail Quarry/Site, role mapping SUPER_ADMIN→MANAGEMENT konsisten di App.tsx & LoginScreen, delete ritase persist last sync.

### Data Engineering & Staging (rawdata_kbs.xlsx)
- [x] Audit Excel mentah (3 sheet: Rekap_Pengiriman 1447 baris, Database Truk 1029, Harga per Plant 1000) + normalisasi.
- [x] File bersih: `rawdata/clean/rekap_clean.csv` (499 baris unik, tanggal_iso+tanggal_id, plate spesiasi, sj_imci asli + sj_rbn regenerasi sekuensial global), `truk_clean.csv` (67 truk, estimasi T bak Tronton = m³/(6.2×2.3)), `harga_clean.csv` (5).
- [x] Mapping vendor: Keterangan IVAN→vendor-05 ALL_IN (322 rit), KOSONG→vendor-06 Yudhi PER_TRIP Bogor / PER_M3 lainnya (177 rit); cost_per_m3 per supplier (PT Bravo 230k, PT Aldo 225k, dst).
- [x] DB staging: buat frate-14..17 (vendor-06 quarry-03), update qmc prod-01 quarry-03 → 225k; upsert 499 deliveries `D-CLEAN-0001..0499` (status DELIVERED, contract_id map plant→cont-04/05/06/07/08) + 241 vehicles (`veh-F9463FI` style) + update vehicle_id/driver_name/SJ IMCI notes. Total deliveries kini 511, 0 gagal.
- [x] Backup pre-staging: `backups/20260821-pre-staging/*.json` (deliveries, vehicles, quarries, products, projects, contracts, freight_rates, quarry_material_costs, customers, audit_logs) + 3 CSV clean.
- [x] Laporan: `docs/DATA-CLEAN-AUDIT.md`, `docs/DATA-CLEAN-REPORT-FINAL.md`, `docs/DATA-ENGINEERING-REPORT.md`.

### Web Cockpit
- [x] DeliveriesView kolom baru: No SJ (klik/Eye → modal detail), Status, Pelanggan/Proyek, Plat Nomor (min-w-130 nowrap), Loaded/Received/Approved, Timbangan Net, Vendor Armada, AKSI.
- [x] SJ IMCI: tampil hanya untuk pelanggan IMCI, input/edit saat status DELIVERED + IMCI (badge hijau/amber + warning di form faktur).
- [x] InvoicesView: badge IMCI pada kandidat item, InvoiceItem extended (deliveryDate, sjImci, plateNumber), createInvoice menangkap field tsb.
- [x] Manajemen faktur: deleteInvoice (izinkan SUPER_ADMIN hapus PAID, sync DB + realtime anti-balik), updateInvoiceNotes, filter kandidat `!invoicedDeliveryIds && approvedVolumeM3>0` (hanya SJ approved yang belum ditagih), tombol Edit/Hapus di tabel.
- [x] PDF vector jsPDF + jspdf-autotable mirror preview HTML 1:1 (iterasi 2026-08-22 selesai): header `RBN 12x12` + divider 0.6, bill-to box `bg-green-50` `#003C16` tanpa Alamat, table startY dinamis `billY+billH+4`, head `#003C16`, courier `11/11/8` rata untuk tgl/plat/imci/vol, bold hanya judul material, totals box `78x20` hijau, footer fixed `y=255` (Instruksi Pembayaran BCA Cab Alam Sutera 6044884563 + Hormat Kami Hendra Gunawan, S.E.), `didParseCell/willDrawCell` tinggi baris dinamis + pagination 20 baris/2 halaman. Deploy `app.revbuminusantara.biz.id` verifikasi `INV/RBN/20260821/004.pdf`.
- [x] Multi-template faktur (docs/plan/multi-template-invoice.md): `IMCI-AGREGAT` group by `productName||unitPricePerM3` + list `tgl plat sj_imci vol (KBS alias)` sort SJ numeric + 4 kolom; `STANDARD-PER-RIT` per-rit 5 kolom. Registry `resolveTemplate(contract.templateId > customer.invoiceTemplateId > name ilike %IMCI%)` + `generateInvoicePdf` di `invoice-templates/`.
- [x] Identitas perusahaan: `CV REV BUMI NUSANTARA` Kp. Lebakwangi Pasar, Rengasjajar, Cigudeg, Bogor, NPWP 1000000009047611, BCA 6044884563, `www.revbuminusantara.biz.id`, seed `seedData.ts` + migration `0009_company_update.sql` + PDF header/BCA.
- [x] Backend multi-template & kwitansi: migration `0008_invoice_item_details` (`delivery_date/sj_imci/plate_number`), `0010_invoice_template` (`customers.invoice_template_id`, `contracts.template_id`, `invoices.kwitansi_photo_url`), `supabaseMaster.ts`/`supabaseFinance.ts` map+upsert, `ItemDbRow deliveryDate/sjImci/plateNumber`.
- [x] Foto kwitansi bermaterai: bucket `kwitansi` (private→public, RLS 4 policy, 5MB, jpeg/png/webp, upsert timpa file sama), kompresi canvas 1280px jpeg 0.72 fallback, `kwitansiPhotoUrl` di `Invoice`, upload di `InvoicesView` (hal 2 preview `break-before-page` + PDF `addPage` setelah footer via `addImage JPEG`), verifikasi upload & preview.
- [x] CRUD Pelanggan & Proyek: `CustomersProjectsView.tsx` dropdown Template Faktur + tombol Pencil/Trash, `AppContext` `saveCustomer/saveProject/deleteCustomer/deleteProject` + `syncMaster/syncMasterDelete` + guard dependensi + audit, sync Supabase.
- [x] CRUD Pembayaran & Piutang: `PaymentsView.tsx` kolom Aksi Pencil/Trash, modal reuse edit (invoice disabled saat edit), `AppContext` `updatePayment/deletePayment` sync `payments` + `invoices` (`total_paid/outstanding/status` recalc) + audit.
- [x] Auto-push produksi: `AGENTS.md#7` + `.git/hooks/post-commit` push `origin/main` tiap lolos check-types+lint, Vercel auto-deploy `rev-bumi-os-v2-web` (Root `apps/web`).

---

## 3. Task yang Belum Selesai

### Aktif — prioritas tinggi
- [x] **Polish faktur PDF jsPDF agar identik pratinjau HTML** — ✅ selesai 2026-08-22 (mirror HTML, tema hijau `#003C16`, footer y=255, agregat IMCI group, pagination 20 baris) — verifikasi user `INV/RBN/20260821/004.pdf` approve.
- [ ] UAT manual 3-role (quarry→site→admin) langsung di `app.revbuminusantara.biz.id` — konfirmasi user belum masuk.
- [ ] Lengkapi Fase B UI kontrak `ContractsView.tsx` dropdown Template Faktur (backend `contracts.template_id` sudah siap via `0010`, pelanggan sudah dropdown, tinggal kontrak).
- [ ] Verifikasi end-to-end multi-template: IMCI (Karya Beton Dadap/Sunter/Bogor → alias KBS, preview hijau agregat) vs Standard Per-Rit (non-IMCI) — buat faktur uji masing-masing template.

### Menunggu / prioritas sedang
- [ ] Build APK native Android: `eas build --platform android` (user pilih APK native, bukan PWA) + siapkan OTA `eas update`.
- [ ] Runbook backup harian Supabase (`docs/runbook.md`) — restore procedure dari `backups/20260821-pre-staging/*.json`.
- [ ] Verifikasi visual Expo device tidak bisa dari environment ini — butuh user jalankan sendiri.

### Backlog
- [ ] Fase lanjutan ROADMAP.md: migrasi bertahap ke GCP Cloud SQL / Alibaba RDS (Supabase free tier → cloud penuh).
- [ ] Edge Functions server-side lanjutan (webhook, notifikasi realtime ke cockpit).
- [ ] Sisa commercial/finance polish: bulk invoice, aging piutang, rekonsiliasi freight per-vendor settlement.

---

## 4. File yang Sudah / Sedang Diubah

### Sedang diubah (aktif)
| File | Status |
|---|---|
| `apps/web/src/components/commercial/ContractsView.tsx` | **Aktif** — tambah dropdown Template Faktur per-kontrak (backend `0010` siap) |
| `apps/web/src/components/finance/PaymentsView.tsx` | **Selesai 88e207e** — edit/hapus pembayaran Piutang sync DB — stabil |

### Sudah diubah (stabil, ter-commit)
**Web (`apps/web/src`)**
- `context/AppContext.tsx` — createInvoice items extended, deleteInvoice (SUPER_ADMIN PAID), updateInvoiceNotes/updateInvoiceKwitansi, recordPayment/updatePayment/deletePayment, saveCustomer/saveProject/deleteCustomer/deleteProject, syncMaster/syncMasterDelete, format SJ `SJ/RBN/YYYYMM/NNN`
- `types/index.ts` — `InvoiceTemplateId`, `Customer.invoiceTemplateId`, `Contract.templateId`, `Invoice.kwitansiPhotoUrl`, `InvoiceItem {deliveryDate?, sjImci?, plateNumber?}`, QuarryLoadingInfo/SiteUnloadingInfo kanonik
- `components/finance/InvoicesView.tsx` — faktur polish mirror PDF/HTML, agregat group, KBS alias, hill-hapus Alamat bill-to, foto kwitansi hal 2, filter kandidat `!invoicedDeliveryIds`
- `components/finance/PaymentsView.tsx` — Piutang kolom Aksi edit/hapus, modal reuse
- `components/commercial/CustomersProjectsView.tsx` — CRUD pelanggan/proyek + Template dropdown + sync DB
- `components/finance/invoice-templates/{ImciAgregatTemplate,StandardPerRitTemplate,index}.ts` — multi-template registry Fase A+B
- `components/operations/DeliveriesView.tsx` — tabel kolom baru, modal detail, input/edit SJ IMCI
- `lib/supabaseFinance.ts` — `InvoiceDbRow.kwitansi_photo_url`, `InvoiceItemDbRow delivery_date/sj_imci/plate_number`, `mapInvoiceItem`, `upsertInvoice/deleteInvoice`, `recordPayment/updatePayment/deletePayment`
- `lib/supabaseMaster.ts` — `mapCustomer/mapContract invoice_template_id/template_id`, upsert/delete
- `lib/supabaseAudit.ts` — insertAuditLog/fetchAuditLogs/verifyDeliveryGps
- `data/seedData.ts` — `initialCompany` CV REV BUMI NUSANTARA Cigudeg
- `lib/supabase.ts` — bucket `kwitansi` (kompresi 1280px jpeg, upsert)
- `next.config.js` — transpilePackages jspdf/jspdf-autotable (fix Vercel build)

**Mobile (`apps/mobile/src`)**
- `screens/FinanceScreen.tsx`, `RekonsilScreen.tsx`, `DashboardScreen.tsx`, `ProfileScreen.tsx` (baru), `QuarryScreen.tsx`, `SiteScreen.tsx`, `LoginScreen.tsx`
- `store/useAppStore.ts` — offline queue wiring, SJ YYYYMM/NNN, getDensity, persistDeliveries on delete
- `utils/offlineQueue.ts`, `utils/supabaseData.ts`, `data/seed.ts`, `types.ts`, `navigation/MainTabs.tsx`, `QuarryStack.tsx`/`SiteStack.tsx`

**Packages**
- `packages/shared-engine/src/*.test.ts` — 27 unit tests
- `packages/shared-types/src/index.ts` — VarianceReason, APPROVED_ADJUSTMENT

**Infra & Data**
- `supabase/migrations/0005_audit_and_gps.sql`, `0006_quarry_density.sql`, `0007_timestamp_check.sql`, `0008_invoice_item_details.sql`, `0009_company_update.sql`, `0010_invoice_template.sql`
- `.github/workflows/ci.yml`, root `package.json` (packageManager), `AGENTS.md` (rule icon §7.6 + auto-push §7.7), `.git/hooks/post-commit`
- `rawdata/clean/rekap_clean.csv|truk_clean.csv|harga_clean.csv`, `backups/20260821-pre-staging/*.json`
- `docs/DATA-CLEAN-AUDIT.md`, `docs/DATA-CLEAN-REPORT-FINAL.md`, `docs/DATA-ENGINEERING-REPORT.md`, `docs/plan/multi-template-invoice.md`

---

## 5. Langkah Selanjutnya

1. ✅ **Polish faktur PDF** selesai di `88e207e` — Vercel auto-deploy → verifikasi `app.revbuminusantara.biz.id` approve `INV/RBN/20260821/004.pdf` (20 baris, footer tidak mentok).
2. **Sisa faktur**: lengkapi dropdown Template di `ContractsView.tsx` + UAT buat 2 faktur uji (IMCI agregat hijau vs Standard Per-Rit) → verifikasi preview 1:1 & foto kwitansi hal 2.
3. Jalankan UAT manual 3-step: login `quarry@revbumi.co.id` (buat ritase→timbang→dispatch), `site@revbumi.co.id` (arrive→unload→e-POD), akun admin (verify→invoice→cetak PDF).
4. Setup EAS: `npm i -g eas-cli && eas login`, konfigurasi `eas.json` (buildProfile APK), `eas build -p android`, dokumentasikan proses di runbook.
5. Buat `docs/runbook.md`: backup harian (pg_dump/JSON export), restore dari `backups/20260821-pre-staging/`, rollback checklist.
6. Tag baru `checkpoint-20260822-invoice` (@88e207e) — selanjutnya `checkpoint-20260823-go-uat` setelah UAT lapangan.

---

## Referensi Cepat

- **Supabase**: URL `https://kspgtupzjzdskeonnvvu.supabase.co` · SQL remote via `POST https://api.supabase.com/v1/projects/kspgtupzjzdskeonnvvu/database/query` (body JSON UTF-8 bytes, jangan PowerShell ConvertTo-Json)
- **Akun uji**: admin `ghifarisausans@gmail.com` (SUPER_ADMIN), quarry `quarry@revbumi.co.id`, site `site@revbumi.co.id`
- **Vercel**: project `rev-bumi-os-v2-web`, Root `apps/web`, env `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **E2E scripts**: `C:\Users\HP\AppData\Local\Temp\opencode\e2e_mobile_full.js` (50/50 PASS), `e2e17-mobile-rls.cjs` (19/19), helper `staging.js`, `create_vehicles.js`, `backup.js`
