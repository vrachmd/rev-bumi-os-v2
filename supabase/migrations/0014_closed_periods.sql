-- 0014_closed_periods.sql — Closing Periode & Lock untuk pencatatan bisnis
-- Guard: invoice/payment/koreksi di periode tutup tidak boleh create/edit/delete kecuali SUPER_ADMIN unlock

CREATE TABLE IF NOT EXISTS closed_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES profiles(id),
  notes text,
  is_closed boolean NOT NULL DEFAULT true,
  UNIQUE(period_year, period_month)
);

-- index untuk cek cepat
CREATE INDEX IF NOT EXISTS idx_closed_periods_year_month ON closed_periods(period_year, period_month);

-- RLS enable
ALTER TABLE closed_periods ENABLE ROW LEVEL SECURITY;

-- Semua role bisa read (untuk guard)
DROP POLICY IF EXISTS "closed_periods_read_all" ON closed_periods;
CREATE POLICY "closed_periods_read_all" ON closed_periods FOR SELECT USING (true);

-- Hanya SUPER_ADMIN boleh insert/update/delete (via service_role atau super_admin)
DROP POLICY IF EXISTS "closed_periods_super_admin_all" ON closed_periods;
CREATE POLICY "closed_periods_super_admin_all" ON closed_periods FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'SUPER_ADMIN')
);

-- helper function untuk cek periode tutup (dipakai di app layer, bukan DB trigger — biar app bisa kasih pesan jelas)
-- contoh: SELECT is_period_closed(2026, 8) -> true jika ada baris closed
CREATE OR REPLACE FUNCTION is_period_closed(p_year int, p_month int)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM closed_periods WHERE period_year = p_year AND period_month = p_month AND is_closed = true);
$$;

COMMENT ON TABLE closed_periods IS 'Lock periode pencatatan bisnis — invoice/payment/kontrak tidak bisa diubah di periode tutup kecuali SUPER_ADMIN unlock';
