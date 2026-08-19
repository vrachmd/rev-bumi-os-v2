import { supabase } from './supabase';

/**
 * Tool import data localStorage lama → Supabase (Fase 0, sekali pakai).
 * Membaca key `rev_*` (dipakai AppContext) dan me-insert/upsert ke tabel
 * Supabase yang sesuai. Menjaga id agar referensi antar-tabel tetap utuh.
 *
 * Catatan: fungsi ini memerlukan Supabase terkonfigurasi dan role dengan
 * izin tulis (SUPER_ADMIN). Untuk demo (tanpa Supabase) tidak dipanggil.
 */

export interface ImportSummary {
  table: string;
  inserted: number;
  failed: number;
}

const safeParse = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const upsert = async (
  table: string,
  rows: Record<string, unknown>[],
  onConflict?: string
): Promise<{ inserted: number; failed: number }> => {
  if (rows.length === 0) return { inserted: 0, failed: 0 };
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: onConflict ?? 'id' });
  if (error) return { inserted: 0, failed: rows.length };
  return { inserted: rows.length, failed: 0 };
};

interface ProductRow {
  id: string;
  code?: string;
  name: string;
  category?: string;
  primaryUnit?: string;
  density: number;
  qualitySpec?: string;
  abrasionSpec?: string;
  defaultMaterialCost?: number;
  defaultSellingPrice?: number;
  isActive?: boolean;
}

interface QuarryRow {
  id: string;
  code?: string;
  name: string;
  locationName?: string;
  address?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  hasWeighbridge?: boolean;
  abrasionRating?: string;
  isActive?: boolean;
  suppliedProductIds?: string[];
  materialCostOverrides?: { productId: string; costPerM3: number }[];
}

interface ProjectRow {
  id: string;
  customerId: string;
  projectNumber?: string;
  name: string;
  location?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface ContractRow {
  id: string;
  contractNumber: string;
  customerId: string;
  projectId: string;
  productId: string;
  quarryId?: string | null;
  sourceQuarryIds?: string[];
  contractType?: string;
  contractedVolumeM3: number;
  unitPricePerM3: number;
  tolerancePercent?: number;
  overDeliveryPolicy?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  notes?: string;
}

interface DeliveryRow {
  id: string;
  deliveryNumber: string;
  contractId: string;
  productId: string;
  quarryId: string;
  transportVendorId: string;
  vehicleId?: string | null;
  driverId?: string | null;
  driverName?: string;
  driverPhone?: string;
  status?: string;
  loadedVolumeM3?: number;
  receivedVolumeM3?: number;
  approvedVolumeM3?: number;
  loadedWeightKg?: number;
  receivedWeightKg?: number;
  approvedWeightKg?: number;
  densityApplied?: number | null;
  measurementMode?: string;
  scheduledDate?: string;
  departureDate?: string | null;
  notes?: string;
  loadedAt?: string | null;
  arrivedAt?: string | null;
  unloadedAt?: string | null;
  deliveredAt?: string | null;
  quarryLoadingInfo?: Record<string, unknown> | null;
  siteUnloadingInfo?: Record<string, unknown> | null;
  weighbridge?: {
    id: string;
    grossWeightKg: number;
    tareWeightKg: number;
    netWeightKg: number;
    scaleSlipPhotoUrl?: string;
    weighedAt?: string;
  } | null;
  pod?: {
    id: string;
    recipientName: string;
    recipientRole?: string;
    gpsLatitude?: number | null;
    gpsLongitude?: number | null;
    gpsAccuracyMeters?: number | null;
    signatureDispatcherUrl?: string;
    signatureDriverUrl?: string;
    signatureRecipientUrl?: string;
    deliverySlipPhotoUrl?: string;
    materialPhotoUrl?: string;
    notes?: string;
    submittedAt?: string;
  } | null;
  reconciliation?: {
    id: string;
    loadedVolumeM3: number;
    receivedVolumeM3: number;
    physicalVarianceM3: number;
    variancePercentage: number;
    tolerancePercentApplied?: number;
    varianceStatus?: string;
    varianceReason?: string;
    commercialAdjustmentM3?: number;
    finalApprovedVolumeM3: number;
    potentialVarianceValueIdr?: number;
    reviewNotes?: string;
    reconciledAt?: string;
  } | null;
  costRecord?: {
    id: string;
    billableQuantityM3: number;
    sellingPricePerM3: number;
    recognizedRevenueIdr: number;
    materialCostPerM3: number;
    totalMaterialCostIdr: number;
    freightRatePerUnit: number;
    freightPricingModel?: string;
    pricingBasis?: string;
    allInPricePerM3?: number | null;
    allInVolumeBasis?: string | null;
    totalFreightCostIdr?: number;
    otherOperationalCostIdr?: number;
    totalHppIdr: number;
    grossProfitIdr: number;
    grossMarginPercent?: number;
    isActualFinalized?: boolean;
  } | null;
}

interface FreightRateRow {
  id: string;
  transportVendorId: string;
  quarryId: string;
  projectId: string;
  pricingModel?: string;
  ratePerUnit: number;
  isAllInclusiveMaterial?: boolean;
  allInVolumeBasis?: string | null;
  tollFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  effectiveDate?: string;
  isActive?: boolean;
  notes?: string;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerId: string;
  projectId: string;
  contractId: string;
  invoiceDate?: string;
  dueDate?: string;
  items?: InvoiceItemRow[];
  totalApprovedVolumeM3?: number;
  subtotalIdr?: number;
  taxRatePercent?: number;
  taxAmountIdr?: number;
  totalInvoiceIdr?: number;
  totalPaidIdr?: number;
  outstandingBalanceIdr?: number;
  status?: string;
  notes?: string;
}

interface InvoiceItemRow {
  id: string;
  invoiceId?: string;
  deliveryId: string;
  deliveryNumber: string;
  productName: string;
  approvedVolumeM3: number;
  unitPricePerM3: number;
  itemTotalIdr: number;
}

interface PaymentRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  paymentDate?: string;
  amountPaidIdr: number;
  bankReference?: string;
  paymentMethod?: string;
  notes?: string;
}

