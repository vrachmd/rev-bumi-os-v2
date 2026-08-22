# Roadmap Perubahan UI ke shadcn/ui — REV Bumi OS

> Keputusan: migrasi UI web `apps/web` ke **shadcn/ui** (Radix + Tailwind v4) tanpa mengubah logika bisnis, data, maupun API. Mobile `apps/mobile` tetap React Native (token warna disamakan via nativewind, bukan shadcn).

---

## 1. Tujuan & Batasan Fase

**Tujuan:** konsistensi visual, aksesibilitas (Radix), dark mode, dan kecepatan dev via primitives shadcn. Brand hijau `primary #003C16` tetap.

**Batasan eksplisit (wajib dipatuhi agen selama fase ini):**
- **HANYA ubah tampilan/UI** di `apps/web` (`components/*`, `app/globals.css`, `lib/utils.ts`, `components/ui/*`). **JANGAN ubah** `context/*`, `engine/*`, `lib/supabase*.ts`, `supabase/migrations/*`, `packages/shared-engine`, `types/*`, maupun logika bulk/invoice/freight.
- Mobile hanya penyesuaian token warna, bukan rewrite ke shadcn.
- Setiap PR harus lolos `lint + check-types + build` (AGENTS.md #5), tidak boleh memutus tipe.

---

## 2. Inventory UI Saat Ini (web)

- Next 16 (Turbopack) + Tailwind + `lucide-react` + custom `Sidebar/Navbar/Table/Dialog` (hijau `#003C16`, `slate-*`).
- Belum ada `components/ui` shadcn; belum `components.json`; belum `cssVariables` + `cn()` helper.
- Mobile: Expo RN + `lucide-react-native` (tetap).

---

## 3. Keputusan Desain shadcn

| Item | Nilai |
|---|---|
| Style | `new-york` |
| Base color | `slate` (di-override primary `#003C16`) |
| CSS | `cssVariables` + Tailwind v4 |
| Font | `Inter` (Next font) |
| Radius | `0.75rem` |
| Icons | tetap `lucide-react` (shadcn default) |
| Dark mode | `class` (next-themes) — token `primary #003C16` tetap di dark |
| Utils | `lib/utils.ts` → `cn()` (clsx + tailwind-merge) |

File baru: `apps/web/components.json`, `apps/web/components/ui/*` (button, card, dialog, table, input, select, badge, tabs, sheet, dropdown-menu, form, toast/sonner, skeleton).

---

## 4. Fase Pengerjaan (urutan, per-phase 1 PR)

### Fase 0 — Setup (0.5 hari)
- `npx shadcn@latest init` di `apps/web` (pilih New York, Tailwind v4, cssVariables, Inter, radius 0.75).
- Verifikasi `build + lint` hijau; `globals.css` dengan `hsl(--primary 142 76% 10%)` untuk `#003C16`.

### Fase 1 — Primitives Pilot (1 hari)
- Install `button, card, dialog, table, input, select, badge, tabs, sheet, dropdown-menu, form, sonner, skeleton`.
- Pilot 1 page: `DeliveriesView` table → `shadcn Table` + `BulkDeliveriesView` modal → `Dialog` shadcn (error boundary tetap).

### Fase 2 — Layout & Navigation (1 hari)
- `Sidebar` → `shadcn Sidebar` collapsible + `Sheet` mobile, `Navbar` → `header` + `Breadcrumb`, filter `DeliveriesView` → `Select` shadcn, `Pagination` shadcn.

### Fase 3 — Operasi & Keuangan (2 hari)
- `ReconciliationView`, `InvoicesView` (preview tetap, table ganti), `PaymentsView` kolom Aksi `Pencil/Trash` → `Button` shadcn, `CustomersProjectsView` form → `Form + zod`, `BulkDeliveriesView` drag-drop → `Card` + `toast`.
- Tidak ubah `freightRates`, `invoice templates`, `finance engine`.

### Fase 4 — Polish & A11y (1 hari)
- `Responsive` (iPhone XR 414), `Focus` Radix, `Skeleton` loading, `Toasts` untuk bulk/invoice, hapus custom CSS sisa, screenshot before/after per view, `turbo check-types` 7/7 PASS.

### Fase 5 — (Opsional, setelah web stabil) Mobile Token Sync
- `nativewind` + primitives RN mirip shadcn (`Button/Card` RN) agar token `#003C16` sama — bukan blocker v1.

**Estimasi total:** 5–6 hari (web), mobile opsional +1 hari.

---

## 5. File yang Diubah vs Dilarang

**Boleh (UI-only):**
`apps/web/components/ui/*`, `apps/web/components/layout/*`, `apps/web/components/operations/*`, `apps/web/components/finance/*`, `apps/web/components/commercial/*`, `apps/web/components/reports/*`, `apps/web/app/globals.css`, `apps/web/lib/utils.ts`, `apps/web/components.json`

**Dilarang (fase ini):**
`apps/web/src/context/*`, `apps/web/src/engine/*`, `apps/web/src/lib/supabase*.ts`, `supabase/migrations/*`, `packages/*`, `apps/web/src/types/*`, `apps/mobile/src/store/*`, `apps/mobile/src/utils/supabaseData.ts`, `freight/quantity/finance` engine.

---

## 6. Kriteria Selesai (Exit)

- Semua view utama (`Deliveries, Bulk, Invoices, Payments, Customers, Reconciliation`) pakai primitives shadcn, brand `#003C16` konsisten, dark mode token ada.
- `lint 0 error`, `check-types PASS`, `build PASS`, Vercel `Ready`.
- Screenshot before/after di `docs/screenshots/shadcn-*.png` + checklist di `TASKS.md`.

---

## 7. Referensi

- `AGENTS.md #7.8` — aturan UI-only fase shadcn.
- `ROADMAP.md` Fase UI shadcn (Fase 3.5).
- `TASKS.md` — task aktif UI shadcn.
