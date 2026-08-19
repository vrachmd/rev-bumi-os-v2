-- ============================================================
-- REV BUMI OS — Row Level Security (RLS) + Trigger
-- Menegakkan hak akses 8 role di level database.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: role aplikasi untuk pengguna saat ini (dari tabel profiles)
-- ------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Trigger: updated_at otomatis
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','companies','products','quarries','customers','projects',
    'contracts','transport_vendors','vehicles','drivers','freight_rates',
    'deliveries','invoices','correction_requests'
  ]
  loop
    execute format('drop trigger if exists trg_%s_updated on public.%I', t, t);
    execute format(
      'create trigger trg_%s_updated before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ============================================================
-- Aktifkan RLS pada semua tabel bisnis
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.companies           enable row level security;
alter table public.products            enable row level security;
alter table public.product_prices      enable row level security;
alter table public.quarries            enable row level security;
alter table public.quarry_material_costs enable row level security;
alter table public.customers           enable row level security;
alter table public.projects            enable row level security;
alter table public.contracts           enable row level security;
alter table public.contract_source_quarries enable row level security;
alter table public.transport_vendors   enable row level security;
alter table public.vehicles            enable row level security;
alter table public.drivers             enable row level security;
alter table public.freight_rates       enable row level security;
alter table public.deliveries          enable row level security;
alter table public.weighbridge_records enable row level security;
alter table public.delivery_pods       enable row level security;
alter table public.quantity_reconciliations enable row level security;
alter table public.cost_records        enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_items       enable row level security;
alter table public.payments            enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.correction_requests enable row level security;

-- ============================================================
-- RINGKASAN MATRIKS AKSES
--   READ  : semua role yang sudah login (autentikasi Supabase)
--   WRITE : dibatasi per tabel/peran
--   ADMIN : SUPER_ADMIN punya akses penuh
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
-- User bisa baca & edit profil dirinya sendiri; SUPER_ADMIN baca semua.
create policy profiles_select_self on public.profiles
  for select using (auth.uid() = id or public.current_user_role() = 'SUPER_ADMIN');
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- User dapat membuat profil dirinya sendiri saat login pertama (role default
-- QUARRY_CHECKER; SUPER_ADMIN yang meng-upgrade). Profil role lain oleh SUPER_ADMIN.
create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_insert_admin on public.profiles
  for insert with check (public.current_user_role() = 'SUPER_ADMIN');

-- ------------------------------------------------------------
-- MASTER DATA (products, quarries, customers, projects, vendors, vehicles, drivers)
-- ------------------------------------------------------------
-- Semua role terautentikasi dapat membaca master data (dibutuhkan di lapangan).
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'products','quarries','customers','projects','transport_vendors','vehicles','drivers',
    'product_prices','quarry_material_costs','contract_source_quarries'
  ]
  loop
    execute format('drop policy if exists %s_select_all on public.%I', 'p_'||tbl||'_read', tbl);
    execute format(
      'create policy p_%s_read on public.%I for select using (true)',
      tbl, tbl
    );
  end loop;
end $$;

-- Write master: hanya role kantor (COMMERCIAL untuk customers/projects/contracts,
-- OPERATIONS/COMMERCIAL untuk vendors; SUPER_ADMIN semuanya).
create policy products_write_admin on public.products
  for all using (public.current_user_role() in ('SUPER_ADMIN')) with check (public.current_user_role() in ('SUPER_ADMIN'));

create policy product_prices_write_admin on public.product_prices
  for all using (public.current_user_role() = 'SUPER_ADMIN') with check (public.current_user_role() = 'SUPER_ADMIN');

create policy quarries_write_admin on public.quarries
  for all using (public.current_user_role() = 'SUPER_ADMIN') with check (public.current_user_role() = 'SUPER_ADMIN');

create policy quarry_material_costs_write_admin on public.quarry_material_costs
  for all using (public.current_user_role() = 'SUPER_ADMIN') with check (public.current_user_role() = 'SUPER_ADMIN');

