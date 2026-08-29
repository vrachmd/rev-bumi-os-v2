# REV Bumi OS — Material Supply & Quantity Reconciliation Operating System

Sistem Operasional dan Management - Material Agregat, Rekonsiliasi Kubikasi, Logistik & Keuangan untuk **REV BUMI NUSANTARA**.

---

## 🚀 Fitur Utama

- **Dual-Platform Architecture**:
  - **Desktop Web Cockpit**: Modul lengkap untuk Direksi, Operasional, Komersial, dan Keuangan.
  - **Mobile Lapangan (PWA)**: Aplikasi mobile layar sentuh untuk **Petugas Quarry** (Loading, Jembatan Timbang, Dimensi Bak, Dispatch Truk) dan **Petugas Site Proyek** (Konfirmasi Kedatangan GPS, Verifikasi Kubikasi Unloading, e-POD).
- **Mobile Live Dashboard**:
  - Ringkasan ritase dan kubikasi material hari ini.
  - Kartu status interaktif (*Terjadwal*, *Loading*, *In-Transit*, *Tiba di Site*, *Selesai e-POD*).
  - Aksi cepat penugasan armada vendor dan input timbangan.
- **Quantity & Variance Engine**:
  - Konversi otomatis timbangan jembatan (Gross & Tare) ke $m^3$ berbasis densitas material.
  - Evaluasi toleransi susut kontrak ($\le 2\%$) dan Berita Acara Rekonsiliasi.
- **Logistics & Freight Engine**:
  - Manajemen vendor angkutan, penugasan armada, pencatatan supir vendor, dan settlement ongkos angkut.
- **Commercial & Finance**:
  - Kontrak B2B / BUMN, penagihan invoice otomatis, PPN 11%, dan laporan margin kotor.
- **Immutable Audit Trail**:
  - Pencatatan seluruh perubahan data dan mekanisme koreksi resmi.

---

## 🏗️ Arsitektur & Backend
- **Backend**: **Supabase** (PostgreSQL terkelola + Auth + Row Level Security + Realtime + Storage + Edge Functions) — **free tier** untuk development & operasional awal.
- **Target akhir**: deployment penuh di **cloud GCP / Alibaba Cloud** (migrasi bertahap, bukan tulis ulang — lihat `ROADMAP.md`).
- **Web & PWA**: Vercel (free) sekarang → GCP Cloud Run / Alibaba saat produksi penuh.
- **Portabilitas**: skema & RLS dalam SQL ter-versioning; konfigurasi env-driven agar backend dapat ditukar tanpa mengubah kode aplikasi.
- **UI**: `apps/web` migrasi ke **shadcn/ui** (Radix + Tailwind v4, primary `#003C16`) — fase UI-only `2026-08-23 → selesai`, hanya `components/ui/*` + layout/operations/finance (AGENTS.md #8, `docs/plan/ui-shadcn-roadmap.md`). Mobile tetap RN.

---

## 📖 Dokumentasi Lengkap
- **`AGENTS.md`**: Panduan audit & instruksi pengembangan sistem untuk AI Coding Agent (termasuk **UI-Only Fase shadcn #8**).
- **`DOCUMENTATION.md`**: Buku panduan teknis, arsitektur, domain bisnis, dan formula perhitungan lengkap.
- **`rev-bumi-os/ROADMAP.md`**: Roadmap menuju produksi (8 gap fondasi, fase, strategi migrasi cloud, **Fase 3.5 UI shadcn**).
- **`rev-bumi-os/docs/plan/ui-shadcn-roadmap.md`**: Roadmap perubahan UI ke shadcn/ui (fase, file boleh/dilarang, exit criteria).
- **`MARKDOWN.md.md`**: Blueprint spesifikasi pengembangan (dengan keputusan arsitektur terbaru).

---

## 🛠️ Panduan Build & Validasi
```bash
# Validasi tipe TypeScript
npm run lint

# Kompilasi aplikasi produksi
npm run build
```
