import { supabase } from './supabase';
import {
  Contract,
  Customer,
  Driver,
  FreightRate,
  Product,
  Project,
  Quarry,
  TransportVendor,
  Vehicle,
} from '../types';

/**
 * Service layer master data ↔ Supabase (Fase 0.6).
 * Seluruh master di-fetch dari DB (single source of truth) saat pengguna
 * terautentikasi; perubahan master dari UI juga di-write-through ke DB.
 */

export interface QuarryMaterialCost {
  quarryId: string;
  productId: string;
  costPerM3: number;
  density: number | null;
  effectiveDate?: string;
}

export interface ProjectOtherCost {
  projectId: string;
  costPerRit: number;
  effectiveDate?: string;
  notes?: string;
}

export interface MasterDataBundle {
  products: Product[];
  quarries: Quarry[];
  customers: Customer[];
  projects: Project[];
  contracts: Contract[];
  transportVendors: TransportVendor[];
  vehicles: Vehicle[];
  drivers: Driver[];
  freightRates: FreightRate[];
  quarryMaterialCosts: QuarryMaterialCost[];
  projectOtherCosts: ProjectOtherCost[];
}

export interface MasterSyncResult {
  entity: string;
  table: string;
  ok: boolean;
  error?: string;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));

const mapProduct = (r: any): Product => ({
  id: r.id,
  code: r.code ?? '',
  name: r.name,
  category: r.category ?? '',
  primaryUnit: (r.primary_unit as Product['primaryUnit']) ?? 'm3',
  density: num(r.density),
  qualitySpec: r.quality_spec ?? '',
  abrasionSpec: r.abrasion_spec ?? undefined,
  defaultMaterialCost: num(r.default_material_cost),
  defaultSellingPrice: num(r.default_selling_price),
  isActive: r.is_active ?? true,
});

const mapQuarry = (r: any): Quarry => ({
  id: r.id,
  code: r.code ?? '',
  name: r.name,
  locationName: r.location_name ?? '',
  address: r.address ?? '',
  gpsLat: r.gps_lat ?? undefined,
  gpsLng: r.gps_lng ?? undefined,
  abrasionRating: r.abrasion_rating ?? undefined,
  hasWeighbridge: r.has_weighbridge ?? true,
  isActive: r.is_active ?? true,
  suppliedProductIds: Array.isArray(r.supplied_product_ids) ? r.supplied_product_ids : [],
});

const mapCustomer = (r: any): Customer => ({
  id: r.id,
  code: r.code ?? '',
  name: r.name,
  npwp: r.npwp ?? undefined,
  billingAddress: r.billing_address ?? r.address ?? '',
  address: r.address ?? undefined,
  contactPerson: r.contact_person ?? '',
  phone: r.phone ?? '',
  email: r.email ?? '',
  paymentTermsDays: num(r.payment_terms_days),
  isActive: r.is_active ?? true,
  invoiceTemplateId: r.invoice_template_id ?? undefined,
  taxRatePercent: r.tax_rate_percent != null ? num(r.tax_rate_percent) : undefined,
});

const mapProject = (r: any): Project => ({
  id: r.id,
  customerId: r.customer_id,
  projectNumber: r.project_number ?? '',
  name: r.name,
  location: r.location ?? '',
  gpsLat: r.gps_lat ?? undefined,
  gpsLng: r.gps_lng ?? undefined,
  startDate: r.start_date ?? '',
  endDate: r.end_date ?? undefined,
  status: (r.status as Project['status']) ?? 'ACTIVE',
});

const mapContract = (r: any): Contract => ({
  id: r.id,
  contractNumber: r.contract_number,
  customerId: r.customer_id,
  projectId: r.project_id,
  productId: r.product_id,
  quarryId: r.quarry_id ?? undefined,
  contractType: (r.contract_type as Contract['contractType']) ?? 'NON_PO',
  contractedVolumeM3: num(r.contracted_volume_m3),
  unitPricePerM3: num(r.unit_price_per_m3),
  unitPriceInternalM3: r.unit_price_internal_m3 != null ? num(r.unit_price_internal_m3) : undefined,
  materialCostPerM3: r.material_cost_per_m3 != null ? num(r.material_cost_per_m3) : undefined,
  pricingVariant: r.pricing_variant ?? undefined,
  tolerancePercent: num(r.tolerance_percent),
  overDeliveryPolicy: (r.over_delivery_policy as Contract['overDeliveryPolicy']) ?? 'WARNING',
  startDate: r.start_date ?? '',
  endDate: r.end_date ?? '',
  status: (r.status as Contract['status']) ?? 'ACTIVE',
  notes: r.notes ?? undefined,
  templateId: r.template_id ?? undefined,
  taxRatePercent: r.tax_rate_percent != null ? num(r.tax_rate_percent) : undefined,
});

