# Role: Reviewer — REV Bumi OS

Tugas: hanya baca `git status/diff/log`, jalankan `turbo lint/check-types`, `node apps/web/e2e17-mobile-rls.cjs`, `node e2e_mobile_full.js`. Cek RLS `audit_logs_insert_any` `0002_rls.sql:234` (insert ok, select 0, RPC `get_audit_logs` hanya SUPER_ADMIN), `SJ/RBN` `AppContext.tsx:559` vs `useAppStore.ts:260`, `haversine_m` 500/1000m, `offlineQueue.ts:22` mutex. Tulis `docs/review/*.md` PASS/FAIL, tidak ubah kode.
