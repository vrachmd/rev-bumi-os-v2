import { supabase } from './supabase';

export interface ClosedPeriod {
  id: string;
  periodYear: number;
  periodMonth: number;
  closedAt: string;
  closedBy?: string;
  notes?: string;
  isClosed: boolean;
}

const mapRow = (r: any): ClosedPeriod => ({
  id: r.id,
  periodYear: Number(r.period_year),
  periodMonth: Number(r.period_month),
  closedAt: r.closed_at,
  closedBy: r.closed_by ?? undefined,
  notes: r.notes ?? undefined,
  isClosed: r.is_closed,
});

export async function fetchClosedPeriods(): Promise<ClosedPeriod[]> {
  const { data, error } = await supabase.from('closed_periods').select('*').order('period_year', { ascending: false }).order('period_month', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function closePeriod(year: number, month: number, notes?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('closed_periods').upsert({
    period_year: year,
    period_month: month,
    closed_by: user?.id ?? null,
    notes: notes ?? null,
    is_closed: true,
  }, { onConflict: 'period_year,period_month' });
  if (error) throw error;
}

export async function openPeriod(year: number, month: number): Promise<void> {
  const { error } = await supabase.from('closed_periods').delete().eq('period_year', year).eq('period_month', month);
  if (error) throw error;
}

export function isDateInClosedPeriod(dateStr: string, periods: ClosedPeriod[]): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return periods.some((p) => p.isClosed && p.periodYear === y && p.periodMonth === m);
}

export async function assertNotClosed(dateStr: string): Promise<void> {
  const periods = await fetchClosedPeriods();
  if (isDateInClosedPeriod(dateStr, periods)) {
    const d = new Date(dateStr);
    throw new Error(`Periode ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} sudah tutup (closed). Hubungi SUPER_ADMIN untuk unlock.`);
  }
}
