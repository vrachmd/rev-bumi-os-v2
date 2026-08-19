-- ============================================================
-- REV BUMI OS — Skema Database (Fase 0)
-- PostgreSQL standar, portabel ke GCP Cloud SQL / Alibaba RDS.
-- Konvensi: PK text mengikuti id seed lokal ('prod-01', 'cust-01', dll)
-- agar import data localStorage lama tetap mempertahankan referensi.
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS (tipe terbatas, terstandarisasi lintas aplikasi)
-- ------------------------------------------------------------
create type user_role as enum (
  'SUPER_ADMIN','MANAGEMENT','OPERATIONS','COMMERCIAL','FINANCE',
  'DISPATCHER','QUARRY_CHECKER','SITE_CHECKER'
);

create type delivery_status as enum (
  'PLANNED','SCHEDULED','LOADING','IN_TRANSIT','ARRIVED','UNLOADED',
  'POD_SUBMITTED','POD_VERIFIED','DELIVERED','REJECTED','CANCELLED'
);

create type variance_status as enum (
  'WITHIN_TOLERANCE','ABOVE_TOLERANCE','REQUIRES_REVIEW',
  'APPROVED_ADJUSTMENT','RESOLVED'
);

create type variance_reason as enum (
  'PHYSICAL_LOSS','MEASUREMENT_VARIANCE','MOISTURE_VARIANCE','DENSITY_VARIANCE',
  'LOADING_VARIANCE','RECEIVING_VARIANCE','COMMERCIAL_ADJUSTMENT','DATA_ERROR',
  'UNDER_INVESTIGATION','OTHER'
);

create type freight_pricing_model as enum (
  'PER_TRIP','PER_TON','PER_M3','ROUTE_BASED','HYBRID','ALL_IN'
);

create type vendor_supply_type as enum ('TRANSPORT_ONLY','MATERIAL_AND_TRANSPORT');

create type over_delivery_policy as enum ('ALLOWED','WARNING','REQUIRES_APPROVAL','BLOCKED');

create type invoice_status as enum ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED');

create type measurement_mode as enum ('ACTUAL_MEASURED','CALCULATED_FROM_WEIGHT','ESTIMATED');

create type weighing_method as enum ('WEIGHBRIDGE','TRUCK_BED_VOLUME','MANUAL');

create type unloading_method as enum ('TRUCK_BED_VOLUME','DIPSTICK_ROD','SITE_SCALE','VISUAL_SURVEY');

create type audit_action as enum (
  'CREATE','UPDATE','DELETE','STATUS_CHANGE','RECONCILE','CORRECTION'
);

create type correction_status as enum ('PENDING','APPROVED','REJECTED');
create type correction_target as enum ('DELIVERY','INVOICE','RECONCILIATION');
create type project_status as enum ('ACTIVE','COMPLETED','ON_HOLD');
create type contract_status as enum ('ACTIVE','COMPLETED','EXPIRED','SUSPENDED');
create type contract_type as enum ('PO_BASED','NON_PO');

-- ------------------------------------------------------------
-- MASTER: PROFILES (menautkan auth.users ke profil role)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'QUARRY_CHECKER',
  email text not null unique,
  phone text,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MASTER: COMPANY
