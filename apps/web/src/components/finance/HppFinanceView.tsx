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

export const HppFinanceView: React.FC = () => {
  const { deliveries, products, contracts, customers, projects, quarries, vehicles, transportVendors, exportToCsv } = useApp() as any;
  const [searchTerm, setSearchTerm] = useState('');

  // Total summary
  const totalRevenue = deliveries.reduce((sum, d) => sum + (d.costRecord?.recognizedRevenueIdr || 0), 0);
  const totalMaterialCost = deliveries.reduce((sum, d) => sum + (d.costRecord?.totalMaterialCostIdr || 0), 0);
  const totalFreightCost = deliveries.reduce((sum, d) => sum + (d.costRecord?.totalFreightCostIdr || 0), 0);
  const totalOperationalCost = deliveries.reduce((sum, d) => sum + (d.costRecord?.otherOperationalCostIdr || 0), 0);
  const totalHpp = deliveries.reduce((sum, d) => sum + (d.costRecord?.totalHppIdr || 0), 0);
  const totalGrossProfit = totalRevenue - totalHpp;
  const overallMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                try {
                  exportToCsv('finance');
                  toast.success('Ledger HPP diekspor');
                } catch (e: any) {
                  toast.error(e?.message || 'Gagal ekspor');
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
            >
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
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase tracking-wider">Total Pendapatan</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalRevenue)}</span>
            <span className="text-[10px] text-white/60 mt-1 block">{filteredDeliveries.length} ritase • Approved</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase tracking-wider">Biaya Material</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalMaterialCost)}</span>
            <span className="text-[10px] text-white/60 mt-1 block">Quarry × {(totalMaterialCost / (totalRevenue || 1) * 100).toFixed(0)}% dari HPP</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase tracking-wider">Biaya Angkut</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalFreightCost)}</span>
            <span className="text-[10px] text-white/60 mt-1 block">Vendor • {((totalFreightCost / (totalHpp || 1)) * 100).toFixed(0)}% HPP</span>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase tracking-wider">Biaya Operasional</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalOperationalCost)}</span>
            <span className="text-[10px] text-white/60 mt-1 block">5rb/m³ • Site handling</span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <span className="text-[10px] text-amber-300 block font-semibold uppercase tracking-wider">Total HPP</span>
            <span className="text-base font-bold font-mono text-amber-200 mt-1 block">{formatIDR(totalHpp)}</span>
            <span className="text-[10px] text-amber-200/70 mt-1 block">Material+Angkut+Ops</span>
          </div>
          <div className="p-3 bg-emerald-500 text-slate-900 rounded-lg border border-emerald-400">
            <span className="text-[10px] text-slate-900/70 block uppercase font-bold tracking-wider">Laba Kotor ({formatPercent(overallMargin)})</span>
            <span className="text-base font-extrabold font-mono mt-1 block">{formatIDR(totalGrossProfit)}</span>
            <span className="text-[10px] text-slate-900/60 mt-1 block">Pendapatan − HPP</span>
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
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">No. Surat Jalan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Tanggal</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Jenis Material</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Pelanggan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Tujuan Proyek</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Vol Loading (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Vol (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Sumber Quarry</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Plat Nomor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Vendor Armada</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Pendapatan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Biaya Material</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Biaya Angkut</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Total HPP</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Laba Kotor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Margin (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-muted font-medium">
              {filteredDeliveries.map((d) => {
                const product = products.find((p) => p.id === d.productId);
                const contract = contracts.find((c: any) => c.id === d.contractId);
                const customer = customers.find((c: any) => c.id === contract?.customerId);
                const project = projects.find((p: any) => p.id === contract?.projectId);
                const quarry = quarries.find((q: any) => q.id === d.quarryId);
                const vehicle = vehicles.find((v: any) => v.id === d.vehicleId);
                const vendor = transportVendors.find((v: any) => v.id === d.transportVendorId);
                const cost = d.costRecord as any;

                if (!cost) {
                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/70">
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
                      <TableCell colSpan={5} className="py-3 px-3 text-center text-slate-400">
                        Menunggu finalisasi kalkulasi HPP
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={d.id} className="hover:bg-muted/50">
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
                    <TableCell className="py-3 px-3">{product?.name}</TableCell>
                    <TableCell className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatVolumeM3(d.approvedVolumeM3, false)}
                    </TableCell>
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
