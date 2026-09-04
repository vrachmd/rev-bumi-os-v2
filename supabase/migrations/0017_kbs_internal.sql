-- 0017_kbs_internal.sql — Skema KBS Internal 1 Kontrak 2 Harga + Vendor Internal + Armada + Material per Kontrak
-- Harga tagihan internal (dari user 2026-08-30):
-- Sunter 255k, Pluit 255k, Bogor 250k, Dadap 255k, Legok 236k (Batu Split)
-- Harga material:
-- Sunter 225k, Pluit 225k, Bogor 225k, Dadap 230k, Legok 225k

-- 0) Tambah enum values untuk INTERNAL
DO $$ BEGIN
  ALTER TYPE vendor_supply_type ADD VALUE IF NOT EXISTS 'INTERNAL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE freight_pricing_model ADD VALUE IF NOT EXISTS 'INTERNAL_KBS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1) Tambah kolom 2 harga + material per kontrak (nullable, fallback ke existing)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS unit_price_internal_m3 numeric NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS material_cost_per_m3 numeric NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pricing_variant text DEFAULT 'EXTERNAL';

COMMENT ON COLUMN contracts.unit_price_internal_m3 IS 'Harga tagihan internal KBS (jika pakai armada KBS, IMCI tanggung ongkos) — fallback ke unit_price_per_m3 jika NULL';
COMMENT ON COLUMN contracts.material_cost_per_m3 IS 'Harga material HPP per kontrak (override quarry_material_costs jika terisi) — untuk beda 225 vs 230 per plant';
