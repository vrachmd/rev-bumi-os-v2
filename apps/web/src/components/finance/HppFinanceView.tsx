// @ts-nocheck
import React, { useState } from 'react';
import { TrendingUp, DollarSign, Layers, PieChart, ArrowUpRight, Search, Download, Calculator, Truck, Package, Scale } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIDR, formatPercent, formatVolumeM3, formatDate } from '../../lib/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { calculateDeliveryFinance } from '../../engine/finance.engine';
import { resolveFreightRate } from '../../lib/freightRate';
import { resolveQuarryCost } from '../../lib/quarryCost';

export const HppFinanceView: React.FC = () => {
  const { deliveries, products, contracts, customers, projects, quarries, vehicles, transportVendors, freightRates, quarryMaterialCosts, exportToCsv } = useApp() as any;
  const [searchTerm, setSearchTerm] = useState('');

  const getDynamicCost = (d: any) => {
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
    const qmc = (quarryMaterialCosts as any[]).find((q: any) => q.quarryId === d.quarryId && q.productId === d.productId);
    const mat = qmc?.costPerM3 ?? (product as any).defaultMaterialCost;
    const isAllIn = (rate as any).pricingModel === 'ALL_IN' || (rate as any).isAllInclusiveMaterial || (vendor as any)?.supplyType === 'MATERIAL_AND_TRANSPORT';
    try {
      const res = calculateDeliveryFinance({
        deliveryId: d.id,
        approvedVolumeM3: d.approvedVolumeM3,
        loadedVolumeM3: d.loadedVolumeM3,
        approvedWeightKg: d.approvedWeightKg,
        sellingPricePerM3: (contract as any).unitPricePerM3,
        materialCostPerM3: mat,
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
  };

  // Total summary — sinkron dengan Laporan HPP (dinamis, filter approved>0)
  const totalRevenue = deliveries.reduce((sum: number, d: any) => {
    if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return sum;
    const c = getDynamicCost(d);
    return sum + (c?.recognizedRevenueIdr || 0);
  }, 0);
  const totalMaterialCost = deliveries.reduce((sum: number, d: any) => {
    if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return sum;
    const c = getDynamicCost(d);
    return sum + (c?.totalMaterialCostIdr || 0);
  }, 0);
  const totalFreightCost = deliveries.reduce((sum: number, d: any) => {
    if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return sum;
    const c = getDynamicCost(d);
    return sum + (c?.totalFreightCostIdr || 0);
  }, 0);
  const totalOperationalCost = deliveries.reduce((sum: number, d: any) => {
    if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return sum;
    const c = getDynamicCost(d);
    return sum + (c?.otherOperationalCostIdr || 0);
  }, 0);
  const totalHpp = deliveries.reduce((sum: number, d: any) => {
    if (!d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) return sum;
    const c = getDynamicCost(d);
    return sum + (c?.totalHppIdr || 0);
  }, 0);
  const totalGrossProfit = totalRevenue - totalHpp;
  const overallMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  const handleExport = () => {
    const rows = filteredDeliveries
      .filter((d: any) => d.approvedVolumeM3 > 0)
      .map((d: any) => ({ d, cr: getDynamicCost(d) }))
      .filter(({ cr }: any) => !!cr)
      .map(({ d, cr }: any) => {
        const quarry = quarries.find((q: any) => q.id === d.quarryId);
        const vehicle = vehicles.find((v: any) => v.id === d.vehicleId);
        const vendor = transportVendors.find((v: any) => v.id === d.transportVendorId);
        const contract = contracts.find((c: any) => c.id === d.contractId);
        const cust = customers.find((c: any) => c.id === contract?.customerId);
        const proj = projects.find((p: any) => p.id === contract?.projectId);
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
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const headers = Object.keys(rows[0]!);
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REV_BUMI_HPP_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`HPP diekspor — ${rows.length} baris`);
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const product = products.find((p) => p.id === d.productId);
    const contract = contracts.find((c) => c.id === d.contractId);
    return (
      d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract?.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Financial KPIs Banner — Polish Analisis HPP & Margin Laba Kotor */}
      <Card className="bg-[#003C16] text-white border-[#002B10] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <Calculator className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <CardTitle className="text-white text-base tracking-tight">Analisis HPP & Margin Laba Kotor</CardTitle>
                <CardDescription className="text-emerald-200/80 text-xs">
                  Kalkulasi HPP = Biaya Material + Ongkos Angkut + Biaya Operasional — Satuan Baku m³ & IDR
                </CardDescription>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport} className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5">
              <Download className="w-3.5 h-3.5" /> Ekspor Ledger HPP (CSV)
            </Button>
          </div>
          {/* Formula visual */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono bg-white/5 border border-white/10 rounded-lg p-2.5">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30">
              <Package className="w-3 h-3 text-emerald-300" /> Biaya Material
            </span>
            <span className="text-white/60">+</span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-sky-500/20 border border-sky-500/30">
              <Truck className="w-3 h-3 text-sky-300" /> Ongkos Angkut
            </span>
            <span className="text-white/60">+</span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30">
              <Scale className="w-3 h-3 text-amber-300" /> Biaya Operasional
            </span>
            <span className="text-white/60">=</span>
            <span className="px-2 py-1 rounded bg-amber-400 text-slate-900 font-bold">Total HPP</span>
            <span className="text-white/60">→</span>
            <span className="px-2 py-1 rounded bg-emerald-500 text-slate-900 font-bold">Laba Kotor = Pendapatan − HPP</span>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 bg-white/[0.06] rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
            <span className="text-[10px] text-emerald-300/90 block font-semibold uppercase tracking-widest">Total Pendapatan</span>
            <span className="text-base font-bold font-mono mt-1.5 block tracking-tight">{formatIDR(totalRevenue)}</span>
            <span className="text-[11px] text-white/60 mt-1 block">{filteredDeliveries.length} ritase • Approved</span>
          </div>
          <div className="p-4 bg-white/[0.06] rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
            <span className="text-[10px] text-emerald-300/90 block font-semibold uppercase tracking-widest">Biaya Material</span>
            <span className="text-base font-bold font-mono mt-1.5 block tracking-tight">{formatIDR(totalMaterialCost)}</span>
            <span className="text-[11px] text-white/60 mt-1 block">Quarry • {((totalMaterialCost / (totalHpp || 1)) * 100).toFixed(0)}% HPP</span>
          </div>
          <div className="p-4 bg-white/[0.06] rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
            <span className="text-[10px] text-emerald-300/90 block font-semibold uppercase tracking-widest">Biaya Angkut</span>
            <span className="text-base font-bold font-mono mt-1.5 block tracking-tight">{formatIDR(totalFreightCost)}</span>
            <span className="text-[11px] text-white/60 mt-1 block">Vendor • {((totalFreightCost / (totalHpp || 1)) * 100).toFixed(0)}% HPP</span>
          </div>
          <div className="p-4 bg-white/[0.06] rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] transition-colors">
            <span className="text-[10px] text-emerald-300/90 block font-semibold uppercase tracking-widest">Biaya Operasional</span>
            <span className="text-base font-bold font-mono mt-1.5 block tracking-tight">{formatIDR(totalOperationalCost)}</span>
            <span className="text-[11px] text-white/60 mt-1 block">5rb/m³ • Site</span>
          </div>
          <div className="p-4 bg-amber-500/[0.12] rounded-xl border border-amber-500/20 backdrop-blur-sm">
            <span className="text-[10px] text-amber-300/90 block font-semibold uppercase tracking-widest">Total HPP</span>
            <span className="text-base font-bold font-mono text-amber-200 mt-1.5 block tracking-tight">{formatIDR(totalHpp)}</span>
            <span className="text-[11px] text-amber-200/70 mt-1 block">Material+Angkut+Ops</span>
          </div>
          <div className="p-4 bg-emerald-400 text-slate-900 rounded-xl border border-emerald-300 shadow-lg shadow-emerald-900/20">
            <span className="text-[10px] text-slate-900/70 block uppercase font-bold tracking-widest">Laba Kotor ({formatPercent(overallMargin)})</span>
            <span className="text-base font-extrabold font-mono mt-1.5 block tracking-tight">{formatIDR(totalGrossProfit)}</span>
            <span className="text-[11px] text-slate-900/60 mt-1 block">Pendapatan − HPP</span>
          </div>
        </CardContent>
      </Card>

      {/* Filter — shadcn Card + Input */}
      <Card className="py-3">
        <CardContent className="p-0 px-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Cari No Surat Jalan, Kontrak..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table Breakdown — shadcn Card + Table — 15 kolom sinkron Laporan */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="py-3 px-2.5">No. SJ</TableHead>
                <TableHead className="py-3 px-2.5">Tgl</TableHead>
                <TableHead className="py-3 px-2.5">Mat.</TableHead>
                <TableHead className="py-3 px-2.5">Cust.</TableHead>
                <TableHead className="py-3 px-2.5">Proyek</TableHead>
                <TableHead className="py-3 px-2.5 text-right">Vol Load</TableHead>
                <TableHead className="py-3 px-2.5 text-right">Vol App</TableHead>
                <TableHead className="py-3 px-2.5">Quarry</TableHead>
                <TableHead className="py-3 px-2.5">Plat</TableHead>
                <TableHead className="py-3 px-2.5">Vendor</TableHead>
                <TableHead className="py-3 px-2.5 text-right">Pendapatan</TableHead>
                <TableHead className="py-3 px-2.5 text-right">Mat.</TableHead>
                <TableHead className="py-3 px-2.5 text-right">Angkut</TableHead>
                <TableHead className="py-3 px-2.5 text-right">HPP</TableHead>
                <TableHead className="py-3 px-2.5 text-right">Laba</TableHead>
                <TableHead className="py-3 px-2.5 text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-muted font-medium">
              {filteredDeliveries.map((d: any, idx: number) => {
                const product = products.find((p: any) => p.id === d.productId);
                const contract = contracts.find((c: any) => c.id === d.contractId);
                const customer = customers.find((c: any) => c.id === contract?.customerId);
                const project = projects.find((p: any) => p.id === contract?.projectId);
                const quarry = quarries.find((q: any) => q.id === d.quarryId);
                const vehicle = vehicles.find((v: any) => v.id === d.vehicleId);
                const vendor = transportVendors.find((v: any) => v.id === d.transportVendorId);
                const cost = getDynamicCost(d) as any;

                if (!cost || !d.approvedVolumeM3 || d.approvedVolumeM3 <= 0) {
                  return (
                    <TableRow key={d.id} className={`hover:bg-muted/40 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                      <TableCell className="py-3 px-3.5 font-bold font-mono">{d.deliveryNumber}</TableCell>
                      <TableCell className="py-3 px-3 font-mono text-[11px]">{formatDate(d.scheduledDate)}</TableCell>
                      <TableCell className="py-3 px-3">{product?.name}</TableCell>
                      <TableCell className="py-3 px-3">{customer?.name || '-'}</TableCell>
                      <TableCell className="py-3 px-3">{project?.name || '-'}</TableCell>
                      <TableCell className="py-3 px-3 text-right font-mono">{formatVolumeM3(d.loadedVolumeM3, false)}</TableCell>
                      <TableCell className="py-3 px-3 text-right font-mono">{formatVolumeM3(d.approvedVolumeM3, false)}</TableCell>
                      <TableCell className="py-3 px-3">{quarry?.name || '-'}</TableCell>
                      <TableCell className="py-3 px-3 font-mono">{vehicle?.plateNumber || '-'}</TableCell>
                      <TableCell className="py-3 px-3">{vendor?.name || '-'}</TableCell>
                      <TableCell colSpan={5} className="py-3 px-3 text-center text-muted-foreground">
                        Menunggu finalisasi kalkulasi HPP
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={d.id} className={`hover:bg-muted/40 transition-colors ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                    <TableCell className="py-3 px-3.5 font-bold font-mono">{d.deliveryNumber}</TableCell>
                    <TableCell className="py-3 px-3 font-mono text-[11px]">{formatDate(d.scheduledDate)}</TableCell>
                    <TableCell className="py-3 px-3">{product?.name}</TableCell>
                    <TableCell className="py-3 px-3">{customer?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-3">{project?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono text-slate-600">{formatVolumeM3(d.loadedVolumeM3, false)}</TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono font-bold">{formatVolumeM3(d.approvedVolumeM3, false)}</TableCell>
                    <TableCell className="py-3 px-3">{quarry?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-3 font-mono">{vehicle?.plateNumber || '-'}</TableCell>
                    <TableCell className="py-3 px-3">{vendor?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatIDR(cost.recognizedRevenueIdr)}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono text-slate-600">
                      {cost.pricingBasis === 'ALL_IN' ? (
                        <span className="inline-flex flex-col items-end gap-0.5">
                          <span>{formatIDR(cost.totalMaterialCostIdr)}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            ALL-IN {cost.allInPricePerM3 ? `${formatIDR(cost.allInPricePerM3)}/m³` : ''}
                          </span>
                        </span>
                      ) : (
                        formatIDR(cost.totalMaterialCostIdr)
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono text-slate-600">
                      {cost.pricingBasis === 'ALL_IN' ? (
                        <span className="text-slate-400">— (include)</span>
                      ) : (
                        formatIDR(cost.totalFreightCostIdr)
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatIDR(cost.otherOperationalCostIdr)}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono font-bold text-amber-900">
                      {formatIDR(cost.totalHppIdr)}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                      {formatIDR(cost.grossProfitIdr)}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono font-extrabold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          cost.grossMarginPercent >= 20
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {formatPercent(cost.grossMarginPercent)}
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
