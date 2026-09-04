-- 0019_project_other_costs.sql — Biaya operasional per-rit per proyek (ganti hardcode OTHER_PER_RIT di financeReport.ts/AppContext)
-- Sebelumnya 100K Sunter/Pluit, 150K Legok/Dadap/Bogor hardcode. Sekarang di DB dengan history effective_date.

CREATE TABLE IF NOT EXISTS project_other_costs (
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_per_rit numeric NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_project_other_costs_project ON project_other_costs(project_id, effective_date DESC);

ALTER TABLE project_other_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_other_costs_read_all" ON project_other_costs;
CREATE POLICY "project_other_costs_read_all" ON project_other_costs FOR SELECT USING (true);

DROP POLICY IF EXISTS "project_other_costs_admin_all" ON project_other_costs;
CREATE POLICY "project_other_costs_admin_all" ON project_other_costs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN','FINANCE','MANAGEMENT'))
);

-- Seed awal dari hardcode existing
INSERT INTO project_other_costs (project_id, cost_per_rit, effective_date, notes) VALUES
('proj-04', 100000, '2026-01-01', 'Sunter — dari hardcode OTHER_PER_RIT'),
('proj-06', 100000, '2026-01-01', 'Pluit — dari hardcode OTHER_PER_RIT'),
('proj-05', 150000, '2026-01-01', 'Legok — dari hardcode OTHER_PER_RIT'),
('proj-07', 150000, '2026-01-01', 'Dadap — dari hardcode OTHER_PER_RIT'),
('proj-08', 150000, '2026-01-01', 'Bogor — dari hardcode OTHER_PER_RIT')
ON CONFLICT (project_id, effective_date) DO UPDATE SET cost_per_rit = EXCLUDED.cost_per_rit;

COMMENT ON TABLE project_other_costs IS 'Biaya operasional per-rit per proyek (HPP other) — history effective_date, fallback 100K';
