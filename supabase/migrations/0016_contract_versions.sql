-- 0016_contract_versions.sql — Addendum kontrak versioning + approval
-- Setiap perubahan harga/toleransi/volume/enDate dicatat sebagai versi baru, tidak overwrite langsung.

CREATE TABLE IF NOT EXISTS contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  unit_price_per_m3 numeric NOT NULL,
  tolerance_percent numeric NOT NULL,
  contracted_volume_m3 numeric NOT NULL,
  tax_rate_percent numeric,
  start_date date,
  end_date date,
  over_delivery_policy text,
  notes text,
  attachment_url text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'APPROVED', -- APPROVED/PENDING
  UNIQUE(contract_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_contract_versions_contract ON contract_versions(contract_id, version_number DESC);

ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_versions_read_all" ON contract_versions;
CREATE POLICY "contract_versions_read_all" ON contract_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "contract_versions_super_admin_all" ON contract_versions;
CREATE POLICY "contract_versions_super_admin_all" ON contract_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN','COMMERCIAL','MANAGEMENT'))
);

COMMENT ON TABLE contract_versions IS 'Addendum/versioning kontrak — harga/toleransi/volume histori, approval MANAGEMENT';
