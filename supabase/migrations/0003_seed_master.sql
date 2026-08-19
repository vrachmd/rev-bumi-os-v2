-- ============================================================
-- REV BUMI OS — Seed Data Awal (Fase 0)
-- Data master mengikuti apps/web/src/data/seedData.ts (canonical).
-- ============================================================

-- ------------------------------------------------------------
-- COMPANY
-- ------------------------------------------------------------
insert into public.companies (id, name, brand, code, address, phone, email, primary_color)
values (
  'comp-rev-01',
  'PT REV Bumi Nusantara Perkasa',
  'REV Bumi Nusantara',
  'RBN',
  'Graha Nusantara Lt. 8, Jl. TB Simatupang Kav. 15, Jakarta Selatan 12530',
  '+62 21 7884 9920',
  'operasional@revbumi.co.id',
  '#003C16'
) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- PRODUCTS (Material Agregat)
-- ------------------------------------------------------------
insert into public.products
  (id, code, name, category, primary_unit, density, quality_spec, abrasion_spec,
   default_material_cost, default_selling_price, is_active)
values
  ('prod-01','SPLIT-1-2','Batu Split Andesit 1-2 (10-20mm)','Coarse Aggregate','m3',1.60,
   'Andesit Murni, Gradasi Teratur, Kadar Lumpur < 1.0%','Los Angeles Test < 19.5%',95000,175000,true),
  ('prod-02','BASE-COURSE-A','Base Course Kelas A (0-37.5mm)','Road Base Aggregate','m3',1.70,
   'CBR > 90%, Sand Equivalent > 50%','Los Angeles Test < 25.0%',90000,165000,true),
  ('prod-03','ABU-BATU','Abu Batu (0-5mm)','Fine Aggregate','m3',1.55,
   'Kadar debu terkontrol, kadar air < 4.0%','Standar Bina Marga 2018',80000,150000,true),
  ('prod-04','PASIR-PASANG','Pasir Cor / Pasir Pasang Ekstra','Natural Sand','m3',1.50,
   'Modulus Kehalusan 2.6 - 3.1, Bebas Organik',null,130000,210000,true),
  ('prod-05','MAKADAM-5-7','Batu Makadam 5-7 (50-70mm)','Sub-base Aggregate','m3',1.65,
   'Batuan Keras Andesit Segar','Los Angeles Test < 22.0%',85000,155000,true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- QUARRIES
-- ------------------------------------------------------------
insert into public.quarries
  (id, code, name, location_name, address, gps_lat, gps_lng, has_weighbridge,
   abrasion_rating, is_active, supplied_product_ids)
values
  ('quarry-01','QRY-RMP','Quarry Rumpin Andesit','Rumpin, Kab. Bogor',
   'Jl. Raya Prada Samlawi No. 45, Rumpin, Bogor, Jawa Barat',-6.44215,106.63842,true,
   'Grade A (18.2% LA)',true,'{prod-01,prod-02,prod-03,prod-05}'),
  ('quarry-02','QRY-SDM','Quarry Sudamanik Aggregate','Sudamanik, Cigudeg, Bogor',
   'Kawasan Pertambangan Sudamanik, Cigudeg, Bogor',-6.52189,106.55123,true,
   'Grade A (19.0% LA)',true,'{prod-01,prod-02,prod-05}'),
  ('quarry-03','QRY-BJN','Quarry Bojonegara Andesit','Bojonegara, Serang',
   'Kawasan Pertambangan Bojonegara, Serang, Banten',-5.98210,106.04820,true,
   'Grade A (17.8% LA)',true,'{prod-01,prod-02,prod-05}')
on conflict (id) do nothing;

insert into public.quarry_material_costs (id, quarry_id, product_id, cost_per_m3)
values
  ('qmc-01','quarry-01','prod-03',78000),
  ('qmc-02','quarry-01','prod-05',86000),
  ('qmc-03','quarry-02','prod-01',92000),
  ('qmc-04','quarry-02','prod-02',88000),
  ('qmc-05','quarry-02','prod-05',82000),
  ('qmc-06','quarry-03','prod-01',90000),
  ('qmc-07','quarry-03','prod-02',87000),
  ('qmc-08','quarry-03','prod-05',83000)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------
insert into public.customers
  (id, code, name, npwp, billing_address, contact_person, phone, email, payment_terms_days, is_active)
values
  ('cust-01','CUST-WSKT','PT Waskita Karya (Persero) Tbk','01.001.614.5-093.000',
   'Waskita Heritage Building, Jl. MT Haryono Kav. 10, Cawang, Jakarta Timur',
   'Bpk. Ir. Danang Priyanto (Project Director)','+62 21 8508 510',
   'procurement.cisumdawu@waskita.co.id',30,true),
  ('cust-02','CUST-WIKA','PT Wijaya Karya (Persero) Tbk','01.001.615.2-092.000',
   'WIKA Tower 1, Jl. D.I. Panjaitan Kav. 9-10, Jakarta Timur',
   'Ibu Ratna Paramitha (Procurement Manager)','+62 21 8192 808',
   'pengadaan.ciawi@wika.co.id',45,true),
  ('cust-03','CUST-HK','PT Hutama Karya (Persero)','01.001.616.0-093.000',
   'HK Tower, Jl. MT Haryono Kav. 8, Cawang, Jakarta Timur',
   'Bpk. Hendro Sasongko','+62 21 8193 708',
   'logistik.proyek@hutamakarya.com',30,true),
  ('cust-04','CUST-IMCI','PT IMCI','01.123.456.7-093.000',
   'Gedung IMCI Tower, Jl. Karya Beton Kav. 5, Jakarta Utara',
   'Ibu Dewi Anggraini (Procurement)','+62 21 5555 1234',
   'procurement@imci.co.id',30,true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- PROJECTS
-- ------------------------------------------------------------
insert into public.projects
  (id, customer_id, project_number, name, location, gps_lat, gps_lng, start_date, end_date, status)
values
  ('proj-01','cust-01','PRJ-WSKT-CSM-02','Proyek Pembangunan Jalan Tol Cisumdawu Seksi 5B & 6',
   'Kab. Sumedang - Majalengka, Jawa Barat',-6.78912,108.01234,'2026-01-15','2026-12-31','ACTIVE'),
  ('proj-02','cust-02','PRJ-WIKA-CAW-01','Proyek Bendungan Kering Ciawi Paket 3',
   'Megamendung, Kab. Bogor',-6.65412,106.91244,'2026-03-01','2026-10-30','ACTIVE'),
  ('proj-03','cust-03','PRJ-HK-MRT-2A','Proyek MRT Jakarta Fase 2A CP-201',
   'Harmoni - Monas, Jakarta Pusat',-6.17540,106.82710,'2026-02-10','2027-04-30','ACTIVE'),
  ('proj-04','cust-04','PRJ-IMCI-KBS-SUNTER','Plant Karya Beton Sunter',
   'Sunter, Jakarta Utara',-6.14250,106.85920,'2026-01-01','2026-12-31','ACTIVE'),
  ('proj-05','cust-04','PRJ-IMCI-KBS-LEGOK','Plant Karya Beton Legok',
   'Legok, Tangerang',-6.32850,106.56820,'2026-01-01','2026-12-31','ACTIVE'),
  ('proj-06','cust-04','PRJ-IMCI-KBS-PLUIT','Plant Karya Beton Pluit',
   'Pluit, Jakarta Utara',-6.11680,106.78540,'2026-01-01','2026-12-31','ACTIVE'),
  ('proj-07','cust-04','PRJ-IMCI-KBS-DADAP','Plant Karya Beton Dadap',
   'Dadap, Tangerang',-6.05230,106.67280,'2026-01-01','2026-12-31','ACTIVE'),
  ('proj-08','cust-04','PRJ-IMCI-KBS-BOGOR','Plant Karya Beton Bogor',
   'Bogor, Jawa Barat',-6.58430,106.78340,'2026-01-01','2026-12-31','ACTIVE')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- CONTRACTS
-- ------------------------------------------------------------
insert into public.contracts
  (id, contract_number, customer_id, project_id, product_id, quarry_id, contract_type,
   contracted_volume_m3, unit_price_per_m3, tolerance_percent, over_delivery_policy,
   start_date, end_date, status, notes)
values
  ('cont-01','RBN/WSKT-CSM/2026/001','cust-01','proj-01','prod-01','quarry-01','PO_BASED',
   10000,175000,2.0,'WARNING','2026-02-01','2026-09-30','ACTIVE',
   'Kebutuhan rigid pavement andesit grade A. Pengiriman tronton 24-28 m3.'),
  ('cont-02','RBN/WIKA-CAW/2026/002','cust-02','proj-02','prod-02','quarry-02','PO_BASED',
   5000,165000,2.0,'REQUIRES_APPROVAL','2026-03-15','2026-08-31','ACTIVE',
   'Base course urugan tanggul dan jalan akses bendungan.'),
  ('cont-03','RBN/HK-MRT/2026/003','cust-03','proj-03','prod-04','quarry-03','PO_BASED',
   12000,210000,1.5,'BLOCKED','2026-02-20','2026-11-30','ACTIVE',
   'Pasir cor kualitas utama uji lab berkala.'),
  ('cont-04','RBN/IMCI-KBS-SUNTER/2026/NP','cust-04','proj-04','prod-01','quarry-03','NON_PO',
   0,365000,2.0,'WARNING','2026-01-01','2026-12-31','ACTIVE',
   'Non-PO rutin ke Batching Plant. Dibayar IMCI 365.000/m³; vendor Ivan all-in 345.000/m³ (sumber Bojonegara).'),
  ('cont-05','RBN/IMCI-KBS-LEGOK/2026/NP','cust-04','proj-05','prod-01','quarry-03','NON_PO',
   0,335000,2.0,'WARNING','2026-01-01','2026-12-31','ACTIVE',
   'Non-PO rutin ke Batching Plant. Dibayar IMCI 335.000/m³; vendor Ivan all-in 315.000/m³ (sumber Bojonegara).'),
  ('cont-06','RBN/IMCI-KBS-PLUIT/2026/NP','cust-04','proj-06','prod-01','quarry-03','NON_PO',
   0,355000,2.0,'WARNING','2026-01-01','2026-12-31','ACTIVE',
   'Non-PO rutin ke Batching Plant Pluit. Vendor Ivan all-in 355.000/m³ (sumber Bojonegara).'),
  ('cont-07','RBN/IMCI-KBS-DADAP/2026/NP','cust-04','proj-07','prod-02','quarry-03','NON_PO',
   0,315000,2.0,'WARNING','2026-01-01','2026-12-31','ACTIVE',
   'Non-PO rutin ke Batching Plant Dadap. Vendor Ivan all-in 315.000/m³ (sumber Bojonegara).'),
  ('cont-08','RBN/IMCI-KBS-BOGOR/2026/NP','cust-04','proj-08','prod-01','quarry-03','NON_PO',
   0,345000,2.0,'WARNING','2026-01-01','2026-12-31','ACTIVE',
   'Non-PO rutin ke Batching Plant Bogor. Vendor Ivan all-in 345.000/m³ (sumber Bojonegara).')
on conflict (id) do nothing;

-- Multi-source quarry per kontrak
insert into public.contract_source_quarries (contract_id, quarry_id) values
  ('cont-01','quarry-01'), ('cont-01','quarry-02'),
  ('cont-04','quarry-03'), ('cont-04','quarry-02'), ('cont-04','quarry-01'),
  ('cont-05','quarry-03'), ('cont-05','quarry-02'), ('cont-05','quarry-01'),
  ('cont-06','quarry-03'), ('cont-06','quarry-02'), ('cont-06','quarry-01'),
  ('cont-07','quarry-03'), ('cont-07','quarry-02'), ('cont-07','quarry-01'),
  ('cont-08','quarry-03'), ('cont-08','quarry-02'), ('cont-08','quarry-01')
on conflict do nothing;

-- ------------------------------------------------------------
-- TRANSPORT VENDORS
-- ------------------------------------------------------------
insert into public.transport_vendors
  (id, code, name, contact_person, phone, default_pricing_model, supply_type, is_active, notes)
values
  ('vendor-01','VND-LLN','PT Lintas Logistik Nusantara','Bpk. H. Sukardi','+62 812 8877 6655','PER_M3','TRANSPORT_ONLY',true,null),
  ('vendor-02','VND-AMP','CV Andalas Mandiri Perkasa','Bpk. Yudi Kurniawan','+62 813 1122 3344','PER_TRIP','TRANSPORT_ONLY',true,null),
  ('vendor-03','VND-SAP','PT Samudera Angkutan Prima','Ibu Maya Lestari','+62 811 9988 7766','PER_TON','TRANSPORT_ONLY',true,null),
  ('vendor-04','VND-MSD','UD Mitra Suplai Delivered','Bpk. Oman Gunawan','+62 812 3344 5566','ALL_IN','MATERIAL_AND_TRANSPORT',true,null),
  ('vendor-05','VND-IVN','Armada Ivan Beton Supply','Bpk. Ivan','+62 812 7788 9901','ALL_IN','MATERIAL_AND_TRANSPORT',true,
   'All-in ke batching plant IMCI. HPP total material + angkut.'),
  ('vendor-06','VND-YDH','Armada Yudhi Transport','Bpk. Yudhi','+62 813 2211 4455','PER_M3','TRANSPORT_ONLY',true,
   'Hanya ongkos kirim. Material mengikuti harga quarry.')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- VEHICLES
-- ------------------------------------------------------------
insert into public.vehicles
  (id, transport_vendor_id, plate_number, vehicle_type, nominal_capacity_m3, is_active)
values
  ('veh-01','vendor-01','B 9812 UYX','Dump Truck Tronton 10 Roda (Index 24-26 m³)',26.0,true),
  ('veh-02','vendor-01','B 9145 TXX','Dump Truck Tronton 10 Roda (Index 24 m³)',24.0,true),
  ('veh-03','vendor-02','D 8821 AB','Dump Truck Tronton 10 Roda (Index 28 m³)',28.0,true),
  ('veh-04','vendor-03','B 9554 PZX','Dump Truck Colt Diesel 6 Roda (Index 8 m³)',8.0,true),
  ('veh-05','vendor-04','B 8472 QWY','Dump Truck Tronton 10 Roda (Index 24 m³)',24.0,true),
  ('veh-06','vendor-05','B 9123 IVX','Dump Truck Tronton 10 Roda (Index 26 m³)',26.0,true),
  ('veh-07','vendor-05','B 9187 IVY','Dump Truck Tronton 10 Roda (Index 24 m³)',24.0,true),
  ('veh-08','vendor-06','B 8451 YDH','Dump Truck Tronton 10 Roda (Index 24 m³)',24.0,true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- DRIVERS
-- ------------------------------------------------------------
insert into public.drivers
  (id, transport_vendor_id, full_name, phone, sim_number, is_active)
values
  ('drv-01','vendor-01','Budi Santoso','+62 856 7788 9901','SIM B2 UMUM - 8812901239',true),
  ('drv-02','vendor-01','Agus Hermawan','+62 857 1122 4455','SIM B2 UMUM - 9912093841',true),
  ('drv-03','vendor-02','Joko Widodo Priyanto','+62 813 4455 6677','SIM B2 UMUM - 1209384120',true),
  ('drv-04','vendor-03','Dedi Supriyadi','+62 878 9900 1122','SIM B1 - 7766554433',true),
  ('drv-05','vendor-05','Rohman Hidayat','+62 857 3344 5566','SIM B2 UMUM - 1209384121',true),
  ('drv-06','vendor-06','Slamet Riyadi','+62 856 5566 7788','SIM B2 UMUM - 1209384122',true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- FREIGHT RATES
-- ------------------------------------------------------------
insert into public.freight_rates
  (id, transport_vendor_id, quarry_id, project_id, pricing_model, rate_per_unit,
   is_all_inclusive_material, all_in_volume_basis, toll_fee, loading_fee, unloading_fee,
   effective_date, is_active, notes)
values
  ('frate-01','vendor-01','quarry-01','proj-01','PER_M3',35000,false,null,0,0,0,'2026-01-01',true,null),
  ('frate-02','vendor-02','quarry-02','proj-02','PER_TRIP',900000,false,null,50000,0,0,'2026-01-01',true,null),
  ('frate-03','vendor-04','quarry-01','proj-01','ALL_IN',118000,true,'PER_M3_RECEIVED',0,0,0,'2026-01-01',true,null),
  ('frate-04','vendor-05','quarry-03','proj-04','ALL_IN',345000,true,'PER_M3_RECEIVED',0,0,0,'2026-01-01',true,
   'HPP all-in Ivan ke KBS Sunter (sumber Bojonegara): 345.000/m³ (IMCI bayar 365.000/m³).'),
  ('frate-05','vendor-05','quarry-03','proj-05','ALL_IN',315000,true,'PER_M3_RECEIVED',0,0,0,'2026-01-01',true,
   'HPP all-in Ivan ke KBS Legok (sumber Bojonegara): 315.000/m³ (IMCI bayar 335.000/m³).'),
  ('frate-06','vendor-06','quarry-01','proj-06','PER_M3',60000,false,null,25000,0,0,'2026-01-01',true,
   'Ongkos kirim Yudhi (material ikut harga quarry).'),
  ('frate-07','vendor-06','quarry-02','proj-07','PER_M3',55000,false,null,20000,0,0,'2026-01-01',true,
   'Ongkos kirim Yudhi (material ikut harga quarry).'),
  ('frate-08','vendor-06','quarry-01','proj-08','PER_M3',65000,false,null,25000,0,0,'2026-01-01',true,
   'Ongkos kirim Yudhi (material ikut harga quarry).'),
  ('frate-09','vendor-05','quarry-02','proj-04','ALL_IN',345000,true,'PER_M3_RECEIVED',0,0,0,'2026-01-01',true,
   'HPP all-in Ivan ke KBS Sunter via Quarry Sudamanik (alternatif): 345.000/m³.'),
  ('frate-10','vendor-03','quarry-03','proj-03','PER_TON',28000,false,null,15000,0,0,'2026-01-01',true,null),
  ('frate-11','vendor-05','quarry-03','proj-06','ALL_IN',355000,true,'PER_M3_RECEIVED',0,0,0,'2026-01-01',true,
   'HPP all-in Ivan ke KBS Pluit (sumber Bojonegara): 355.000/m³ (IMCI bayar 355.000/m³).'),
  ('frate-12','vendor-05','quarry-03','proj-07','ALL_IN',315000,true,'PER_M3_RECEIVED',0,0,0,'2026-01-01',true,
   'HPP all-in Ivan ke KBS Dadap (sumber Bojonegara): 315.000/m³ (IMCI bayar 315.000/m³).'),
  ('frate-13','vendor-05','quarry-03','proj-08','ALL_IN',345000,true,'PER_M3_RECEIVED',0,0,0,'2026-01-01',true,
   'HPP all-in Ivan ke KBS Bogor (sumber Bojonegara): 345.000/m³ (IMCI bayar 345.000/m³).')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- PROFILES (seed awal — ganti auth.users id setelah user dibuat)
-- Catatan: row ini memerlukan auth.users yang sudah dibuat di Supabase
-- (email + password via dashboard/CLI), lalu id diisi dengan user id Supabase.
-- ============================================================
-- Contoh (blokir sampai user dibuat):
-- insert into public.profiles (id, full_name, role, email, department)
-- values
--   ('<auth_uid>','Raden Ghifari Sausan','SUPER_ADMIN','ghifarisausans@gmail.com','Executive Office');
-- ============================================================