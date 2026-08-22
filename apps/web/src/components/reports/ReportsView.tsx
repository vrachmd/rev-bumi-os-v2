import React, { useState } from 'react';
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
    exportToCsv,
  } = useApp();

  const [selectedReportType, setSelectedReportType] = useState<
    'deliveries' | 'reconciliation' | 'finance' | 'contracts' | 'invoices'
  >('deliveries');

  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
  const [selectedQuarryId, setSelectedQuarryId] = useState('ALL');
  const [selectedProductId, setSelectedProductId] = useState('ALL');
  const [dateRange, setDateRange] = useState({
    start: '2026-03-01',
    end: '2026-04-30',
  });

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

  // Aggregations
  const totalApprovedVol = filteredDeliveries.reduce(
    (sum, d) => sum + (d.approvedVolumeM3 || 0),
    0
  );
  const totalLoadedVol = filteredDeliveries.reduce(
    (sum, d) => sum + (d.loadedVolumeM3 || 0),
    0
  );
  const totalNetWeightTons =
    filteredDeliveries.reduce((sum, d) => sum + (d.approvedWeightKg || 0), 0) / 1000;

  const totalRevenue = filteredDeliveries.reduce(
    (sum, d) => sum + (d.costRecord?.recognizedRevenueIdr || 0),
    0
  );
  const totalHpp = filteredDeliveries.reduce(
    (sum, d) => sum + (d.costRecord?.totalHppIdr || 0),
    0
  );
  const totalGrossProfit = totalRevenue - totalHpp;
  const avgGrossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  const varianceExceededCount = filteredDeliveries.filter(
    (d) => d.reconciliation?.varianceStatus === 'ABOVE_TOLERANCE'
  ).length;

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

          <Button
            size="sm"
            onClick={() => {
              try {
                exportToCsv(selectedReportType);
                toast.success('CSV berhasil diunduh');
              } catch (e: any) {
                toast.error(e?.message || 'Gagal ekspor CSV');
              }
            }}
            className="w-full md:w-auto shrink-0 bg-emerald-700 hover:bg-emerald-800"
          >
            <Download className="w-4 h-4" /> Unduh Laporan (CSV Baku)
          </Button>
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
            {selectedReportType === 'finance' && 'Struktur HPP (Biaya Material, Ongkos Angkut) & Margin Laba'}
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
                  <TableHead className="py-3 px-3.5">No. Surat Jalan</TableHead>
                  <TableHead className="py-3 px-3 text-right">Vol (m³)</TableHead>
                  <TableHead className="py-3 px-3 text-right">Pendapatan Jual</TableHead>
                  <TableHead className="py-3 px-3 text-right">Biaya Material</TableHead>
                  <TableHead className="py-3 px-3 text-right">Ongkos Angkut</TableHead>
                  <TableHead className="py-3 px-3 text-right">Total HPP</TableHead>
                  <TableHead className="py-3 px-3 text-right">Laba Kotor</TableHead>
                  <TableHead className="py-3 px-3 text-right">Gross Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDeliveries.map((d) => {
                  const cost = d.costRecord;
                  if (!cost) return null;

                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/80">
                      <TableCell className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {d.deliveryNumber}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatVolumeM3(d.approvedVolumeM3, false)}
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
