-- 0018_kbs_internal_data.sql — Data KBS Internal setelah enum tersedia (terpisah dari 0017 karena enum tidak visible di transaksi sama)

-- 2) Vendor internal KBS
INSERT INTO transport_vendors (id, code, name, supply_type, default_pricing_model, is_active)
VALUES ('vendor-07','KBS-INT','KARYA BETON INTERNAL','INTERNAL','INTERNAL_KBS',true)
ON CONFLICT (id) DO UPDATE SET supply_type='INTERNAL', default_pricing_model='INTERNAL_KBS', is_active=true;

-- 3) Armada KBS internal 10 unit awal
INSERT INTO vehicles (id, transport_vendor_id, plate_number, vehicle_type, nominal_capacity_m3, is_active) VALUES
('veh-KBS-9001','vendor-07','B 9001 KBS','Tronton 22 m³',22,true),
('veh-KBS-9002','vendor-07','B 9002 KBS','Tronton 22 m³',22,true),
('veh-KBS-9003','vendor-07','B 9003 KBS','Tronton 22 m³',22,true),
('veh-KBS-9004','vendor-07','B 9004 KBS','Tronton 22 m³',22,true),
('veh-KBS-9005','vendor-07','B 9005 KBS','Tronton 22 m³',22,true),
('veh-KBS-9006','vendor-07','B 9006 KBS','Tronton 22 m³',22,true),
('veh-KBS-9007','vendor-07','B 9007 KBS','Tronton 22 m³',22,true),
('veh-KBS-9008','vendor-07','B 9008 KBS','Tronton 22 m³',22,true),
('veh-KBS-9009','vendor-07','B 9009 KBS','Tronton 22 m³',22,true),
('veh-KBS-9010','vendor-07','B 9010 KBS','Tronton 22 m³',22,true)
ON CONFLICT (id) DO NOTHING;

-- 4) Freight INTERNAL_KBS 0 untuk 5 proyek KBS (quarry-03 Bojonegara)
INSERT INTO freight_rates (id, transport_vendor_id, quarry_id, project_id, pricing_model, rate_per_unit, effective_date, is_active) VALUES
('frate-kbs-int-sunter','vendor-07','quarry-03','proj-04','INTERNAL_KBS',0,'2026-08-30',true),
('frate-kbs-int-pluit','vendor-07','quarry-03','proj-06','INTERNAL_KBS',0,'2026-08-30',true),
('frate-kbs-int-bogor','vendor-07','quarry-03','proj-08','INTERNAL_KBS',0,'2026-08-30',true),
('frate-kbs-int-dadap','vendor-07','quarry-03','proj-07','INTERNAL_KBS',0,'2026-08-30',true),
('frate-kbs-int-legok','vendor-07','quarry-03','proj-05','INTERNAL_KBS',0,'2026-08-30',true)
ON CONFLICT (id) DO NOTHING;

-- 5) Update kontrak KBS dengan 2 harga + material per kontrak
UPDATE contracts SET unit_price_internal_m3 = 255000, material_cost_per_m3 = 225000, pricing_variant = 'BOTH' WHERE id = 'cont-04'; -- Sunter
UPDATE contracts SET unit_price_internal_m3 = 255000, material_cost_per_m3 = 225000, pricing_variant = 'BOTH' WHERE id = 'cont-06'; -- Pluit
UPDATE contracts SET unit_price_internal_m3 = 250000, material_cost_per_m3 = 225000, pricing_variant = 'BOTH' WHERE id = 'cont-08'; -- Bogor
UPDATE contracts SET unit_price_internal_m3 = 255000, material_cost_per_m3 = 230000, pricing_variant = 'BOTH' WHERE id = 'cont-07'; -- Dadap (material 230k)
UPDATE contracts SET unit_price_internal_m3 = 236000, material_cost_per_m3 = 225000, pricing_variant = 'BOTH' WHERE id = 'cont-05'; -- Legok