create policy customers_write_commercial on public.customers
  for all using (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'));

create policy projects_write_commercial on public.projects
  for all using (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'));

create policy vendors_write_ops on public.transport_vendors
  for all using (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'));

create policy vehicles_write_ops on public.vehicles
  for all using (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'));

create policy drivers_write_ops on public.drivers
  for all using (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'));

-- ------------------------------------------------------------
-- CONTRACTS
-- ------------------------------------------------------------
create policy contracts_read_all on public.contracts
  for select using (true);
create policy contracts_write_commercial on public.contracts
  for all using (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','COMMERCIAL'));

-- ------------------------------------------------------------
-- FREIGHT RATES
-- ------------------------------------------------------------
create policy freight_rates_read_all on public.freight_rates
  for select using (true);
create policy freight_rates_write_ops on public.freight_rates
  for all using (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'))
  with check (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL'));

-- ------------------------------------------------------------
-- DELIVERIES & RITASE (seluruh alur life cycle)
-- Dispatcher/Quarry/Site/Operations menulis ritase; semua role membaca.
-- ------------------------------------------------------------
create policy deliveries_read_all on public.deliveries
  for select using (true);

create policy deliveries_write_ops on public.deliveries
  for all using (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','DISPATCHER','QUARRY_CHECKER','SITE_CHECKER'))
  with check (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','DISPATCHER','QUARRY_CHECKER','SITE_CHECKER'));

create policy weighbridge_read_all on public.weighbridge_records
  for select using (true);
create policy weighbridge_write_ops on public.weighbridge_records
  for all using (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','DISPATCHER','QUARRY_CHECKER'))
  with check (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','DISPATCHER','QUARRY_CHECKER'));

create policy pods_read_all on public.delivery_pods
  for select using (true);
create policy pods_write_ops on public.delivery_pods
  for all using (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','SITE_CHECKER','DISPATCHER'))
  with check (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','SITE_CHECKER','DISPATCHER'));

create policy reconciliation_read_all on public.quantity_reconciliations
  for select using (true);
create policy reconciliation_write_ops on public.quantity_reconciliations
  for all using (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS'))
  with check (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS'));

create policy cost_records_read_all on public.cost_records
  for select using (true);
create policy cost_records_write_finance on public.cost_records
  for all using (public.current_user_role() in ('SUPER_ADMIN','FINANCE','OPERATIONS'))
  with check (public.current_user_role() in ('SUPER_ADMIN','FINANCE','OPERATIONS'));

-- ------------------------------------------------------------
-- INVOICES & PAYMENTS (Khusus FINANCE, MANAGEMENT baca; SUPER_ADMIN penuh)
-- ------------------------------------------------------------
create policy invoices_read_all on public.invoices
  for select using (true);
create policy invoices_write_finance on public.invoices
  for all using (public.current_user_role() in ('SUPER_ADMIN','FINANCE'))
  with check (public.current_user_role() in ('SUPER_ADMIN','FINANCE'));

create policy invoice_items_read_all on public.invoice_items
  for select using (true);
create policy invoice_items_write_finance on public.invoice_items
  for all using (public.current_user_role() in ('SUPER_ADMIN','FINANCE'))
  with check (public.current_user_role() in ('SUPER_ADMIN','FINANCE'));

create policy payments_read_all on public.payments
  for select using (true);
create policy payments_write_finance on public.payments
  for all using (public.current_user_role() in ('SUPER_ADMIN','FINANCE'))
  with check (public.current_user_role() in ('SUPER_ADMIN','FINANCE'));

-- ------------------------------------------------------------
-- AUDIT LOGS — INSERT-ONLY (immutable, tidak bisa diupdate/dihapus)
-- ------------------------------------------------------------
create policy audit_logs_insert_any on public.audit_logs
  for insert with check (true);
-- Sengaja TIDAK ada policy select/update/delete untuk role aplikasi.
-- Select audit hanya via service-role / fungsi RPC SUPER_ADMIN di Fase 1.

-- ------------------------------------------------------------
-- CORRECTION REQUESTS
-- ------------------------------------------------------------
create policy corrections_read_all on public.correction_requests
  for select using (true);
create policy corrections_write_all on public.correction_requests
  for all using (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','FINANCE','COMMERCIAL'))
  with check (public.current_user_role() in
    ('SUPER_ADMIN','OPERATIONS','FINANCE','COMMERCIAL'));

-- ------------------------------------------------------------
-- Realtime: publish tabel operasional agar cockpit menerima
-- perubahan ritase dari lapangan secara real-time.
-- (Guard: publication hanya ada di Supabase; dilewati bila tidak ada)
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.deliveries;
    alter publication supabase_realtime add table public.weighbridge_records;
    alter publication supabase_realtime add table public.delivery_pods;
    alter publication supabase_realtime add table public.quantity_reconciliations;
    alter publication supabase_realtime add table public.cost_records;
    alter publication supabase_realtime add table public.invoices;
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;