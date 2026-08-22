import { QuarryMaterialCost } from './supabaseMaster';

export function resolveQuarryCost(
  costs: QuarryMaterialCost[],
  quarryId: string,
  productId: string,
  onDate: string
): QuarryMaterialCost | undefined {
  const cands = costs.filter(
    (c) =>
      c.quarryId === quarryId &&
      c.productId === productId &&
      (!c.effectiveDate || c.effectiveDate <= onDate)
  );
  if (cands.length === 0) {
    // Fallback to any cost for that quarry×product (latest)
    const any = costs.filter((c) => c.quarryId === quarryId && c.productId === productId);
    if (any.length === 0) return undefined;
    any.sort((a, b) => (a.effectiveDate || '').localeCompare(b.effectiveDate || ''));
    return any[any.length - 1];
  }
  cands.sort((a, b) => (a.effectiveDate || '').localeCompare(b.effectiveDate || ''));
  return cands[cands.length - 1];
}
