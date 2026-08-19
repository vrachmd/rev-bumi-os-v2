# Plan Mobile Finance & Analytics — Ekstensi PWA Lapangan

> Follow-up checkpoint `checkpoint-20260820-golive` (Go-Live `8ee51b2` Ready). Fokus: bawa ringkasan keuangan ke HP Management tanpa buka cockpit.

## Tujuan
- Management lihat **margin per proyek** & **AR** dari HP, sinkron `cost_records`/`invoices`.
- Petugas tetap ringan (quarry/site), analytics hanya untuk `MANAGEMENT`/`FINANCE`.

## Fitur (tahap)
1. **Dashboard Keuangan Mobile** (Tab baru `Finance` atau `Dashboard` extended):
   - KPI: `Pendapatan Diakui`, `HPP Material (qmc cost_per_m3 × approved)`, `Freight (frate)`, `Laba Kotor`, `Margin %` per `proj-01..08`.
   - Sumber: `cost_records` + `invoices` via `supabaseFinance.ts` (sudah `fetchFinanceFromSupabase`).
   - Filter: proyek, periode, quarry.

2. **Analytics Lapangan:**
   - Trend susut `variancePercent` per quarry (Rumpin/Sudamanik/Bojonegara), `freight` per km (OSRM distance).
   - `RekonsilScreen` tambah chart `m³` `WITHIN vs ABOVE_TOLERANCE`.

3. **Offline & RLS:**
   - Finance read-only offline cache (AsyncStorage, refresh saat online), RLS `FINANCE/MANAGEMENT` via `get_audit_logs` pattern.
   - Watermark tetap, timestamp server.

## Kontrak file
- `apps/mobile/src/screens/FinanceScreen.tsx` baru (KPI cards reuse `KpiCard`).
- `apps/mobile/src/utils/supabaseFinance.ts` baru (mirror `apps/web/src/lib/supabaseFinance.ts:1`).
- `apps/mobile/src/store/useAppStore.ts:58` tambah `invoices`, `costRecords` + `getMargin(projectId)`.
- `supabase/migrations` tidak perlu baru (tabel `cost_records`, `invoices` sudah ada).

## Exit criteria
- `MANAGEMENT` login `ghifarisausans@gmail.com` di HP PWA lihat KPI sama dengan cockpit `CockpitDashboard` `243.15 m³` & `LABA KOTOR 27%`.
- `turbo check-types` 7/7, `eas update` OTA tanpa rebuild APK.

## Opsi next
- AR aging push notif (`Faktur JT 1 Faktur` di cockpit → notif HP).
- Export PDF SJ via `view-shot` sudah ada.
