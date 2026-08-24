// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Download, Filter } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatIDR, formatVolumeM3 } from '../../lib/formatters';
import { calculateDeliveryFinance } from '../../engine/finance.engine';
import { resolveFreightRate } from '../../lib/freightRate';
import { resolveQuarryCost } from '../../lib/quarryCost';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const HppFinanceView: React.FC = () => {
  const {
    deliveries,
    contracts,
    customers,
    projects,
    quarries,
    products,
    vehicles,
    transportVendors,
    freightRates,
    quarryMaterialCosts,
  } = useApp() as any;

  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
  const [selectedQuarryId, setSelectedQuarryId] = useState('ALL');
  const [selectedProductId, setSelectedProductId] = useState('ALL');
  const [dateRange, setDateRange] = useState({
    start: '2026-01-01',
    end: '2026-12-31',
  });

  // Sinkronkan rentang tanggal ke data aktual (identik Laporan Komprehensif)
  useEffect(() => {
    if (deliveries.length > 0) {
      const dates = deliveries.map((d) => d.scheduledDate).filter(Boolean).sort();
      if (dates.length > 0) {
        const min = dates[0]!;
        const max = dates[dates.length - 1]!;
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

  // Filtered deliveries based on criteria — identik Laporan Komprehensif
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

  // Dynamic HPP — sinkron dengan Vendor & Tarif terbaru (identik Laporan Komprehensif)
  function getDynamicCost(d: any) {
    const contract = contracts.find((c: any) => c.id === d.contractId);
    const product = products.find((p: any) => p.id === d.productId);
    const vendor = transportVendors.find((v: any) => v.id === d.transportVendorId);
    if (!contract || !product || !d.approvedVolumeM3) return d.costRecord;
    const rate = resolveFreightRate(freightRates as any, {
      transportVendorId: d.transportVendorId,
      projectId: contract.projectId,
      quarryId: d.quarryId,
      onDate: d.scheduledDate,
    });
    if (!rate) return d.costRecord;
    const qmc = resolveQuarryCost(quarryMaterialCosts as any, d.quarryId, d.productId, d.scheduledDate);
    const materialCostPerM3 = qmc?.costPerM3 ?? (product as any).defaultMaterialCost;
    const isAllIn = (rate as any).pricingModel === 'ALL_IN' || (rate as any).isAllInclusiveMaterial || (vendor as any)?.supplyType === 'MATERIAL_AND_TRANSPORT';
    try {
      const res = calculateDeliveryFinance({
        deliveryId: d.id,
        approvedVolumeM3: d.approvedVolumeM3,
        loadedVolumeM3: d.loadedVolumeM3,
        approvedWeightKg: d.approvedWeightKg,
        sellingPricePerM3: (contract as any).unitPricePerM3,
        materialCostPerM3,
        freightPricingModel: isAllIn ? 'ALL_IN' : (((vendor as any)?.defaultPricingModel as any) || (rate as any).pricingModel as any),
        freightRatePerUnit: (rate as any).ratePerUnit,
        allInPricePerM3: isAllIn ? (rate as any).ratePerUnit : undefined,
        allInVolumeBasis: isAllIn ? 'PER_M3_RECEIVED' : undefined,
        otherOperationalCostPerM3: 5000,
        tollFee: isAllIn ? 0 : ((rate as any).tollFee as any) || 0,
        loadingFee: isAllIn ? 0 : ((rate as any).loadingFee as any) || 0,
        unloadingFee: isAllIn ? 0 : ((rate as any).unloadingFee as any) || 0,
        isActualFinalized: true,
      });
      return res.costRecord;
    } catch {
      return d.costRecord;
    }
  }

  // Aggregations — identik Laporan Komprehensif (berbasis filteredDeliveries)
  const totalApprovedVol = filteredDeliveries.reduce(
    (sum, d) => sum + (d.approvedVolumeM3 || 0),
    0
  );
  const totalNetWeightTons =
    filteredDeliveries.reduce((sum, d) => sum + (d.approvedWeightKg || 0), 0) / 1000;

  const totalRevenue = filteredDeliveries.reduce((sum, d) => {
    if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return sum;
    const c = getDynamicCost(d);
    return sum + (c?.recognizedRevenueIdr || 0);
  }, 0);
  const totalHpp = filteredDeliveries.reduce((sum, d) => {
    if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return sum;
    const c = getDynamicCost(d);
    return sum + (c?.totalHppIdr || 0);
  }, 0);
  const totalGrossProfit = totalRevenue - totalHpp;
  const avgGrossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  const varianceExceededCount = filteredDeliveries.filter(
    (d) => d.reconciliation?.varianceStatus === 'ABOVE_TOLERANCE'
  ).length;

  // Export CSV 15 kolom — respects current filters (identik Laporan Komprehensif)
  const handleExport = () => {
    try {
      const rows = filteredDeliveries
        .filter((d) => d.approvedVolumeM3 > 0)
        .map((d) => ({ d, cr: getDynamicCost(d) }))
        .filter(({ cr }) => !!cr)
        .map(({ d, cr }) => {
          const quarry = quarries.find((q: any) => q.id === d.quarryId);
          const vehicle = vehicles.find((v: any) => v.id === d.vehicleId);
          const vendor = transportVendors.find((v: any) => v.id === d.transportVendorId);
          const cust = customers.find((c: any) => c.id === contracts.find((co: any) => co.id === d.contractId)?.customerId);
          const proj = projects.find((p: any) => p.id === contracts.find((co: any) => co.id === d.contractId)?.projectId);
          return {
            'NO. SURAT JALAN': d.deliveryNumber,
            'TANGGAL': d.scheduledDate,
            'JENIS MATERIAL': products.find((p: any) => p.id === d.productId)?.name || '',
            'PELANGGAN': cust?.name || '',
            'TUJUAN PROYEK': proj?.name || '',
            'VOL LOADING (m³)': (d as any).loadedVolumeM3,
            'VOL (M³)': (d as any).approvedVolumeM3,
            'SUMBER QUARRY': quarry?.name || '',
            'PLAT NOMOR': vehicle?.plateNumber || (d as any).driverName || '',
            'VENDOR ARMADA': vendor?.name || '',
            'PENDAPATAN JUAL (IDR)': (cr as any).recognizedRevenueIdr,
            'BIAYA MATERIAL (IDR)': (cr as any).totalMaterialCostIdr,
            'ONGKOS ANGKUT (IDR)': (cr as any).totalFreightCostIdr,
            'TOTAL HPP (IDR)': (cr as any).totalHppIdr,
            'LABA KOTOR (IDR)': (cr as any).grossProfitIdr,
            'GROSS MARGIN (%)': (cr as any).grossMarginPercent,
          };
        });
      if (rows.length === 0) {
        toast.error('Tidak ada data untuk diekspor (filter kosong)');
        return;
      }
      const headers = Object.keys(rows[0]!);
      const csv =
        [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `REV_BUMI_HPP_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Ledger HPP berhasil diunduh — ${rows.length} baris (satuan baku)`);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal ekspor CSV');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Filter Parameters — identik Laporan Komprehensif */}
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

      {/* KPI Metrics Ribbon — identik Laporan Komprehensif */}
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

      {/* Main Ledger Table Container — identik Laporan Komprehensif */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Analisis HPP &amp; Margin Laba Kotor
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground font-medium">
              Menampilkan {filteredDeliveries.length} data record
            </span>
            <Button size="sm" onClick={handleExport} className="h-7 text-xs gap-1 bg-emerald-700 hover:bg-emerald-800">
              <Download className="w-3.5 h-3.5" /> Unduh Ledger (CSV Baku)
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
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
                const cost = getDynamicCost(d);
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
                    <TableCell className="py-2.5 px-2.5 font-mono text-[10px]">{formatDate(d.scheduledDate)}</TableCell>
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
                        {proj?.code || proj?.name?.slice(0, 12) || '-'}
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
                        {vendor?.code || vendor?.name?.split(' ')[0] || '-'}
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
        </CardContent>
      </Card>
    </div>
  );
};
