-- 0010: multi-template faktur (IMCI agregat vs Standard per-rit) + foto kwitansi bermaterai
alter table public.customers add column if not exists invoice_template_id text check (invoice_template_id in ('IMCI-AGREGAT','STANDARD-PER-RIT'));
alter table public.contracts add column if not exists template_id text check (template_id in ('IMCI-AGREGAT','STANDARD-PER-RIT'));
alter table public.invoices add column if not exists kwitansi_photo_url text;
-- seed default: IMCI customers pakai AGREGAT
update public.customers set invoice_template_id='IMCI-AGREGAT' where name ilike '%IMCI%';
update public.customers set invoice_template_id='STANDARD-PER-RIT' where invoice_template_id is null and name not ilike '%IMCI%';
-- storage bucket untuk foto kwitansi (jika belum ada, buat via dashboard Storage > kwitansi)
-- insert into storage.buckets (id, name, public) values ('kwitansi','kwitansi', false) on conflict do nothing;
