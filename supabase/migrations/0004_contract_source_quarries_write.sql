-- ============================================================
-- REV BUMI OS — Fix RLS: contract_source_quarries
-- Tabel ini (multi-source quarry per kontrak) sudah punya policy
-- read-all di 0002, tapi BELUM punya policy write sehingga insert
-- dari aplikasi ditolak 403 saat import/sinkronisasi.
-- Write dibatasi untuk SUPER_ADMIN & COMMERCIAL (pengelola kontrak).
-- ============================================================

drop policy if exists contract_source_quarries_write_commercial on public.contract_source_quarries;

create policy contract_source_quarries_write_commercial on public.contract_source_quarries
  for all using (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'));