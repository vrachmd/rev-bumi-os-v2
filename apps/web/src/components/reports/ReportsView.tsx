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
      {/* Top Selector & Export Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedReportType('deliveries')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedReportType === 'deliveries'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Laporan Pengiriman & SJ
          </button>
          <button
            onClick={() => setSelectedReportType('reconciliation')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedReportType === 'reconciliation'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Laporan Rekonsiliasi Volume m³
          </button>
          <button
            onClick={() => setSelectedReportType('finance')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedReportType === 'finance'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Laporan HPP & Profitabilitas
          </button>
          <button
            onClick={() => setSelectedReportType('contracts')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedReportType === 'contracts'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Monitoring Kontrak & Burn Rate
          </button>
        </div>

        <button
          onClick={() => exportToCsv(selectedReportType)}
          className="w-full md:w-auto px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors shrink-0"
        >
          <Download className="w-4 h-4" /> Unduh Laporan (CSV Baku)
        </button>
      </div>

      {/* Filter Parameters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-slate-600 font-semibold block mb-1">Pelanggan / Kontraktor:</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] bg-slate-50 font-medium outline-hidden"
          >
            <option value="ALL">Semua Pelanggan ({customers.length})</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-600 font-semibold block mb-1">Sumber Quarry:</label>
          <select
            value={selectedQuarryId}
            onChange={(e) => setSelectedQuarryId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] bg-slate-50 font-medium outline-hidden"
          >
            <option value="ALL">Semua Sumber Quarry</option>
            {quarries.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-600 font-semibold block mb-1">Jenis Agregat / Material:</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] bg-slate-50 font-medium outline-hidden"
          >
            <option value="ALL">Semua Produk Material</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-600 font-semibold block mb-1">Rentang Tanggal:</label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-1/2 px-2 py-1 border border-slate-200 rounded-md text-[11px] font-mono bg-slate-50"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-1/2 px-2 py-1 border border-slate-200 rounded-md text-[11px] font-mono bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Volume Approved
          </span>
          <p className="text-xl font-black text-slate-900 mt-1 font-mono">
            {formatVolumeM3(totalApprovedVol)}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Setara ± {totalNetWeightTons.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ton
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Nilai Penjualan
          </span>
          <p className="text-xl font-black text-[#003C16] mt-1 font-mono">
            {formatIDR(totalRevenue)}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Dari {filteredDeliveries.length} ritase surat jalan
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Laba Kotor & Margin Rata-Rata
          </span>
          <p className="text-xl font-black text-emerald-800 mt-1 font-mono">
            {formatIDR(totalGrossProfit)}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
            Margin: {avgGrossMargin.toFixed(1)}% (Target &gt; 25%)
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Penyimpangan Volume Di Luar Toleransi
          </span>
          <p className="text-xl font-black text-amber-700 mt-1 font-mono">
            {varianceExceededCount} Ritase
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {varianceExceededCount > 0 ? 'Perlu approval revisi QS' : 'Semua dalam toleransi baku'}
          </span>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {selectedReportType === 'deliveries' && 'Detail Rekapitulasi Surat Jalan & Pengiriman'}
            {selectedReportType === 'reconciliation' && 'Hasil Rekonsiliasi & Audit Selisih Volume (m³)'}
            {selectedReportType === 'finance' && 'Struktur HPP (Biaya Material, Ongkos Angkut) & Margin Laba'}
            {selectedReportType === 'contracts' && 'Status Realisasi & Sisa Alokasi Kontrak'}
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Menampilkan {filteredDeliveries.length} data record
          </span>
        </div>

        <div className="overflow-x-auto">
          {selectedReportType === 'deliveries' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3.5">No. Surat Jalan</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Pelanggan & Proyek</th>
                  <th className="py-3 px-3">Material Agregat</th>
                  <th className="py-3 px-3">Quarry Asal</th>
                  <th className="py-3 px-3 text-right">Vol. Loading</th>
                  <th className="py-3 px-3 text-right">Vol. Approved</th>
                  <th className="py-3 px-3">Status Ritase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDeliveries.map((d) => {
                  const contract = contracts.find((c) => c.id === d.contractId);
                  const cust = customers.find((c) => c.id === contract?.customerId);
                  const proj = projects.find((p) => p.id === contract?.projectId);
                  const prod = products.find((p) => p.id === d.productId);
                  const qry = quarries.find((q) => q.id === d.quarryId);

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {d.deliveryNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {formatDate(d.scheduledDate)}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">{cust?.name}</p>
                        <p className="text-[11px] text-slate-500">{proj?.name}</p>
                      </td>
                      <td className="py-2.5 px-3">{prod?.name}</td>
                      <td className="py-2.5 px-3">{qry?.locationName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-600">
                        {formatVolumeM3(d.loadedVolumeM3, false)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#003C16]">
                        {formatVolumeM3(d.approvedVolumeM3, false)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {selectedReportType === 'reconciliation' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3.5">No. Surat Jalan</th>
                  <th className="py-3 px-3 text-right">Vol. Muat (m³)</th>
                  <th className="py-3 px-3 text-right">Vol. Terima (m³)</th>
                  <th className="py-3 px-3 text-right">Selisih Fisik</th>
                  <th className="py-3 px-3 text-right">% Selisih</th>
                  <th className="py-3 px-3">Status Toleransi</th>
                  <th className="py-3 px-3">Alasan / Penyebab</th>
                  <th className="py-3 px-3 text-right">Vol. Tagih Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDeliveries.map((d) => {
                  const rec = d.reconciliation;
                  const variancePct = rec?.variancePercentage || 0;
                  const isExceeded = rec?.varianceStatus === 'ABOVE_TOLERANCE';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {d.deliveryNumber}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatVolumeM3(d.loadedVolumeM3, false)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatVolumeM3(d.receivedVolumeM3, false)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          (rec?.physicalVarianceM3 || 0) < 0 ? 'text-rose-700' : 'text-slate-700'
                        }`}
                      >
                        {(rec?.physicalVarianceM3 || 0) > 0 ? '+' : ''}
                        {(rec?.physicalVarianceM3 || 0).toFixed(2)} m³
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span
                          className={`font-bold ${
                            isExceeded ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {variancePct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isExceeded
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rec?.varianceStatus || 'WITHIN_TOLERANCE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {rec?.varianceReason || 'PHYSICAL_LOSS'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#003C16]">
                        {formatVolumeM3(d.approvedVolumeM3, false)} m³
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {selectedReportType === 'finance' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3.5">No. Surat Jalan</th>
                  <th className="py-3 px-3 text-right">Vol (m³)</th>
                  <th className="py-3 px-3 text-right">Pendapatan Jual</th>
                  <th className="py-3 px-3 text-right">Biaya Material</th>
                  <th className="py-3 px-3 text-right">Ongkos Angkut</th>
                  <th className="py-3 px-3 text-right">Total HPP</th>
                  <th className="py-3 px-3 text-right">Laba Kotor</th>
                  <th className="py-3 px-3 text-right">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDeliveries.map((d) => {
                  const cost = d.costRecord;
                  if (!cost) return null;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {d.deliveryNumber}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {formatVolumeM3(d.approvedVolumeM3, false)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatIDR(cost.recognizedRevenueIdr)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatIDR(cost.totalMaterialCostIdr)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatIDR(cost.totalFreightCostIdr)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800">
                        {formatIDR(cost.totalHppIdr)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                        {formatIDR(cost.grossProfitIdr)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            cost.grossMarginPercent >= 25
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cost.grossMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {selectedReportType === 'contracts' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3.5">No. Kontrak</th>
                  <th className="py-3 px-3">Pelanggan & Proyek</th>
                  <th className="py-3 px-3">Material</th>
                  <th className="py-3 px-3 text-right">Volume Kontrak</th>
                  <th className="py-3 px-3 text-right">Realisasi Approved</th>
                  <th className="py-3 px-3 text-right">Sisa Kuota</th>
                  <th className="py-3 px-3 text-right">Burn Rate</th>
                  <th className="py-3 px-3">Status Kontrak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
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
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {c.contractNumber}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{cust?.name}</p>
                        <p className="text-[11px] text-slate-500">{proj?.name}</p>
                      </td>
                      <td className="py-3 px-3">{prod?.name}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {isNonPo ? 'Rutin' : `${formatVolumeM3(c.contractedVolumeM3, false)} m³`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-[#003C16]">
                        {formatVolumeM3(fulfilledM3, false)} m³
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {isNonPo ? 'Rutin' : `${formatVolumeM3(remainingM3, false)} m³`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
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
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {c.status}
                        </span>
                        {isNonPo && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 ml-1">
                            Non-PO
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
