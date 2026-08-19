import { FreightRate } from '../types';

export interface ResolveFreightRateOptions {
  transportVendorId: string;
  projectId: string;
  quarryId: string;
  onDate: string;
}

/**
 * Resolve tarif angkutan aktif untuk kombinasi vendor + project + quarry pada tanggal tertentu.
 * Memilih rate dengan effectiveDate terbesar yang masih <= onDate (mendukung perubahan tarif per tanggal).
 * Mengembalikan undefined bila tidak ada tarif aktif — pemanggil wajib memblokir, bukan memakai default.
 */
export function resolveFreightRate(
  rates: FreightRate[],
  opts: ResolveFreightRateOptions
): FreightRate | undefined {
  const candidates = rates.filter(
    (r) =>
      r.isActive !== false &&
      r.transportVendorId === opts.transportVendorId &&
      r.projectId === opts.projectId &&
      r.quarryId === opts.quarryId &&
      (!r.effectiveDate || r.effectiveDate <= opts.onDate)
  );
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => (a.effectiveDate || '').localeCompare(b.effectiveDate || ''));
  return candidates[candidates.length - 1];
}