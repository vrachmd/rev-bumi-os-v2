import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Calendar } from 'lucide-react';
import { fetchClosedPeriods, closePeriod, openPeriod, ClosedPeriod } from '../../lib/supabaseClosedPeriod';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';

export const ClosedPeriodManager: React.FC = () => {
  const { profile } = useApp() as any;
  const isSuper = profile?.role === 'SUPER_ADMIN';
  const [periods, setPeriods] = useState<ClosedPeriod[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setPeriods(await fetchClosedPeriods());
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal load periode');
    }
  };
  useEffect(() => { load(); }, []);

  const handleClose = async () => {
    if (!isSuper) { toast.error('Hanya SUPER_ADMIN boleh tutup periode'); return; }
    setLoading(true);
    try {
      await closePeriod(year, month, `Tutup periode ${String(month).padStart(2,'0')}/${year}`);
      toast.success(`Periode ${String(month).padStart(2,'0')}/${year} ditutup`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  const handleOpen = async (p: ClosedPeriod) => {
    if (!isSuper) { toast.error('Hanya SUPER_ADMIN boleh buka'); return; }
    if (!confirm(`Buka periode ${String(p.periodMonth).padStart(2,'0')}/${p.periodYear}?`)) return;
    try {
      await openPeriod(p.periodYear, p.periodMonth);
      toast.success('Periode dibuka');
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Closing Periode</CardTitle>
        <CardDescription>Lock pencatatan bisnis per bulan — invoice/payment/kontrak di periode tutup tidak bisa diubah kecuali SUPER_ADMIN unlock. Periode tutup: invoice_date & payment_date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tahun</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="ml-2 w-24 border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Bulan</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="ml-2 border rounded-md px-2 py-1.5 text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={handleClose} disabled={loading || !isSuper} className="gap-1.5"><Lock className="w-3.5 h-3.5" /> Tutup Periode</Button>
          {!isSuper && <span className="text-xs text-amber-600">Hanya SUPER_ADMIN</span>}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 text-xs font-semibold flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Periode Tertutup ({periods.length})</div>
          {periods.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Belum ada periode tutup — semua periode terbuka</div>
          ) : (
            <div className="divide-y">
              {periods.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{String(p.periodMonth).padStart(2,'0')}/{p.periodYear}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(p.closedAt).toLocaleDateString('id-ID')} {p.notes ? `• ${p.notes}` : ''}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpen(p)} disabled={!isSuper} className="gap-1"><Unlock className="w-3.5 h-3.5" /> Buka</Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Guard: `createInvoice` cek `invoice_date`, `recordPayment` cek `payment_date`, `updateContract/saveQuarry` cek `start_date` — jika tutup, throw error jelas.</p>
      </CardContent>
    </Card>
  );
};
