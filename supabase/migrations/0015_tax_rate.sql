-- 0015_tax_rate.sql — PPN Dinamis per kontrak/customer + histori tarif
-- Sebelumnya hardcode 11% di InvoicesView/createInvoice. Sekarang bisa per kontrak (mis. 11% → 12% 2025).

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tax_rate_percent numeric NOT NULL DEFAULT 11.0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_rate_percent numeric NULL;

COMMENT ON COLUMN contracts.tax_rate_percent IS 'PPN % untuk kontrak ini (default 11.0, bisa 12.0 untuk kontrak baru)';
COMMENT ON COLUMN customers.tax_rate_percent IS 'PPN default per pelanggan (fallback jika kontrak NULL)';

-- index untuk filter
CREATE INDEX IF NOT EXISTS idx_contracts_tax_rate ON contracts(tax_rate_percent);
