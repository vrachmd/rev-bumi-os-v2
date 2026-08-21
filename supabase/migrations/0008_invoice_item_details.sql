-- 0008: simpan detail rit di invoice_items agar PDF agregat tidak jadi "- - -"
-- Kolom sudah ada di types InvoiceItem (deliveryDate, sjImci, plateNumber) tapi belum ada di DB -> PDF jadi dash setelah reload
alter table public.invoice_items
  add column if not exists delivery_date date,
  add column if not exists sj_imci text,
  add column if not exists plate_number text;
