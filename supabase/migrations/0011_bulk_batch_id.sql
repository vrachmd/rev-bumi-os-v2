-- Bulk ritase: batch id untuk audit & batalkan batch 24j
alter table public.deliveries add column if not exists bulk_batch_id text;
create index if not exists idx_deliveries_bulk_batch on public.deliveries(bulk_batch_id);
