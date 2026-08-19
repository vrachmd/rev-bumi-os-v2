-- F1-1: densitas per quarry×material (fallback products.density)
alter table public.quarry_material_costs
  add column if not exists density numeric(6,3);

-- index untuk lookup cepat
create index if not exists idx_qmc_quarry_product on public.quarry_material_costs(quarry_id, product_id);

-- seed awal: isi density dari products.density jika null (variasi geologi kecil diisi sama)
update public.quarry_material_costs qmc
set density = p.density
from public.products p
where qmc.product_id = p.id and qmc.density is null;

-- untuk pasangan quarry×product yang belum ada, buat baris dengan density fallback
-- (hanya untuk 3 quarry × 5 produk demo, idempotent via on conflict)
insert into public.quarry_material_costs (id, quarry_id, product_id, cost_per_m3, density)
select
  'qmc-' || q.id || '-' || p.id,
  q.id, p.id, p.default_material_cost, p.density
from public.quarries q cross join public.products p
where q.is_active and p.is_active
on conflict (quarry_id, product_id) do update set density = excluded.density;
