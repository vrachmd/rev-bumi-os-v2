import React, { useState } from 'react';
import { TrendingUp, DollarSign, Layers, PieChart, ArrowUpRight, Search, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIDR, formatPercent, formatVolumeM3, formatDate } from '../../lib/formatters';

export const HppFinanceView: React.FC = () => {
  const { deliveries, products, contracts, customers, projects, exportToCsv } = useApp();
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
      {/* Financial KPIs Banner */}
      <div className="bg-[#003C16] text-white rounded-lg p-5 border border-[#002B10] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-900 pb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">
              HPP (Harga Pokok Penjualan) & Ledger Laba Kotor
            </h2>
            <p className="text-xs text-emerald-200/80">
              Perhitungan HPP berbasis Volume Disetujui (Approved m³): HPP = Biaya Material + Biaya Angkut + Biaya Operasional. Model ALL_IN: harga vendor sudah mencakup material + angkut (dasar m³ diterima di site).
            </p>
          </div>
          <button
            onClick={() => exportToCsv('finance')}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Ekspor Ledger HPP (CSV)
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 bg-white/5 rounded border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase">Total Pendapatan</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalRevenue)}</span>
          </div>
          <div className="p-3 bg-white/5 rounded border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase">Biaya Material</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalMaterialCost)}</span>
          </div>
          <div className="p-3 bg-white/5 rounded border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase">Biaya Angkut</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalFreightCost)}</span>
          </div>
          <div className="p-3 bg-white/5 rounded border border-white/10">
            <span className="text-[10px] text-emerald-300 block font-semibold uppercase">Biaya Operasional</span>
            <span className="text-base font-bold font-mono mt-1 block">{formatIDR(totalOperationalCost)}</span>
          </div>
          <div className="p-3 bg-white/5 rounded border border-white/10">
            <span className="text-[10px] text-amber-300 block font-semibold uppercase">Total HPP</span>
            <span className="text-base font-bold font-mono text-amber-200 mt-1 block">{formatIDR(totalHpp)}</span>
          </div>
          <div className="p-3 bg-emerald-500 text-slate-900 rounded border border-emerald-400 font-bold">
            <span className="text-[10px] text-slate-900/80 block uppercase">Laba Kotor ({formatPercent(overallMargin)})</span>
            <span className="text-base font-extrabold font-mono mt-1 block">{formatIDR(totalGrossProfit)}</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No Surat Jalan, Kontrak..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
          />
        </div>
      </div>

      {/* Table Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">No. Surat Jalan</th>
                <th className="py-3 px-3">Material</th>
                <th className="py-3 px-3 text-right">Approved (m³)</th>
                <th className="py-3 px-3 text-right">Pendapatan</th>
                <th className="py-3 px-3 text-right">Biaya Material</th>
                <th className="py-3 px-3 text-right">Biaya Angkut</th>
                <th className="py-3 px-3 text-right">Biaya Ops</th>
                <th className="py-3 px-3 text-right">Total HPP</th>
                <th className="py-3 px-3 text-right">Laba Kotor</th>
                <th className="py-3 px-3 text-right">Margin (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredDeliveries.map((d) => {
                const product = products.find((p) => p.id === d.productId);
                const cost = d.costRecord;

                if (!cost) {
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3.5 font-bold font-mono">{d.deliveryNumber}</td>
                      <td className="py-3 px-3">{product?.name}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatVolumeM3(d.approvedVolumeM3, false)}</td>
                      <td colSpan={7} className="py-3 px-3 text-center text-slate-400">
                        Menunggu finalisasi kalkulasi HPP
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 font-bold font-mono text-slate-900">
                      {d.deliveryNumber}
                    </td>
                    <td className="py-3 px-3">{product?.name}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatVolumeM3(d.approvedVolumeM3, false)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatIDR(cost.recognizedRevenueIdr)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
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
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {cost.pricingBasis === 'ALL_IN' ? (
                        <span className="text-slate-400">— (include)</span>
                      ) : (
                        formatIDR(cost.totalFreightCostIdr)
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatIDR(cost.otherOperationalCostIdr)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-900">
                      {formatIDR(cost.totalHppIdr)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                      {formatIDR(cost.grossProfitIdr)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          cost.grossMarginPercent >= 20
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {formatPercent(cost.grossMarginPercent)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
