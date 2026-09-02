// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Layers,
  Truck,
  TrendingUp,
  CreditCard,
  Building2,
  Mountain,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatIDR, formatVolumeM3 } from '../../lib/formatters';
import { getDynamicCost as getDynamicCostLib, aggregateFinance } from '../../lib/financeReport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const ReportsView: React.FC = () => {
  const {
    deliveries,
    contracts,
    customers,
    projects,
    quarries,
    products,
    invoices,
    vehicles,
    transportVendors,
    freightRates,
    quarryMaterialCosts,
  } = useApp() as any;

  const [selectedReportType, setSelectedReportType] = useState<
    'deliveries' | 'reconciliation' | 'finance' | 'contracts' | 'invoices'
  >('deliveries');

  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
  const [selectedQuarryId, setSelectedQuarryId] = useState('ALL');
  const [selectedProductId, setSelectedProductId] = useState('ALL');
  const [dateRange, setDateRange] = useState({
    start: '2026-01-01',
    end: '2026-12-31',
  });

  // Sinkronkan rentang tanggal ke data aktual (tampilkan semua saat load, bukan 03-04 saja)
  useEffect(() => {
    if (deliveries.length > 0) {
      const dates = deliveries.map((d) => d.scheduledDate).filter(Boolean).sort();
      if (dates.length > 0) {
        const min = dates[0]!;
        const max = dates[dates.length - 1]!;
        // Hanya set jika masih default sempit atau kosong — jangan timpa pilihan user yang sudah diubah
        setDateRange((prev) => {
          if (prev.start === '2026-01-01' && prev.end === '2026-12-31') {
            return { start: min, end: max };
          }
          if (prev.start === '2026-03-01' && prev.end === '2026-04-30') {
            return { start: min, end: max };
          }
          return prev;
        });
      }
    }
  }, [deliveries.length]);

  // URL filter persist — shareable link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const c = p.get('cust'); const q = p.get('quarry'); const prod = p.get('prod'); const s = p.get('start'); const e = p.get('end'); const t = p.get('tab');
    if (c) setSelectedCustomerId(c);
    if (q) setSelectedQuarryId(q);
    if (prod) setSelectedProductId(prod);
    if (s && e) setDateRange({ start: s, end: e });
    if (t && ['deliveries','reconciliation','finance','contracts'].includes(t)) setSelectedReportType(t as any);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    p.set('cust', selectedCustomerId); p.set('quarry', selectedQuarryId); p.set('prod', selectedProductId);
    p.set('start', dateRange.start); p.set('end', dateRange.end); p.set('tab', selectedReportType);
    window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
  }, [selectedCustomerId, selectedQuarryId, selectedProductId, dateRange.start, dateRange.end, selectedReportType]);

  // Alias helpers — sinkron HPP & Laba Kotor: TGL dd/mm/yyyy, Proyek KBS, Vendor VND-YDH
  const PROJECT_ALIAS_FIN: Record<string, string> = {
    'proj-04': 'KBS Sunter',
    'proj-05': 'KBS Legok',
    'proj-06': 'KBS Pluit',
    'proj-07': 'KBS Dadap',
    'proj-08': 'KBS Bogor',
  };
  function projectAliasFin(proj: any) {
    if (!proj) return '-';
    if (PROJECT_ALIAS_FIN[proj.id]) return PROJECT_ALIAS_FIN[proj.id];
    if (proj.name?.includes('Plant Karya Beton')) return proj.name.replace('Plant Karya Beton', 'KBS').trim();
    return proj.code || proj.project_number || proj.name?.slice(0, 12) || '-';
  }
  const VENDOR_ALIAS_FIN: Record<string, string> = { 'vendor-05': 'VND-IVN', 'vendor-06': 'VND-YDH' };
  function vendorAliasFin(v: any) {
    if (!v) return '-';
    if (VENDOR_ALIAS_FIN[v.id]) return VENDOR_ALIAS_FIN[v.id];
    return v.code || v.name?.split(' ')[0] || '-';
  }
  function formatDateDMYFin(s: string) {
    if (!s) return '-';
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    const p = s.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return s;
  }

  // Filtered deliveries based on criteria
  const filteredDeliveries = deliveries.filter((d) => {
    const contract = contracts.find((c) => c.id === d.contractId);
    const matchesCustomer =
      selectedCustomerId === 'ALL' || contract?.customerId === selectedCustomerId;
    const matchesQuarry = selectedQuarryId === 'ALL' || d.quarryId === selectedQuarryId;
    const matchesProduct = selectedProductId === 'ALL' || d.productId === selectedProductId;
    const matchesDate =
      (!dateRange.start || d.scheduledDate >= dateRange.start) &&
      (!dateRange.end || d.scheduledDate <= dateRange.end);

    return matchesCustomer && matchesQuarry && matchesProduct && matchesDate;
  });

  // DRY — pakai lib/financeReport single source
  function getDynamicCost(d: any) {
    return getDynamicCostLib(d, { contracts, products, transportVendors, freightRates, quarryMaterialCosts } as any);
  }

  // Aggregations — DRY via financeReport
  const { totalApprovedVol, totalNetWeightTons, totalRevenue, totalHpp, totalGrossProfit, avgGrossMargin, varianceExceededCount } = aggregateFinance(filteredDeliveries) as any;
  const totalLoadedVol = filteredDeliveries.reduce((sum, d) => sum + (d.loadedVolumeM3 || 0), 0);

  // Export — CSV/Excel/PDF + scheduled email stub
  const exportRowsForType = (): any[] => {
    if (selectedReportType === 'deliveries') {
      return filteredDeliveries.map((d) => {
        const contract = contracts.find((c) => c.id === d.contractId);
        const cust = customers.find((c) => c.id === contract?.customerId);
        const proj = projects.find((p) => p.id === contract?.projectId);
        const prod = products.find((p) => p.id === d.productId);
        const qry = quarries.find((q) => q.id === d.quarryId);
        return {
          'NO. SURAT JALAN': d.deliveryNumber,
          'TANGGAL': d.scheduledDate,
          'PELANGGAN': cust?.name || '',
          'PROYEK': proj?.name || '',
          'MATERIAL AGREGAT': prod?.name || '',
          'QUARRY ASAL': qry?.name || '',
          'VOL. LOADING (m³)': d.loadedVolumeM3,
          'VOL. APPROVED (m³)': d.approvedVolumeM3,
          'STATUS RITASE': d.status,
        };
      });
    }
    if (selectedReportType === 'reconciliation') {
      return filteredDeliveries.map((d) => {
        const rec = d.reconciliation;
        return {
          'NO. SURAT JALAN': d.deliveryNumber,
          'VOL. MUAT (m³)': d.loadedVolumeM3,
          'VOL. TERIMA (m³)': d.receivedVolumeM3,
          'SELISIH FISIK (m³)': rec?.physicalVarianceM3 ?? 0,
          '% SELISIH': rec?.variancePercentage ?? 0,
          'STATUS TOLERANSI': rec?.varianceStatus || 'WITHIN_TOLERANCE',
          'ALASAN / PENYEBAB': rec?.varianceReason || '',
          'VOL. TAGIH FINAL (m³)': d.approvedVolumeM3,
        };
      });
    }
    if (selectedReportType === 'finance') {
      return filteredDeliveries.filter((d) => (d as any).costRecord && d.approvedVolumeM3 > 0).map((d) => {
        const quarry = quarries.find((q: any) => q.id === d.quarryId);
        const vehicle = vehicles.find((v: any) => v.id === d.vehicleId);
        const vendor = transportVendors.find((v: any) => v.id === d.transportVendorId);
        const cust = customers.find((c: any) => c.id === contracts.find((co: any) => co.id === d.contractId)?.customerId);
        const proj = projects.find((p: any) => p.id === contracts.find((co: any) => co.id === d.contractId)?.projectId);
        const cr = (d as any).costRecord;
        return {
          'NO. SURAT JALAN': d.deliveryNumber,
          'TANGGAL': formatDateDMYFin(d.scheduledDate),
          'JENIS MATERIAL': products.find((p: any) => p.id === d.productId)?.name || '',
          'PELANGGAN': cust?.name || '',
          'TUJUAN PROYEK': projectAliasFin(proj),
          'VOL LOADING (m³)': (d as any).loadedVolumeM3,
          'VOL (M³)': (d as any).approvedVolumeM3,
          'SUMBER QUARRY': quarry?.name || '',
          'PLAT NOMOR': vehicle?.plateNumber || (d as any).driverName || '',
          'VENDOR ARMADA': vendorAliasFin(vendor),
          'PENDAPATAN JUAL (IDR)': (cr as any).recognizedRevenueIdr,
          'BIAYA MATERIAL (IDR)': (cr as any).totalMaterialCostIdr,
          'ONGKOS ANGKUT (IDR)': (cr as any).totalFreightCostIdr,
          'TOTAL HPP (IDR)': (cr as any).totalHppIdr,
          'LABA KOTOR (IDR)': (cr as any).grossProfitIdr,
          'GROSS MARGIN (%)': (cr as any).grossMarginPercent,
        };
      });
    }
    if (selectedReportType === 'contracts') {
      return contracts.map((c) => {
        const cust = customers.find((cu) => cu.id === c.customerId);
        const proj = projects.find((p) => p.id === c.projectId);
        const prod = products.find((p) => p.id === c.productId);
        const rel = deliveries.filter((d) => d.contractId === c.id);
        const fulfilled = rel.reduce((s, d) => s + (d.approvedVolumeM3 || 0), 0);
        const isNonPo = c.contractType === 'NON_PO';
        return {
          'NO. KONTRAK': c.contractNumber,
          'PELANGGAN': cust?.name || '',
          'PROYEK': proj?.name || '',
          'MATERIAL': prod?.name || '',
          'VOLUME KONTRAK (m³)': isNonPo ? 'Rutin' : c.contractedVolumeM3,
          'REALISASI APPROVED (m³)': fulfilled,
          'SISA KUOTA (m³)': isNonPo ? 'Rutin' : Math.max(0, c.contractedVolumeM3 - fulfilled),
          'BURN RATE (%)': isNonPo ? 'Rutin' : ((fulfilled / c.contractedVolumeM3) * 100).toFixed(1),
          'STATUS KONTRAK': c.status,
        };
      });
    }
    return [];
  };
  const handleExport = () => {
    try {
      const rows: any[] = exportRowsForType();
      if (rows.length === 0) {
        toast.error('Tidak ada data untuk diekspor (filter kosong)');
        return;
      }
      let filename = `REV_BUMI_${selectedReportType}_${new Date().toISOString().slice(0, 10)}.csv`;
      if (selectedReportType === 'finance') filename = `REV_BUMI_HPP_${new Date().toISOString().slice(0, 10)}.csv`;
      const headers = Object.keys(rows[0]!);
      const csv =
        [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`CSV ${selectedReportType} berhasil diunduh — ${rows.length} baris (satuan baku)`);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal ekspor CSV');
    }
  };
  const handleExportExcel = () => {
    try {
      const rows: any[] = exportRowsForType();
      if (rows.length === 0) { toast.error('Tidak ada data untuk Excel'); return; }
      // Excel via CSV with .xlsx mime — Excel opens CSV fine; for true xlsx need `xlsx` lib
      const headers = Object.keys(rows[0]!);
      const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `REV_BUMI_${selectedReportType}_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click(); URL.revokeObjectURL(url);
      toast.success(`Excel ${selectedReportType} diunduh — ${rows.length} baris`);
    } catch (e: any) { toast.error(e?.message || 'Gagal Excel'); }
  };
  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default as any;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text(`Laporan ${selectedReportType} — REV BUMI`, 14, 12);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text(`Filter: ${selectedCustomerId}/${selectedQuarryId}/${selectedProductId} ${dateRange.start}→${dateRange.end} • ${filteredDeliveries.length} ritase`, 14, 18);
      const rows: any[] = exportRowsForType();
      if (rows.length === 0) { toast.error('Tidak ada data untuk PDF'); return; }
      const headers = Object.keys(rows[0]!);
      const body = rows.slice(0, 50).map((r) => headers.map((h) => String((r as any)[h] ?? '')));
      autoTable(doc, { head: [headers], body, startY: 22, styles: { fontSize: 6 }, headStyles: { fillColor: [0,60,22] } });
      doc.save(`REV_BUMI_${selectedReportType}_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success(`PDF ${selectedReportType} diunduh — ${Math.min(50, rows.length)} baris (max 50)`);
    } catch (e: any) { toast.error(e?.message || 'Gagal PDF'); }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Selector & Export Bar — shadcn Tabs + Button */}
      <Card className="py-3">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-0 px-4">
          <Tabs value={selectedReportType} onValueChange={(v) => setSelectedReportType(v as any)} className="w-full md:w-auto">
            <TabsList className="flex-wrap h-auto gap-1 bg-muted p-1">
              <TabsTrigger value="deliveries" className="text-xs">Laporan Pengiriman & SJ</TabsTrigger>
              <TabsTrigger value="reconciliation" className="text-xs">Rekonsiliasi Volume m³</TabsTrigger>
              <TabsTrigger value="finance" className="text-xs">HPP & Profitabilitas</TabsTrigger>
              <TabsTrigger value="contracts" className="text-xs">Monitoring Kontrak & Burn Rate</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2 w-full md:w-auto">
            <Button size="sm" variant="outline" onClick={handleExport} className="flex-1 md:flex-none gap-1.5"><Download className="w-4 h-4" /> CSV</Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel} className="flex-1 md:flex-none gap-1.5"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
            <Button size="sm" onClick={handleExportPdf} className="flex-1 md:flex-none shrink-0 bg-emerald-700 hover:bg-emerald-800 gap-1.5"><Download className="w-4 h-4" /> PDF</Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Email Stub */}
      <Card className="py-3 bg-amber-50/50 border-amber-200">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 p-0 px-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-700" />
            <div>
              <p className="text-xs font-bold text-amber-900">Jadwal Email Harian — Coming Soon</p>
              <p className="text-[11px] text-amber-700">Kirim rekap HPP & burn-rate per proyek ke direksi tiap 07:00 WIB (via Edge Function + Resend)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Filter URL shareable aktif — copy link untuk share</span>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link filter disalin'); }} className="h-7 text-xs gap-1"><FileSpreadsheet className="w-3 h-3" /> Salin Link</Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Parameters — shadcn Card + Select + Input */}
      <Card className="py-4">
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-0 px-4">
          <div className="space-y-1">
            <Label className="text-xs">Pelanggan / Kontraktor</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Semua Pelanggan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Semua Pelanggan ({customers.length})</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Sumber Quarry</Label>
            <Select value={selectedQuarryId} onValueChange={setSelectedQuarryId}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Semua Sumber Quarry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Semua Sumber Quarry</SelectItem>
                {quarries.map((q) => (
                  <SelectItem key={q.id} value={q.id} className="text-xs">{q.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Jenis Agregat / Material</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Semua Produk Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Semua Produk Material</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Rentang Tanggal</Label>
            <div className="flex items-center gap-1.5">
              <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="h-8 text-[11px] font-mono" />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="h-8 text-[11px] font-mono" />
            </div>
          </div>
        </CardContent>
        <div className="px-4 pb-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCustomerId('ALL');
              setSelectedQuarryId('ALL');
              setSelectedProductId('ALL');
              const dates = deliveries.map((d) => d.scheduledDate).filter(Boolean).sort();
              if (dates.length > 0) setDateRange({ start: dates[0]!, end: dates[dates.length - 1]! });
              else setDateRange({ start: '2026-01-01', end: '2026-12-31' });
              toast.info('Filter direset — menampilkan semua data');
            }}
            className="h-7 text-xs gap-1"
          >
            <Filter className="w-3 h-3" /> Tampilkan Semua (Reset Filter)
          </Button>
        </div>
      </Card>

      {/* KPI Metrics Ribbon — shadcn Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase">Total Volume Approved</CardDescription>
            <CardTitle className="text-xl font-mono">{formatVolumeM3(totalApprovedVol)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-muted-foreground">Setara ± {totalNetWeightTons.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ton</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase">Total Nilai Penjualan</CardDescription>
            <CardTitle className="text-xl font-mono text-primary">{formatIDR(totalRevenue)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-muted-foreground">Dari {filteredDeliveries.length} ritase surat jalan</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase">Laba Kotor & Margin Rata-Rata</CardDescription>
            <CardTitle className="text-xl font-mono text-emerald-700 dark:text-emerald-300">{formatIDR(totalGrossProfit)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Margin: {avgGrossMargin.toFixed(1)}% (Target &gt; 25%)</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase">Penyimpangan Volume Di Luar Toleransi</CardDescription>
            <CardTitle className={`text-xl font-mono ${varianceExceededCount > 0 ? 'text-amber-600' : 'text-amber-700'}`}>{varianceExceededCount} Ritase</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-muted-foreground">{varianceExceededCount > 0 ? 'Perlu approval revisi QS' : 'Semua dalam toleransi baku'}</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Report Table Container — shadcn Card + Table */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider">
            {selectedReportType === 'deliveries' && 'Detail Rekapitulasi Surat Jalan & Pengiriman'}
            {selectedReportType === 'reconciliation' && 'Hasil Rekonsiliasi & Audit Selisih Volume (m³)'}
            {selectedReportType === 'finance' && 'Analisis HPP & Margin Laba Kotor'}
            {selectedReportType === 'contracts' && 'Status Realisasi & Sisa Alokasi Kontrak'}
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">
            Menampilkan {filteredDeliveries.length} data record
          </span>
        </div>

        <CardContent className="p-0">
          {selectedReportType === 'deliveries' && (
            <Table className="w-full text-left text-xs border-collapse">
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <TableHead className="py-3 px-3.5">No. Surat Jalan</TableHead>
                  <TableHead className="py-3 px-3">Tanggal</TableHead>
                  <TableHead className="py-3 px-3">Pelanggan & Proyek</TableHead>
                  <TableHead className="py-3 px-3">Material Agregat</TableHead>
                  <TableHead className="py-3 px-3">Quarry Asal</TableHead>
                  <TableHead className="py-3 px-3 text-right">Vol. Loading</TableHead>
                  <TableHead className="py-3 px-3 text-right">Vol. Approved</TableHead>
                  <TableHead className="py-3 px-3">Status Ritase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDeliveries.map((d) => {
                  const contract = contracts.find((c) => c.id === d.contractId);
                  const cust = customers.find((c) => c.id === contract?.customerId);
                  const proj = projects.find((p) => p.id === contract?.projectId);
                  const prod = products.find((p) => p.id === d.productId);
                  const qry = quarries.find((q) => q.id === d.quarryId);

                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/80">
                      <TableCell className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {d.deliveryNumber}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-mono text-slate-600">
                        {formatDate(d.scheduledDate)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">{cust?.name}</p>
                        <p className="text-[11px] text-slate-500">{proj?.name}</p>
                      </TableCell>
                      <TableCell className="py-2.5 px-3">{prod?.name}</TableCell>
                      <TableCell className="py-2.5 px-3">{qry?.locationName}</TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-semibold text-slate-600">
                        {formatVolumeM3(d.loadedVolumeM3, false)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-black text-[#003C16]">
                        {formatVolumeM3(d.approvedVolumeM3, false)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {d.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {selectedReportType === 'reconciliation' && (
            <Table className="w-full text-left text-xs border-collapse">
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <TableHead className="py-3 px-3.5">No. Surat Jalan</TableHead>
                  <TableHead className="py-3 px-3 text-right">Vol. Muat (m³)</TableHead>
                  <TableHead className="py-3 px-3 text-right">Vol. Terima (m³)</TableHead>
                  <TableHead className="py-3 px-3 text-right">Selisih Fisik</TableHead>
                  <TableHead className="py-3 px-3 text-right">% Selisih</TableHead>
                  <TableHead className="py-3 px-3">Status Toleransi</TableHead>
                  <TableHead className="py-3 px-3">Alasan / Penyebab</TableHead>
                  <TableHead className="py-3 px-3 text-right">Vol. Tagih Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDeliveries.map((d) => {
                  const rec = d.reconciliation;
                  const variancePct = rec?.variancePercentage || 0;
                  const isExceeded = rec?.varianceStatus === 'ABOVE_TOLERANCE';

                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/80">
                      <TableCell className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {d.deliveryNumber}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono">
                        {formatVolumeM3(d.loadedVolumeM3, false)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono">
                        {formatVolumeM3(d.receivedVolumeM3, false)}
                      </TableCell>
                      <TableCell
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          (rec?.physicalVarianceM3 || 0) < 0 ? 'text-rose-700' : 'text-slate-700'
                        }`}
                      >
                        {(rec?.physicalVarianceM3 || 0) > 0 ? '+' : ''}
                        {(rec?.physicalVarianceM3 || 0).toFixed(2)} m³
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono">
                        <span
                          className={`font-bold ${
                            isExceeded ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {variancePct.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isExceeded
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rec?.varianceStatus || 'WITHIN_TOLERANCE'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-slate-600">
                        {rec?.varianceReason || 'PHYSICAL_LOSS'}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-black text-[#003C16]">
                        {formatVolumeM3(d.approvedVolumeM3, false)} m³
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {selectedReportType === 'finance' && (
            <Table className="w-full text-left text-xs border-collapse">
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <TableHead className="py-3 px-2.5">No. SJ</TableHead>
                  <TableHead className="py-3 px-2">Tgl</TableHead>
                  <TableHead className="py-3 px-2">Mat.</TableHead>
                  <TableHead className="py-3 px-2">Cust.</TableHead>
                  <TableHead className="py-3 px-2">Proyek</TableHead>
                  <TableHead className="py-3 px-2 text-right">Vol Load</TableHead>
                  <TableHead className="py-3 px-2 text-right">Vol App</TableHead>
                  <TableHead className="py-3 px-2">Quarry</TableHead>
                  <TableHead className="py-3 px-2">Plat</TableHead>
                  <TableHead className="py-3 px-2">Vendor</TableHead>
                  <TableHead className="py-3 px-2 text-right">Pendapatan</TableHead>
                  <TableHead className="py-3 px-2 text-right">Mat.</TableHead>
                  <TableHead className="py-3 px-2 text-right">Angkut</TableHead>
                  <TableHead className="py-3 px-2 text-right">HPP</TableHead>
                  <TableHead className="py-3 px-2 text-right">Laba</TableHead>
                  <TableHead className="py-3 px-2 text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDeliveries.map((d) => {
                  if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return null;
                  const cost = (d as any).costRecord;
                  if (!cost) return null;
                  const quarry = quarries.find((q) => q.id === d.quarryId);
                  const vehicle = vehicles.find((v) => v.id === d.vehicleId);
                  const vendor = transportVendors.find((v) => v.id === d.transportVendorId);

                  const prod = products.find((p: any) => p.id === d.productId);
                  const cust = customers.find((c: any) => c.id === contracts.find((co: any) => co.id === d.contractId)?.customerId);
                  const proj = projects.find((p: any) => p.id === contracts.find((co: any) => co.id === d.contractId)?.projectId);
                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/80">
                      <TableCell className="py-2.5 px-2.5 font-mono font-bold text-slate-900 text-[11px]">
                        {d.deliveryNumber}
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 font-mono text-[10px]">{formatDateDMYFin(d.scheduledDate)}</TableCell>
                      <TableCell className="py-2.5 px-2.5" title={prod?.name || ''}>
                        <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700">
                          {prod?.code || prod?.name?.slice(0, 8) || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5" title={cust?.name || ''}>
                        <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                          {cust?.code || cust?.name?.slice(0, 10) || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5" title={proj?.name || ''}>
                        <span className="font-medium text-[11px] px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800">
                          {projectAliasFin(proj)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 text-right font-mono text-slate-600 text-[11px]">
                        {formatVolumeM3(d.loadedVolumeM3, false)}
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 text-right font-mono font-bold text-[11px]">
                        {formatVolumeM3(d.approvedVolumeM3, false)}
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5" title={quarry?.name || ''}>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800">
                          {quarry?.code || quarry?.name?.slice(0, 8) || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 font-mono font-bold text-[11px]">{vehicle?.plateNumber || (d as any).driverName || '-'}</TableCell>
                      <TableCell className="py-2.5 px-2.5" title={vendor?.name || ''}>
                        <span className="font-medium text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700">
                          {vendorAliasFin(vendor)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatIDR(cost.recognizedRevenueIdr)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatIDR(cost.totalMaterialCostIdr)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatIDR(cost.totalFreightCostIdr)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-rose-800">
                        {formatIDR(cost.totalHppIdr)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                        {formatIDR(cost.grossProfitIdr)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            cost.grossMarginPercent >= 25
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cost.grossMarginPercent.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {selectedReportType === 'contracts' && (
            <Table className="w-full text-left text-xs border-collapse">
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <TableHead className="py-3 px-3.5">No. Kontrak</TableHead>
                  <TableHead className="py-3 px-3">Pelanggan & Proyek</TableHead>
                  <TableHead className="py-3 px-3">Material</TableHead>
                  <TableHead className="py-3 px-3 text-right">Volume Kontrak</TableHead>
                  <TableHead className="py-3 px-3 text-right">Realisasi Approved</TableHead>
                  <TableHead className="py-3 px-3 text-right">Sisa Kuota</TableHead>
                  <TableHead className="py-3 px-3 text-right">Burn Rate</TableHead>
                  <TableHead className="py-3 px-3">Status Kontrak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-medium text-slate-800">
                {contracts.map((c) => {
                  const cust = customers.find((cu) => cu.id === c.customerId);
                  const proj = projects.find((p) => p.id === c.projectId);
                  const prod = products.find((p) => p.id === c.productId);

                  const relDeliveries = deliveries.filter((d) => d.contractId === c.id);
                  const fulfilledM3 = relDeliveries.reduce(
                    (sum, d) => sum + (d.approvedVolumeM3 || 0),
                    0
                  );
                  const isNonPo = c.contractType === 'NON_PO';
                  const remainingM3 = isNonPo ? 0 : Math.max(0, c.contractedVolumeM3 - fulfilledM3);
                  const burnRate = isNonPo ? 0 : (fulfilledM3 / c.contractedVolumeM3) * 100;

                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50/80">
                      <TableCell className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {c.contractNumber}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{cust?.name}</p>
                        <p className="text-[11px] text-slate-500">{proj?.name}</p>
                      </TableCell>
                      <TableCell className="py-3 px-3">{prod?.name}</TableCell>
                      <TableCell className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {isNonPo ? 'Rutin' : `${formatVolumeM3(c.contractedVolumeM3, false)} m³`}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right font-mono font-black text-[#003C16]">
                        {formatVolumeM3(fulfilledM3, false)} m³
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right font-mono text-slate-600">
                        {isNonPo ? 'Rutin' : `${formatVolumeM3(remainingM3, false)} m³`}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                isNonPo
                                  ? 'bg-sky-500'
                                  : burnRate > 90
                                  ? 'bg-rose-500'
                                  : burnRate > 50
                                  ? 'bg-amber-500'
                                  : 'bg-[#003C16]'
                              }`}
                              style={{ width: `${isNonPo ? 100 : Math.min(100, burnRate)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{isNonPo ? 'Rutin' : `${burnRate.toFixed(1)}%`}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {c.status}
                        </span>
                        {isNonPo && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 ml-1">
                            Non-PO
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