export async function importLocalStorageToSupabase(): Promise<ImportSummary[]> {
  const summaries: ImportSummary[] = [];

// --- MASTER: products ---
  const products = safeParse<ProductRow>('rev_products').map((p) => ({
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
  }));
  summaries.push({ table: 'products', ...(await upsert('products', products)) });

  // --- MASTER: quarries (+ material costs) ---
  const quarries = safeParse<QuarryRow>('rev_quarries');
  const quarryRows = quarries.map((q) => ({
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
  }));
  summaries.push({ table: 'quarries', ...(await upsert('quarries', quarryRows)) });

  const costRows = quarries.flatMap((q) =>
    (q.materialCostOverrides ?? []).map((o) => ({
      id: `qmc-${q.id}-${o.productId}`,
      quarry_id: q.id,
      product_id: o.productId,
      cost_per_m3: o.costPerM3,
    }))
  );
  summaries.push({ table: 'quarry_material_costs', ...(await upsert('quarry_material_costs', costRows)) });

  // --- MASTER: customers ---
  const customers = safeParse('rev_customers').map((c: any) => ({
    id: c.id,
    code: c.code ?? null,
    name: c.name,
    npwp: c.npwp ?? null,
    billing_address: c.billingAddress ?? c.address ?? null,
    contact_person: c.contactPerson ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    payment_terms_days: c.paymentTermsDays ?? 30,
    is_active: c.isActive ?? true,
  }));
  summaries.push({ table: 'customers', ...(await upsert('customers', customers)) });

  // --- MASTER: projects ---
  const projects = safeParse<ProjectRow>('rev_projects').map((p) => ({
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
  }));
  summaries.push({ table: 'projects', ...(await upsert('projects', projects)) });

  // --- MASTER: contracts (+ source quarries) ---
  const contracts = safeParse<ContractRow>('rev_contracts');
  const contractRows = contracts.map((c) => ({
    id: c.id,
    contract_number: c.contractNumber,
    customer_id: c.customerId,
    project_id: c.projectId,
    product_id: c.productId,
    quarry_id: c.quarryId ?? null,
    contract_type: c.contractType ?? 'NON_PO',
    contracted_volume_m3: c.contractedVolumeM3 ?? 0,
    unit_price_per_m3: c.unitPricePerM3 ?? 0,
    tolerance_percent: c.tolerancePercent ?? 2.0,
    over_delivery_policy: c.overDeliveryPolicy ?? 'WARNING',
    start_date: c.startDate ?? null,
    end_date: c.endDate ?? null,
    status: c.status ?? 'ACTIVE',
    notes: c.notes ?? null,
  }));
  summaries.push({ table: 'contracts', ...(await upsert('contracts', contractRows)) });

  const sourceRows = contracts.flatMap((c) =>
    (c.sourceQuarryIds ?? []).map((qid) => ({ contract_id: c.id, quarry_id: qid }))
  );
  summaries.push({
    table: 'contract_source_quarries',
    ...(await upsert('contract_source_quarries', sourceRows, 'contract_id,quarry_id')),
  });

  // --- MASTER: transport vendors, vehicles, drivers ---
  const vendors = safeParse('rev_vendors').map((v: any) => ({
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
  }));
  summaries.push({ table: 'transport_vendors', ...(await upsert('transport_vendors', vendors)) });

  const vehicles = safeParse('rev_vehicles').map((v: any) => ({
    id: v.id,
    transport_vendor_id: v.transportVendorId,
    plate_number: v.plateNumber,
    vehicle_type: v.vehicleType ?? null,
    nominal_capacity_m3: v.nominalCapacityM3 ?? 0,
    max_capacity_tons: v.maxCapacityTons ?? null,
    is_active: v.isActive ?? true,
  }));
  summaries.push({ table: 'vehicles', ...(await upsert('vehicles', vehicles)) });

  const drivers = safeParse('rev_drivers').map((d: any) => ({
    id: d.id,
    transport_vendor_id: d.transportVendorId,
    full_name: d.fullName,
    phone: d.phone ?? null,
    sim_number: d.simNumber ?? null,
    is_active: d.isActive ?? true,
  }));
  summaries.push({ table: 'drivers', ...(await upsert('drivers', drivers)) });

  // --- MASTER: freight rates ---
  const freightRates = safeParse<FreightRateRow>('rev_freight_rates').map((f) => ({
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
    notes: f.notes ?? null,
  }));
  summaries.push({ table: 'freight_rates', ...(await upsert('freight_rates', freightRates)) });

  // --- OPERASIONAL: deliveries (+ nested weighbridge, pod, reconciliation, cost) ---
  const deliveries = safeParse<DeliveryRow>('rev_deliveries');
  const deliveryRows = deliveries.map((d) => ({
    id: d.id,
    delivery_number: d.deliveryNumber,
    contract_id: d.contractId,
    product_id: d.productId,
    quarry_id: d.quarryId,
    transport_vendor_id: d.transportVendorId,
    vehicle_id: d.vehicleId ?? null,
    driver_id: d.driverId ?? null,
    driver_name: d.driverName ?? null,
    driver_phone: d.driverPhone ?? null,
    status: d.status ?? 'SCHEDULED',
    loaded_volume_m3: d.loadedVolumeM3 ?? 0,
    received_volume_m3: d.receivedVolumeM3 ?? 0,
    approved_volume_m3: d.approvedVolumeM3 ?? 0,
    loaded_weight_kg: d.loadedWeightKg ?? 0,
    received_weight_kg: d.receivedWeightKg ?? 0,
    approved_weight_kg: d.approvedWeightKg ?? 0,
    density_applied: d.densityApplied ?? null,
    measurement_mode: d.measurementMode ?? 'ACTUAL_MEASURED',
    scheduled_date: d.scheduledDate ?? null,
    departure_date: d.departureDate ?? null,
    notes: d.notes ?? null,
    loaded_at: d.loadedAt ?? null,
    arrived_at: d.arrivedAt ?? null,
    unloaded_at: d.unloadedAt ?? null,
    delivered_at: d.deliveredAt ?? null,
    quarry_loading_info: d.quarryLoadingInfo ?? null,
    site_unloading_info: d.siteUnloadingInfo ?? null,
  }));
  summaries.push({ table: 'deliveries', ...(await upsert('deliveries', deliveryRows)) });

  const weighbridgeRows = deliveries
    .filter((d) => d.weighbridge)
    .map((d) => ({
      id: d.weighbridge!.id,
      delivery_id: d.id,
      gross_weight_kg: d.weighbridge!.grossWeightKg,
      tare_weight_kg: d.weighbridge!.tareWeightKg,
      net_weight_kg: d.weighbridge!.netWeightKg,
      scale_slip_photo_url: d.weighbridge!.scaleSlipPhotoUrl ?? null,
      weighed_at: d.weighbridge!.weighedAt ?? null,
    }));
  summaries.push({ table: 'weighbridge_records', ...(await upsert('weighbridge_records', weighbridgeRows)) });

  const podRows = deliveries
    .filter((d) => d.pod)
    .map((d) => ({
      id: d.pod!.id,
      delivery_id: d.id,
      recipient_name: d.pod!.recipientName,
      recipient_role: d.pod!.recipientRole ?? null,
      gps_latitude: d.pod!.gpsLatitude ?? null,
      gps_longitude: d.pod!.gpsLongitude ?? null,
      gps_accuracy_meters: d.pod!.gpsAccuracyMeters ?? null,
      signature_dispatcher_url: d.pod!.signatureDispatcherUrl ?? null,
      signature_driver_url: d.pod!.signatureDriverUrl ?? null,
      signature_recipient_url: d.pod!.signatureRecipientUrl ?? null,
      delivery_slip_photo_url: d.pod!.deliverySlipPhotoUrl ?? null,
      material_photo_url: d.pod!.materialPhotoUrl ?? null,
      notes: d.pod!.notes ?? null,
      submitted_at: d.pod!.submittedAt ?? null,
    }));
  summaries.push({ table: 'delivery_pods', ...(await upsert('delivery_pods', podRows)) });

  const reconciliationRows = deliveries
    .filter((d) => d.reconciliation)
    .map((d) => ({
      id: d.reconciliation!.id,
      delivery_id: d.id,
      loaded_volume_m3: d.reconciliation!.loadedVolumeM3,
      received_volume_m3: d.reconciliation!.receivedVolumeM3,
      physical_variance_m3: d.reconciliation!.physicalVarianceM3,
      variance_percentage: d.reconciliation!.variancePercentage,
      tolerance_percent_applied: d.reconciliation!.tolerancePercentApplied ?? 2.0,
      variance_status: d.reconciliation!.varianceStatus ?? 'UNDER_INVESTIGATION',
      variance_reason: d.reconciliation!.varianceReason ?? 'OTHER',
      commercial_adjustment_m3: d.reconciliation!.commercialAdjustmentM3 ?? 0,
      final_approved_volume_m3: d.reconciliation!.finalApprovedVolumeM3,
      potential_variance_value_idr: d.reconciliation!.potentialVarianceValueIdr ?? 0,
      review_notes: d.reconciliation!.reviewNotes ?? null,
      reconciled_at: d.reconciliation!.reconciledAt ?? null,
    }));
  summaries.push({ table: 'quantity_reconciliations', ...(await upsert('quantity_reconciliations', reconciliationRows)) });

  const costRows2 = deliveries
    .filter((d) => d.costRecord)
    .map((d) => ({
      id: d.costRecord!.id,
      delivery_id: d.id,
      billable_quantity_m3: d.costRecord!.billableQuantityM3,
      selling_price_per_m3: d.costRecord!.sellingPricePerM3,
      recognized_revenue_idr: d.costRecord!.recognizedRevenueIdr,
      material_cost_per_m3: d.costRecord!.materialCostPerM3,
      total_material_cost_idr: d.costRecord!.totalMaterialCostIdr,
      freight_rate_per_unit: d.costRecord!.freightRatePerUnit,
      freight_pricing_model: d.costRecord!.freightPricingModel ?? 'PER_M3',
      pricing_basis: d.costRecord!.pricingBasis ?? null,
      all_in_price_per_m3: d.costRecord!.allInPricePerM3 ?? null,
      all_in_volume_basis: d.costRecord!.allInVolumeBasis ?? null,
      total_freight_cost_idr: d.costRecord!.totalFreightCostIdr ?? 0,
      other_operational_cost_idr: d.costRecord!.otherOperationalCostIdr ?? 0,
      total_hpp_idr: d.costRecord!.totalHppIdr,
      gross_profit_idr: d.costRecord!.grossProfitIdr,
      gross_margin_percent: d.costRecord!.grossMarginPercent ?? 0,
      is_actual_finalized: d.costRecord!.isActualFinalized ?? false,
    }));
  summaries.push({ table: 'cost_records', ...(await upsert('cost_records', costRows2)) });

  // --- KEUANGAN: invoices (+ items) & payments ---
  const invoices = safeParse<InvoiceRow>('rev_invoices');
  const invoiceRows = invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    customer_id: inv.customerId,
    project_id: inv.projectId,
    contract_id: inv.contractId,
    invoice_date: inv.invoiceDate ?? null,
    due_date: inv.dueDate ?? null,
    total_approved_volume_m3: inv.totalApprovedVolumeM3 ?? 0,
    subtotal_idr: inv.subtotalIdr ?? 0,
    tax_rate_percent: inv.taxRatePercent ?? 11.0,
    tax_amount_idr: inv.taxAmountIdr ?? 0,
    total_invoice_idr: inv.totalInvoiceIdr ?? 0,
    total_paid_idr: inv.totalPaidIdr ?? 0,
    outstanding_balance_idr: inv.outstandingBalanceIdr ?? 0,
    status: inv.status ?? 'DRAFT',
    notes: inv.notes ?? null,
  }));
  summaries.push({ table: 'invoices', ...(await upsert('invoices', invoiceRows)) });

  const invoiceItemRows = invoices.flatMap((inv) =>
    (inv.items ?? []).map((it) => ({
      id: it.id ?? `${inv.id}-${it.deliveryId}`,
      invoice_id: inv.id,
      delivery_id: it.deliveryId,
      delivery_number: it.deliveryNumber,
      product_name: it.productName,
      approved_volume_m3: it.approvedVolumeM3,
      unit_price_per_m3: it.unitPricePerM3,
      item_total_idr: it.itemTotalIdr,
    }))
  ).filter(
    (row) =>
      invoices.some((inv) => inv.id === row.invoice_id) &&
      deliveries.some((d) => d.id === row.delivery_id)
  );
  summaries.push({ table: 'invoice_items', ...(await upsert('invoice_items', invoiceItemRows)) });

  const payments = safeParse<PaymentRow>('rev_payments').map((p) => ({
    id: p.id,
    invoice_id: p.invoiceId,
    invoice_number: p.invoiceNumber,
    customer_name: p.customerName,
    payment_date: p.paymentDate ?? null,
    amount_paid_idr: p.amountPaidIdr,
    bank_reference: p.bankReference ?? null,
    payment_method: p.paymentMethod ?? null,
    notes: p.notes ?? null,
  })).filter((row) => invoices.some((inv) => inv.id === row.invoice_id));
  summaries.push({ table: 'payments', ...(await upsert('payments', payments)) });

  return summaries;
}