-- ------------------------------------------------------------
create table public.companies (
  id text primary key,
  name text not null,
  brand text,
  code text,
  address text,
  phone text,
  email text,
  primary_color text default '#003C16',
  npwp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MASTER: PRODUCT (Material Agregat)
-- ------------------------------------------------------------
create table public.products (
  id text primary key,
  code text not null unique,
  name text not null,
  category text,
  primary_unit text not null default 'm3',
  density numeric(8,3) not null,           -- ton/m3
  quality_spec text,
  abrasion_spec text,
  default_material_cost numeric(14,2) not null default 0,
  default_selling_price numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MASTER: PRODUCT PRICE (histori harga efektif)
-- ------------------------------------------------------------
create table public.product_prices (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  effective_date date not null,
  selling_price_per_m3 numeric(14,2) not null default 0,
  material_cost_per_m3 numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MASTER: QUARRY
-- ------------------------------------------------------------
create table public.quarries (
  id text primary key,
  code text not null unique,
  name text not null,
  location_name text,
  address text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  has_weighbridge boolean not null default true,
  abrasion_rating text,
  is_active boolean not null default true,
  supplied_product_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Biaya material per quarry (override harga default product)
create table public.quarry_material_costs (
  id text primary key,
  quarry_id text not null references public.quarries(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  cost_per_m3 numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (quarry_id, product_id)
);

-- ------------------------------------------------------------
-- MASTER: CUSTOMER & PROJECT
-- ------------------------------------------------------------
create table public.customers (
  id text primary key,
  code text not null unique,
  name text not null,
  npwp text,
  billing_address text,
  address text,
  contact_person text,
  phone text,
  email text,
  payment_terms_days integer not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  project_number text not null,
  name text not null,
  location text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  start_date date,
  end_date date,
  status project_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MASTER: CONTRACT
-- ------------------------------------------------------------
create table public.contracts (
  id text primary key,
  contract_number text not null unique,
  customer_id text not null references public.customers(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  product_id text not null references public.products(id),
  quarry_id text references public.quarries(id),              -- sumber utama/default
  contract_type contract_type not null default 'NON_PO',
  contracted_volume_m3 numeric(12,3) not null default 0,
  unit_price_per_m3 numeric(14,2) not null,
  tolerance_percent numeric(6,3) not null default 2.0,
  over_delivery_policy over_delivery_policy not null default 'WARNING',
  invoicing_basis text not null default 'MIN_OF_BOTH',
  start_date date not null,
  end_date date not null,
  status contract_status not null default 'ACTIVE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sumber quarry tambahan (multi-source)
create table public.contract_source_quarries (
  contract_id text not null references public.contracts(id) on delete cascade,
  quarry_id text not null references public.quarries(id) on delete cascade,
  primary key (contract_id, quarry_id)
);

-- ------------------------------------------------------------
-- MASTER: TRANSPORT VENDOR, VEHICLE, DRIVER
-- ------------------------------------------------------------
create table public.transport_vendors (
  id text primary key,
  code text,
  name text not null,
  contact_person text,
  phone text,
  default_pricing_model freight_pricing_model not null default 'PER_M3',
  supply_type vendor_supply_type not null default 'TRANSPORT_ONLY',
  payment_terms_days integer,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id text primary key,
  transport_vendor_id text not null references public.transport_vendors(id) on delete cascade,
  plate_number text not null,
  vehicle_type text,
  nominal_capacity_m3 numeric(8,2) not null default 0,
  max_capacity_tons numeric(10,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drivers (
  id text primary key,
  transport_vendor_id text not null references public.transport_vendors(id) on delete cascade,
  full_name text not null,
  phone text,
  sim_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MASTER: FREIGHT RATE (ongkos angkut per vendor/quarry/proyek)
-- ------------------------------------------------------------
create table public.freight_rates (
  id text primary key,
  transport_vendor_id text not null references public.transport_vendors(id) on delete cascade,
  quarry_id text not null references public.quarries(id),
  project_id text not null references public.projects(id),
  pricing_model freight_pricing_model not null,
  rate_per_unit numeric(14,2) not null default 0,
  is_all_inclusive_material boolean not null default false,
  all_in_volume_basis text,
  toll_fee numeric(14,2) not null default 0,
  loading_fee numeric(14,2) not null default 0,
  unloading_fee numeric(14,2) not null default 0,
  effective_date date not null default current_date,
  is_active boolean not null default true,
  distance_km numeric(8,2),
  minimum_charge_idr numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- OPERASIONAL: DELIVERY (Surat Jalan & Ritase)
-- ------------------------------------------------------------
create table public.deliveries (
  id text primary key,
  delivery_number text not null unique,
  contract_id text not null references public.contracts(id),
  product_id text not null references public.products(id),
  quarry_id text not null references public.quarries(id),
  transport_vendor_id text not null references public.transport_vendors(id),
  vehicle_id text references public.vehicles(id),
  driver_id text references public.drivers(id),
  driver_name text,
  driver_phone text,
  status delivery_status not null default 'SCHEDULED',

  -- Quantity utama (m3)
  loaded_volume_m3 numeric(12,3) not null default 0,
  received_volume_m3 numeric(12,3) not null default 0,
  approved_volume_m3 numeric(12,3) not null default 0,
  loaded_weight_kg numeric(14,2) not null default 0,
  received_weight_kg numeric(14,2) not null default 0,
  approved_weight_kg numeric(14,2) not null default 0,

  density_applied numeric(8,3),
  measurement_mode measurement_mode not null default 'ACTUAL_MEASURED',

  scheduled_date date not null default current_date,
  departure_date timestamptz,
  notes text,
  loaded_at timestamptz,
  arrived_at timestamptz,
  unloaded_at timestamptz,
  delivered_at timestamptz,

  -- Info nested (JSONB fleksibel, portabel)
  quarry_loading_info jsonb,
  site_unloading_info jsonb,

  -- Timestamps + audit konteks
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

-- ------------------------------------------------------------
-- OPERASIONAL: WEIGHBRIDGE, POD, REKONSILIASI, COST RECORD
-- ------------------------------------------------------------
create table public.weighbridge_records (
  id text primary key,
  delivery_id text not null references public.deliveries(id) on delete cascade,
  gross_weight_kg numeric(14,2) not null,
  tare_weight_kg numeric(14,2) not null,
  net_weight_kg numeric(14,2) not null,
  scale_slip_photo_url text,
  weighed_at timestamptz not null default now()
);

create table public.delivery_pods (
  id text primary key,
  delivery_id text not null unique references public.deliveries(id) on delete cascade,
  recipient_name text not null,
  recipient_role text,
  gps_latitude numeric(10,7),
  gps_longitude numeric(10,7),
  gps_accuracy_meters numeric(8,2),
  signature_dispatcher_url text,
  signature_driver_url text,
  signature_recipient_url text,
  delivery_slip_photo_url text,
  material_photo_url text,
  notes text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id)
);

create table public.quantity_reconciliations (
  id text primary key,
  delivery_id text not null unique references public.deliveries(id) on delete cascade,
  loaded_volume_m3 numeric(12,3) not null,
  received_volume_m3 numeric(12,3) not null,
  physical_variance_m3 numeric(12,3) not null,
  variance_percentage numeric(8,3) not null,
  tolerance_percent_applied numeric(6,3) not null default 2.0,
  variance_status variance_status not null,
  variance_reason variance_reason not null default 'UNDER_INVESTIGATION',
  commercial_adjustment_m3 numeric(12,3) not null default 0,
  final_approved_volume_m3 numeric(12,3) not null,
  potential_variance_value_idr numeric(16,2) not null default 0,
  review_notes text,
  reconciled_by uuid references auth.users(id),
  reconciled_at timestamptz not null default now()
);

create table public.cost_records (
  id text primary key,
  delivery_id text not null unique references public.deliveries(id) on delete cascade,
  billable_quantity_m3 numeric(12,3) not null,
  selling_price_per_m3 numeric(14,2) not null,
  recognized_revenue_idr numeric(16,2) not null,
  material_cost_per_m3 numeric(14,2) not null,
  total_material_cost_idr numeric(16,2) not null,
  freight_rate_per_unit numeric(14,2) not null,
  freight_pricing_model freight_pricing_model not null,
  pricing_basis text,
  all_in_price_per_m3 numeric(14,2),
  all_in_volume_basis text,
  total_freight_cost_idr numeric(16,2) not null default 0,
  other_operational_cost_idr numeric(16,2) not null default 0,
  total_hpp_idr numeric(16,2) not null,
  gross_profit_idr numeric(16,2) not null,
  gross_margin_percent numeric(8,2) not null,
  is_actual_finalized boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- KEUANGAN: INVOICE, INVOICE ITEM, PAYMENT
-- ------------------------------------------------------------
create table public.invoices (
  id text primary key,
  invoice_number text not null unique,
  customer_id text not null references public.customers(id),
  project_id text not null references public.projects(id),
  contract_id text not null references public.contracts(id),
  invoice_date date not null default current_date,
  due_date date,
  total_approved_volume_m3 numeric(12,3) not null default 0,
  subtotal_idr numeric(16,2) not null default 0,
  tax_rate_percent numeric(6,3) not null default 11.0,
  tax_amount_idr numeric(16,2) not null default 0,
  total_invoice_idr numeric(16,2) not null default 0,
  total_paid_idr numeric(16,2) not null default 0,
  outstanding_balance_idr numeric(16,2) not null default 0,
  status invoice_status not null default 'DRAFT',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id text primary key,
  invoice_id text not null references public.invoices(id) on delete cascade,
  delivery_id text not null references public.deliveries(id),
  delivery_number text not null,
  product_name text not null,
  approved_volume_m3 numeric(12,3) not null,
  unit_price_per_m3 numeric(14,2) not null,
  item_total_idr numeric(16,2) not null
);

create table public.payments (
  id text primary key,
  invoice_id text not null references public.invoices(id) on delete cascade,
  invoice_number text not null,
  customer_name text not null,
  payment_date date not null default current_date,
  amount_paid_idr numeric(16,2) not null,
  bank_reference text,
  payment_method text,
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- AUDIT & KOREKSI (immutable)
-- ------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  record_identifier text,
  action audit_action not null,
  changed_by uuid references auth.users(id),
  user_role user_role,
  old_values jsonb,
  new_values jsonb,
  reason text,
  timestamp timestamptz not null default now(),
  ip_address text,
  user_agent text
);

create table public.correction_requests (
  id text primary key,
  target_type correction_target not null,
  target_id text not null,
  target_number text,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  reason text not null,
  proposed_changes jsonb not null,
  status correction_status not null default 'PENDING',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text
);

-- ------------------------------------------------------------
-- INDEX UNTUK QUERY OPERASIONAL
-- ------------------------------------------------------------
create index idx_deliveries_status on public.deliveries(status);
create index idx_deliveries_contract on public.deliveries(contract_id);
create index idx_deliveries_scheduled on public.deliveries(scheduled_date);
create index idx_deliveries_quarry on public.deliveries(quarry_id);
create index idx_invoices_customer on public.invoices(customer_id);
create index idx_freight_vendor_quarry on public.freight_rates(transport_vendor_id, quarry_id);
create index idx_audit_timestamp on public.audit_logs(timestamp desc);
create index idx_audit_record on public.audit_logs(table_name, record_id);
create index idx_projects_customer on public.projects(customer_id);
create index idx_contracts_project on public.contracts(project_id);
create index idx_contracts_customer on public.contracts(customer_id);