# Plan — Polish Pencatatan Bisnis (Fokus) — Hold Operasional Lapangan

> Fokus pengembangan: **pencatatan bisnis** saja (Commercial, Finance, Reports, Master, Dashboard, Audit). Operasional lapangan **di-hold** (Quarry/Site/Bulk/Mobile PWA tidak di-touch) sampai polish bisnis stabil. Hanya `.md` di fase ini — tidak ubah aplikasi.

## Prinsip
- **Bisnis dulu, lapangan hold:** Semua ritase tetap bisa dicatat via lapangan yang sudah jalan (mobile `Quarry→Site` + bulk 15 kolom), tapi tidak ada polish/tambah fitur lapangan sampai bisnis rapi.
- **Sumber kebenaran tetap:** `cost_records` ledger, `quarry_material_costs` history, `freight_rates` history — tidak ubah engine, hanya polish UI/validasi/laporan.
- **Audit & closing:** Setiap perubahan bisnis (kontrak, invoice, payment, harga master) masuk `audit_logs` insert-only.

## Ruang Lingkup — Yang Dipolish (Bisnis) vs Hold (Lapangan)

| Area | Status | File Utama |
|------|--------|------------|
| **Commercial** Customer/Project/Kontrak | **Polish** | `CustomersProjectsView.tsx:535`, `ContractsView.tsx:605`, `contract.engine.ts` |
| **Finance** Invoice/Payment/HPP | **Polish** | `InvoicesView.tsx:626`, `PaymentsView.tsx:293`, `HppFinanceView.tsx:482` |
| **Reports** 4 tab + Export | **Polish** | `ReportsView.tsx:781` |
| **Master** Quarry×Product Harga | **Polish** | `MasterDataView.tsx:515`, `supabaseMaster.ts` |
| **Dashboard** Cockpit Eksekutif | **Polish** | `CockpitDashboard.tsx:522` |
| **Audit** Trail & Koreksi | **Polish** | `AuditAdminView.tsx:478` |
| **Operasional Lapangan** Deliveries/Recon/Field/Bulk/Logistics + Mobile PWA `Dashboard/Quarry/Site/BulkQuarry` | **HOLD** | `DeliveriesView`, `BulkDeliveriesView`, `apps/mobile/*` — tidak di-touch |

## Backlog Polish Bisnis — 9 Prioritas (tanpa ubah engine)

### 1. Closing Periode & Lock (Kritis)
- `closed_periods` (`month, year, closed_by, closed_at`) + guard `createInvoice/recordPayment/updateContract/saveQuarry` block jika periode tutup. `SUPER_ADMIN` unlock + audit. Mencegah hapus invoice setelah posting.

### 2. PPN Dinamis + e-Faktur
- PPN jangan hardcode 11% (`InvoicesView` `ppnIncluded`). Tambah `contracts.tax_rate` / `customers.tax_rate` + histori (`0015_tax_rate.sql`). Export e-Faktur CSV `DPP/PPN` per invoice untuk Accurate.

### 3. AR Aging Real + Alokasi Pembayaran
- `PaymentsView` sekarang `Aging 31-60 = 45jt` hardcode. Ganti hitung `dueDate vs today` bucket `0-30/31-60/>60` + DSO + collection rate. `recordPayment` support **multi-invoice** + retensi/DP + memo kredit.

### 4. Addendum Kontrak Versioning
- `ContractsView` `updateContract` overwrite. Butuh `contract_versions` (harga/toleransi/volume/enDate) + approval `MANAGEMENT` + lampiran PDF SPK/PO + diff UI.

### 5. Master Product CRUD + Densitas + Harga Timeline
- `MasterDataView` hanya Quarry×Product harga. Tambah `Product` CRUD (`defaultMaterialCost/density/qualitySpec`) untuk `SUPER_ADMIN`, `suppliedProductIds` per quarry (tidak semua quarry supply semua produk), `effective_end_date` + timeline + diff + approve.

### 6. DRY HPP & Biaya Operasional
- `ReportsView` + `HppFinanceView` duplikat `getDynamicCost()` — ekstrak `lib/financeReport.ts` single source. `OTHER_PER_RIT` (`proj-04 100K` dst `80dc48e`) pindah ke master biaya operasional + tombol **Rekalkulasi HPP** + lock periode.

### 7. Laporan PDF/Excel + Filter Shareable + Scheduled Email
- Sekarang hanya CSV. Tambah PDF A4 + Excel pivot per customer/project untuk BUMN, `preset tanggal` (Bulan ini/Q1/YTD) + `group by` + URL query persist + `scheduled email` harian.

### 8. Audit Pagination + Role-Filter + Hash-Chain + Bukti
- `AuditAdminView` load 1000 sekaligus. Ganti server-side `limit/offset` + filter rentang tanggal/pelaku/aksi, view terfilter per `customerId/projectId` untuk `OPERATIONS/COMMERCIAL/FINANCE`, `prev_hash` per row, upload bukti slip timbangan, SLA timer notifikasi.

### 9. Dashboard Tren + Forecast + Pre-filter
- `CockpitDashboard` tanpa filter periode / tren chart. Tambah tren `Revenue/Margin/Variance` time-series, `forecast burn-rate` sisa hari kontrak, `top customer/quarry profitability`, klik exception → navigate dengan pre-filter (mis. `Overdue` → `Invoices filtered OVERDUE`), Realtime indicator.

## Yang Tidak Di-touch (Hold Lapangan)
- `DeliveriesView` `ReconciliationView` `FieldHandoverView` `BulkDeliveriesView` `LogisticsView`
- Mobile `DashboardScreen` `QuarryScreen` `SiteScreen` `BulkQuarryScreen` `VehiclePlateInput` `offlineQueue`
- `engine/quantity.freight.finance.state-machine` + `shared-engine` (27 tests) — kecuali gap #6 DRY HPP (lib baru)

## Eksekusi Bertahap (Est. 5-7 hari, .md only sekarang)
- **Fase B1 (2 hari):** #1 Closing + #2 PPN dinamis + #3 AR Aging real (migration `0015`, `0020`).
- **Fase B2 (2 hari):** #4 Addendum + #5 Product CRUD (migration `0016`).
- **Fase B3 (1 hari):** #6 DRY HPP + #7 Laporan PDF/Excel + URL.
- **Fase B4 (1 hari):** #8 Audit pagination + #9 Dashboard tren.

## Kriteria Selesai (Exit)
- `closed_periods` block edit periode tutup (teruji `SUPER_ADMIN` unlock).
- AR Aging hitung nyata dari `dueDate`, bukan hardcode.
- Kontrak punya versi + lampiran, harga master punya timeline + approve.
- Laporan PDF/Excel + URL filter + scheduled email jalan.
- `turbo check-types 7/7` `lint 0` `build PASS`, `TASKS`/`ROADMAP` terupdate, lapangan tidak berubah.

## Catatan Hold Lapangan
- Jika butuh ritase darurat lapangan, tetap pakai flow existing `Quarry → Site → POD` + bulk 15 kolom — tidak ada perubahan sampai `Fase B3` selesai. Bulk internal KBS `docs/plan/kbs-internal-1kontrak-2harga.md` juga hold sampai bisnis polish selesai (harga fix menyusul).

## Referensi
- `AGENTS.md:1` `ROADMAP.md:4` `TASKS.md:3` `docs/plan/kbs-internal-1kontrak-2harga.md` `docs/plan/ui-shadcn-roadmap.md`
