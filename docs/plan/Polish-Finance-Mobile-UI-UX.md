# Roadmap Polish Finance Mobile — UI/UX Designer Spec

> Problem: `FinanceScreen.tsx:1` sebelumnya grid `KpiCard` 6 kotak putih polos, tanpa hierarki, warna flat `#F8FAFC`, icon emoji, tidak ada hero, chart, atau cerita.

## Prinsip UI/UX
- **Hierarki:** Hero (Laba) → KPI 4-grid → Chart proyek → Insight. Management lihat laba dalam 2 detik.
- **Warna bisnis:** Hijau `REV #003C16` untuk laba, biru `#0EA5E9` pendapatan, ungu `#8B5CF6` material, amber `#F59E0B` freight. Margin ≥25% hijau, 15-25% kuning, <15% merah.
- **Kedalaman:** shadow `elevation 2-4`, radius 14-16, borderLeft 4px di KPI, bukan flat.

## Spec
1. **Hero gradient** `#003C16` → `#0B5A2A` dengan eyebrow `id-ID` month, title `FINANCE COCKPIT`, card putih `LABA KOTOR` besar + badge margin warna dinamis.
2. **KPI 2×2 grid** kartu putih, `borderLeftColor` per metrik, icon `📈/⛏️/🚚/🧾`, value `Rp` 14pt 900, sub 9pt.
3. **Margin per Proyek** list 8 proyek, bar `width = margin%` (clamp 6-100), `projName` tanpa prefix, meta `m³ · laba`.
4. **Lock state** untuk `QUARRY/SITE` — card putih rounded 16, icon 28, badge `FEF3C7`.
5. **Akses:** `MainTabs` `FINANCE: 💰` hanya `MANAGEMENT` (sudah).

## Eksekusi
- File: `apps/mobile/src/screens/FinanceScreen.tsx:1` (polish), `KpiCard.tsx` tidak dipakai lagi (custom KPI di screen), `MainTabs.tsx:13` sudah.
- Verifikasi: `turbo check-types` 7/7, visual di Expo Go (dark header, hero, grid).
