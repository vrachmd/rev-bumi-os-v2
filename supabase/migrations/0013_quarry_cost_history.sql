-- 0013: quarry material cost history — harga per Quarry×Produk dengan effective_date (audit, tidak overwrite harga lama)
-- Sebelumnya quarry_material_costs hanya 1 baris per (quarry_id,product_id) onConflict overwrite → harga baru retroaktif ubah HPP lama.

-- Tambah kolom effective_date + is_active untuk versioning
alter table public.quarry_material_costs
  add column if not exists effective_date date not null default '2026-01-01',
  add column if not exists is_active boolean not null default true;

-- Set effective_date untuk data lama (seed & backfill)
update public.quarry_material_costs set effective_date = '2026-01-01' where effective_date is null;

-- Ganti unique constraint dari (quarry_id,product_id) ke (quarry_id,product_id,effective_date) agar bisa history
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'quarry_material_costs_quarry_id_product_id_key') then
    alter table public.quarry_material_costs drop constraint quarry_material_costs_quarry_id_product_id_key;
  end if;
  if exists (select 1 from pg_constraint where conname = 'quarry_material_costs_quarry_id_product_id_effective_date_key') then
    alter table public.quarry_material_costs drop constraint quarry_material_costs_quarry_id_product_id_effective_date_key;
  end if;
exception when others then null;
end $$;

alter table public.quarry_material_costs
  add constraint quarry_material_costs_quarry_id_product_id_effective_date_key
  unique (quarry_id, product_id, effective_date);

-- Index untuk lookup harga berlaku saat scheduledDate (cost = max effective_date <= onDate)
create index if not exists idx_qmc_effective_date on public.quarry_material_costs(quarry_id, product_id, effective_date desc);

-- RLS tetap: sudah ada policy untuk quarry_material_costs (anon/authenticated)
-- Pastikan insert baru dengan effective_date berbeda tidak onConflict overwrite lama