const mapVendor = (r: any): TransportVendor => ({
  id: r.id,
  code: r.code ?? undefined,
  name: r.name,
  contactPerson: r.contact_person ?? '',
  phone: r.phone ?? '',
  defaultPricingModel: (r.default_pricing_model as TransportVendor['defaultPricingModel']) ?? 'PER_M3',
  supplyType: (r.supply_type as TransportVendor['supplyType']) ?? 'TRANSPORT_ONLY',
  paymentTermsDays: r.payment_terms_days ?? undefined,
  isActive: r.is_active ?? true,
  notes: r.notes ?? undefined,
});

const mapVehicle = (r: any): Vehicle => ({
  id: r.id,
  transportVendorId: r.transport_vendor_id,
  plateNumber: r.plate_number,
  vehicleType: r.vehicle_type ?? '',
  nominalCapacityM3: num(r.nominal_capacity_m3),
  maxCapacityTons: r.max_capacity_tons ?? undefined,
  isActive: r.is_active ?? true,
});

const mapDriver = (r: any): Driver => ({
  id: r.id,
  transportVendorId: r.transport_vendor_id,
  fullName: r.full_name,
  phone: r.phone ?? '',
  simNumber: r.sim_number ?? undefined,
  isActive: r.is_active ?? true,
});

const mapFreightRate = (r: any): FreightRate => ({
  id: r.id,
  transportVendorId: r.transport_vendor_id,
  quarryId: r.quarry_id,
  projectId: r.project_id,
  pricingModel: (r.pricing_model as FreightRate['pricingModel']) ?? 'PER_M3',
  ratePerUnit: num(r.rate_per_unit),
  isAllInclusiveMaterial: r.is_all_inclusive_material ?? false,
  allInVolumeBasis: r.all_in_volume_basis ?? undefined,
  tollFee: num(r.toll_fee),
  loadingFee: num(r.loading_fee),
  unloadingFee: num(r.unloading_fee),
  effectiveDate: r.effective_date ?? undefined,
  isActive: r.is_active ?? true,
  distanceKm: r.distance_km ?? undefined,
  minimumChargeIdr: r.minimum_charge_idr ?? undefined,
  notes: r.notes ?? undefined,
});

/**
 * Ambil seluruh master data dari Supabase.
 */
export async function fetchMasterFromSupabase(): Promise<MasterDataBundle> {
  const [prod, quar, cust, proj, contr, vend, veh, drv, rate, src, qmc, poc] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('quarries').select('*'),
    supabase.from('customers').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('contracts').select('*'),
    supabase.from('transport_vendors').select('*'),
    supabase.from('vehicles').select('*'),
    supabase.from('drivers').select('*'),
    supabase.from('freight_rates').select('*'),
    supabase.from('contract_source_quarries').select('*'),
    supabase.from('quarry_material_costs').select('quarry_id, product_id, cost_per_m3, density, effective_date'),
    supabase.from('project_other_costs').select('project_id, cost_per_rit, effective_date, notes'),
  ]);

  if (prod.error) throw prod.error;

  const sourceByContract = new Map<string, string[]>();
  (src.data ?? []).forEach((r) => {
    const list = sourceByContract.get(r.contract_id) ?? [];
    list.push(r.quarry_id);
    sourceByContract.set(r.contract_id, list);
  });

  const contracts = (contr.data ?? []).map((r) => {
    const c = mapContract(r);
    const sources = sourceByContract.get(c.id);
    if (sources) c.sourceQuarryIds = sources;
    return c;
  });

  return {
    products: (prod.data ?? []).map(mapProduct),
    quarries: (quar.data ?? []).map(mapQuarry),
    customers: (cust.data ?? []).map(mapCustomer),
    projects: (proj.data ?? []).map(mapProject),
    contracts,
    transportVendors: (vend.data ?? []).map(mapVendor),
    vehicles: (veh.data ?? []).map(mapVehicle),
    drivers: (drv.data ?? []).map(mapDriver),
    freightRates: (rate.data ?? []).map(mapFreightRate),
    quarryMaterialCosts: (qmc.data ?? []).map((r: any) => ({
      quarryId: r.quarry_id,
      productId: r.product_id,
      costPerM3: num(r.cost_per_m3),
      density: r.density != null ? num(r.density) : null,
      effectiveDate: r.effective_date ?? undefined,
    })),
    projectOtherCosts: (poc.data ?? []).map((r: any) => ({
      projectId: r.project_id,
      costPerRit: num(r.cost_per_rit),
      effectiveDate: r.effective_date ?? undefined,
      notes: r.notes ?? undefined,
    })),
  };
}

