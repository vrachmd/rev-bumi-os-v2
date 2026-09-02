import { supabase } from './supabase';

export interface ContractVersion {
  id: string;
  contractId: string;
  versionNumber: number;
  unitPricePerM3: number;
  tolerancePercent: number;
  contractedVolumeM3: number;
  taxRatePercent?: number;
  startDate?: string;
  endDate?: string;
  overDeliveryPolicy?: string;
  notes?: string;
  attachmentUrl?: string;
  createdBy?: string;
  createdAt: string;
  status: string;
}

export async function fetchContractVersions(contractId: string): Promise<ContractVersion[]> {
  const { data, error } = await supabase.from('contract_versions').select('*').eq('contract_id', contractId).order('version_number', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    contractId: r.contract_id,
    versionNumber: Number(r.version_number),
    unitPricePerM3: Number(r.unit_price_per_m3),
    tolerancePercent: Number(r.tolerance_percent),
    contractedVolumeM3: Number(r.contracted_volume_m3),
    taxRatePercent: r.tax_rate_percent != null ? Number(r.tax_rate_percent) : undefined,
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    overDeliveryPolicy: r.over_delivery_policy ?? undefined,
    notes: r.notes ?? undefined,
    attachmentUrl: r.attachment_url ?? undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
    status: r.status,
  }));
}

export async function createContractVersion(v: Omit<ContractVersion, 'id' | 'createdAt'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('contract_versions').insert({
    contract_id: v.contractId,
    version_number: v.versionNumber,
    unit_price_per_m3: v.unitPricePerM3,
    tolerance_percent: v.tolerancePercent,
    contracted_volume_m3: v.contractedVolumeM3,
    tax_rate_percent: v.taxRatePercent ?? null,
    start_date: v.startDate ?? null,
    end_date: v.endDate ?? null,
    over_delivery_policy: v.overDeliveryPolicy ?? null,
    notes: v.notes ?? null,
    attachment_url: v.attachmentUrl ?? null,
    created_by: user?.id ?? null,
    status: 'APPROVED',
  });
  if (error) throw error;
}