const genericUpsert = async (table: string, rows: object[], onConflict?: string): Promise<MasterSyncResult> => {
  if (rows.length === 0) return { entity: table, table, ok: true };
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: onConflict ?? 'id' });
  return { entity: table, table, ok: !error, error: error?.message };
};

/**
 * Simpan seluruh master bundle ke Supabase (upsert per tabel).
 */
/**
 * Hapus satu entitas master dari Supabase (mis. untuk koreksi/penghapusan master).
 */
export async function deleteMasterEntityFromSupabase(
  table: string,
  id: string
): Promise<MasterSyncResult> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  return { entity: id, table, ok: !error, error: error?.message };
}

export async function upsertMasterToSupabase(bundle: MasterDataBundle): Promise<MasterSyncResult[]> {
  const results: MasterSyncResult[] = [];

  results.push(await genericUpsert(
    'products',
    bundle.products.map((p) => ({
      id: p.id,
      code: p.code ?? null,
      name: p.name,
      category: p.category ?? null,
      primary_unit: p.primaryUnit ?? 'm3',
      density: p.density,
      quality_spec: p.qualitySpec ?? null,
      abrasion_spec: p.abrasionSpec ?? null,
      default_material_cost: p.defaultMaterialCost ?? 0,
      default_selling_price: p.defaultSellingPrice ?? 0,
      is_active: p.isActive ?? true,
    }))
  ));

  results.push(await genericUpsert(
    'quarries',
    bundle.quarries.map((q) => ({
      id: q.id,
      code: q.code ?? null,
      name: q.name,
      location_name: q.locationName ?? null,
      address: q.address ?? null,
      gps_lat: q.gpsLat ?? null,
      gps_lng: q.gpsLng ?? null,
      has_weighbridge: q.hasWeighbridge ?? true,
      abrasion_rating: q.abrasionRating ?? null,
      is_active: q.isActive ?? true,
      supplied_product_ids: q.suppliedProductIds ?? [],
    }))
  ));

  results.push(await genericUpsert(
    'customers',
    bundle.customers.map((c) => ({
      id: c.id,
      code: c.code ?? null,
      name: c.name,
      npwp: c.npwp ?? null,
      billing_address: c.billingAddress ?? null,
      contact_person: c.contactPerson ?? null,
      phone: c.phone ?? null,
      email: c.email ?? null,
      payment_terms_days: c.paymentTermsDays ?? 30,
      is_active: c.isActive ?? true,
      invoice_template_id: (c as any).invoiceTemplateId ?? null,
      tax_rate_percent: (c as any).taxRatePercent ?? null,
    }))
  ));

  results.push(await genericUpsert(
    'projects',
    bundle.projects.map((p) => ({
      id: p.id,
      customer_id: p.customerId,
      project_number: p.projectNumber ?? p.name,
      name: p.name,
      location: p.location ?? null,
      gps_lat: p.gpsLat ?? null,
      gps_lng: p.gpsLng ?? null,
      start_date: p.startDate ?? null,
      end_date: p.endDate ?? null,
      status: p.status ?? 'ACTIVE',
    }))
  ));

  results.push(await genericUpsert(
    'contracts',
    bundle.contracts.map((c) => ({
      id: c.id,
      contract_number: c.contractNumber,
      customer_id: c.customerId,
      project_id: c.projectId,
      product_id: c.productId,
      quarry_id: c.quarryId ?? null,
      contract_type: c.contractType ?? 'NON_PO',
      contracted_volume_m3: c.contractedVolumeM3 ?? 0,
      unit_price_per_m3: c.unitPricePerM3 ?? 0,
      unit_price_internal_m3: (c as any).unitPriceInternalM3 ?? null,
      material_cost_per_m3: (c as any).materialCostPerM3 ?? null,
      pricing_variant: (c as any).pricingVariant ?? 'EXTERNAL',
      tolerance_percent: c.tolerancePercent ?? 2.0,
      over_delivery_policy: c.overDeliveryPolicy ?? 'WARNING',
      start_date: c.startDate ?? null,
      end_date: c.endDate ?? null,
      status: c.status ?? 'ACTIVE',
      notes: c.notes ?? null,
      template_id: (c as any).templateId ?? null,
      tax_rate_percent: (c as any).taxRatePercent ?? 11.0,
    }))
  ));

  const sourceRows = bundle.contracts.flatMap((c) =>
    (c.sourceQuarryIds ?? []).map((qid) => ({ contract_id: c.id, quarry_id: qid }))
  );
  results.push(await genericUpsert('contract_source_quarries', sourceRows, 'contract_id,quarry_id'));

  results.push(await genericUpsert(
    'transport_vendors',
    bundle.transportVendors.map((v) => ({
      id: v.id,
      code: v.code ?? null,
      name: v.name,
      contact_person: v.contactPerson ?? null,
      phone: v.phone ?? null,
      default_pricing_model: v.defaultPricingModel ?? 'PER_M3',
      supply_type: v.supplyType ?? 'TRANSPORT_ONLY',
      payment_terms_days: v.paymentTermsDays ?? null,
      is_active: v.isActive ?? true,
      notes: v.notes ?? null,
    }))
  ));

  results.push(await genericUpsert(
    'vehicles',
    bundle.vehicles.map((v) => ({
      id: v.id,
      transport_vendor_id: v.transportVendorId,
      plate_number: v.plateNumber,
      vehicle_type: v.vehicleType ?? null,
      nominal_capacity_m3: v.nominalCapacityM3 ?? 0,
      max_capacity_tons: v.maxCapacityTons ?? null,
      is_active: v.isActive ?? true,
    }))
  ));

  results.push(await genericUpsert(
    'drivers',
    bundle.drivers.map((d) => ({
      id: d.id,
      transport_vendor_id: d.transportVendorId,
      full_name: d.fullName,
      phone: d.phone ?? null,
      sim_number: d.simNumber ?? null,
      is_active: d.isActive ?? true,
    }))
  ));

  results.push(await genericUpsert(
    'freight_rates',
    bundle.freightRates.map((f) => ({
      id: f.id,
      transport_vendor_id: f.transportVendorId,
      quarry_id: f.quarryId,
      project_id: f.projectId,
      pricing_model: f.pricingModel ?? 'PER_M3',
      rate_per_unit: f.ratePerUnit,
      is_all_inclusive_material: f.isAllInclusiveMaterial ?? false,
      all_in_volume_basis: f.allInVolumeBasis ?? null,
      toll_fee: f.tollFee ?? 0,
      loading_fee: f.loadingFee ?? 0,
      unloading_fee: f.unloadingFee ?? 0,
      effective_date: f.effectiveDate ?? null,
      is_active: f.isActive ?? true,
      distance_km: f.distanceKm ?? null,
      minimum_charge_idr: f.minimumChargeIdr ?? null,
      notes: f.notes ?? null,
    }))
  ));

  // Quarry material costs — HPP material per quarry×product (override) dengan effective_date (history, tidak overwrite harga lama)
  if (bundle.quarryMaterialCosts && bundle.quarryMaterialCosts.length > 0) {
    results.push(await genericUpsert(
      'quarry_material_costs',
      bundle.quarryMaterialCosts.map((q) => ({
        quarry_id: q.quarryId,
        product_id: q.productId,
        cost_per_m3: q.costPerM3,
        density: (q as any).density ?? null,
        effective_date: (q as any).effectiveDate ?? new Date().toISOString().slice(0, 10),
        is_active: true,
      })),
      'quarry_id,product_id,effective_date'
    ));
  }

  // Project other costs — biaya operasional per-rit per proyek dengan history
  if ((bundle as any).projectOtherCosts && (bundle as any).projectOtherCosts.length > 0) {
    results.push(await genericUpsert(
      'project_other_costs',
      (bundle as any).projectOtherCosts.map((p: any) => ({
        project_id: p.projectId,
        cost_per_rit: p.costPerRit,
        effective_date: p.effectiveDate ?? new Date().toISOString().slice(0, 10),
        notes: (p as any).notes ?? null,
      })),
      'project_id,effective_date'
    ));
  }

  return results;
}