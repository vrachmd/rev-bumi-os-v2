import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Truck,
  DollarSign,
  FileBadge,
  Scale,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIDR, formatPercent, formatVolumeM3, formatDate } from '../../lib/formatters';
import { NavTab } from '../layout/Sidebar';

interface CockpitDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const CockpitDashboard: React.FC<CockpitDashboardProps> = ({ onNavigate }) => {
  const {
    deliveries,
    contracts,
    invoices,
    payments,
    currentProfile,
    products,
    customers,
  } = useApp();

  // Role permissions check
  const isFinanceVisible = ['SUPER_ADMIN', 'MANAGEMENT', 'FINANCE'].includes(currentProfile.role);

  // 1. Exception Lists ("What needs attention today?")
  const aboveToleranceDeliveries = deliveries.filter(
    (d) => d.reconciliation?.varianceStatus === 'ABOVE_TOLERANCE'
  );

  const pendingPodVerifications = deliveries.filter(
    (d) => d.status === 'POD_SUBMITTED' && !d.pod?.verifiedAt
  );

  const nearingContracts = contracts.filter((c) => {
    if (c.contractType === 'NON_PO') return false;
    const approved = deliveries
      .filter((d) => d.contractId === c.id && d.status === 'DELIVERED')
      .reduce((sum, d) => sum + d.approvedVolumeM3, 0);
    const pct = (approved / c.contractedVolumeM3) * 100;
    return pct >= 85;
  });

  const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE');

  // 2. Operational Metrics
  const activeDeliveries = deliveries.filter(
    (d) => d.status !== 'DELIVERED' && d.status !== 'CANCELLED' && d.status !== 'REJECTED'
  );
  const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length;

  const totalLoadedM3 = deliveries.reduce((sum, d) => sum + (d.loadedVolumeM3 || 0), 0);
  const totalReceivedM3 = deliveries.reduce((sum, d) => sum + (d.receivedVolumeM3 || 0), 0);
  const totalApprovedM3 = deliveries.reduce((sum, d) => sum + (d.approvedVolumeM3 || 0), 0);

  const totalPhysicalVarianceM3 = deliveries.reduce(
    (sum, d) => sum + (d.reconciliation?.physicalVarianceM3 || 0),
    0
  );
  const totalPotentialVarianceValueIdr = deliveries.reduce(
    (sum, d) => sum + (d.reconciliation?.potentialVarianceValueIdr || 0),
    0
  );

  // 3. Financial Metrics
  const totalRevenueIdr = deliveries.reduce(
    (sum, d) => sum + (d.costRecord?.recognizedRevenueIdr || 0),
    0
  );
  const totalMaterialCostIdr = deliveries.reduce(
    (sum, d) => sum + (d.costRecord?.totalMaterialCostIdr || 0),
    0
  );
  const totalFreightCostIdr = deliveries.reduce(
    (sum, d) => sum + (d.costRecord?.totalFreightCostIdr || 0),
    0
  );
  const totalHppIdr = deliveries.reduce(
    (sum, d) => sum + (d.costRecord?.totalHppIdr || 0),
    0
  );
  const totalGrossProfitIdr = totalRevenueIdr - totalHppIdr;
  const overallMarginPercent =
    totalRevenueIdr > 0 ? (totalGrossProfitIdr / totalRevenueIdr) * 100 : 0;

  const totalInvoicedIdr = invoices.reduce((sum, i) => sum + i.totalInvoiceIdr, 0);
  const totalPaidIdr = invoices.reduce((sum, i) => sum + i.totalPaidIdr, 0);
  const totalOutstandingIdr = invoices.reduce((sum, i) => sum + i.outstandingBalanceIdr, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Actionable Exception Cockpit: "What needs attention today?" */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#003C16]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Pusat Tindakan & Pengecualian Operasional
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Real-time Exception Queue
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Above Tolerance Deliveries */}
          <div
            onClick={() => onNavigate('reconciliation')}
            className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">
                Pengiriman di Atas Toleransi
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-900">
                {aboveToleranceDeliveries.length}
              </span>
            </div>
            <p className="text-xl font-extrabold text-amber-950 mt-1 font-mono">
              {aboveToleranceDeliveries.length} Tiket
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-amber-800">
              <span>Perlu Review QS / Lapangan</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Pending POD Verifications */}
          <div
            onClick={() => onNavigate('deliveries')}
            className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900">
                POD Menunggu Verifikasi
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                {pendingPodVerifications.length}
              </span>
            </div>
            <p className="text-xl font-extrabold text-blue-950 mt-1 font-mono">
              {pendingPodVerifications.length} Berkas
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200/60 text-[11px] text-blue-800">
              <span>Periksa Tanda Tangan & GPS</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Nearing Contracts */}
          <div
            onClick={() => onNavigate('contracts')}
            className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900">
                Kontrak Kritis (&ge;85%)
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                {nearingContracts.length}
              </span>
            </div>
            <p className="text-xl font-extrabold text-emerald-950 mt-1 font-mono">
              {nearingContracts.length} Kontrak
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800">
              <span>Cek Limit & Adendum</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Overdue Invoices */}
          <div
            onClick={() => onNavigate('invoices')}
            className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-900">
                Faktur Jatuh Tempo (Overdue)
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                {overdueInvoices.length}
              </span>
            </div>
            <p className="text-xl font-extrabold text-rose-950 mt-1 font-mono">
              {overdueInvoices.length} Faktur
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-200/60 text-[11px] text-rose-800">
              <span>Follow up Piutang Proyek</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Operational & Quantity KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Loaded vs Approved Volume */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Volume Disetujui (m³)
            </span>
            <div className="p-1.5 rounded-md bg-[#003C16]/10 text-[#003C16]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {formatVolumeM3(totalApprovedM3)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>Loaded: {formatVolumeM3(totalLoadedM3, false)} m³</span>
            <span className="text-emerald-700 font-semibold">
              Realisasi {deliveredCount} Rit
            </span>
          </div>
        </div>

        {/* Physical Variance */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Selisih Fisik (m³)
            </span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-700">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {formatVolumeM3(totalPhysicalVarianceM3)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>Nilai Potensi:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {formatIDR(totalPotentialVarianceValueIdr)}
            </span>
          </div>
        </div>

        {/* Deliveries Status Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Armada Bergerak
            </span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {activeDeliveries.length} Truk Aktif
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>Terkirim Resmi:</span>
            <span className="font-bold text-emerald-700">{deliveredCount} Selesai</span>
          </div>
        </div>

        {/* Contract Capacity */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Komitmen Kontrak Aktif
            </span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-700">
              <FileBadge className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {contracts.length} Kontrak
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>Total Komitmen:</span>
            <span className="font-semibold text-slate-800">
              {formatVolumeM3(
                contracts.reduce((sum, c) => sum + (c.contractType === 'NON_PO' ? 0 : c.contractedVolumeM3), 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Executive Financial Overview (Protected by Role) */}
      {isFinanceVisible ? (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Ringkasan Finansial & HPP (Berdasarkan Approved Volume)
              </h3>
              <p className="text-xs text-slate-500">
                Laba kotor dihitung dari Pendapatan Diakui minus Total HPP Aktual
              </p>
            </div>
            <button
              onClick={() => onNavigate('hpp-finance')}
              className="text-xs font-semibold text-[#003C16] hover:text-[#002B10] flex items-center gap-1"
            >
              Lihat Ledger HPP <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Revenue */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Pendapatan Diakui
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {formatIDR(totalRevenueIdr)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Dari {formatVolumeM3(totalApprovedM3, false)} m³ approved
              </span>
            </div>

            {/* Material Cost */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Biaya Material Quarry
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {formatIDR(totalMaterialCostIdr)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Harga dasar quarry/m³
              </span>
            </div>

            {/* Freight Cost */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Biaya Angkut (Freight)
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {formatIDR(totalFreightCostIdr)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Biaya vendor transportasi
              </span>
            </div>

            {/* Total HPP */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total HPP
              </span>
              <p className="text-lg font-bold text-amber-900 mt-1 font-mono">
                {formatIDR(totalHppIdr)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Material + Angkut + Ops
              </span>
            </div>

            {/* Gross Profit & Margin */}
            <div className="p-3 rounded-lg bg-[#003C16] text-white border border-[#002B10]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
                  Laba Kotor (Gross Profit)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-900">
                  {formatPercent(overallMarginPercent)}
                </span>
              </div>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                {formatIDR(totalGrossProfitIdr)}
              </p>
              <span className="text-[10px] text-emerald-200/80 mt-1 block">
                Margin Komersial Bersih
              </span>
            </div>
          </div>

          {/* Accounts Receivable Bar */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">Total Terfaktur:</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatIDR(totalInvoicedIdr)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs">
              <span className="text-emerald-800 font-medium">Sudah Terbayar:</span>
              <span className="font-bold text-emerald-900 font-mono">
                {formatIDR(totalPaidIdr)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-rose-50 border border-rose-200 text-xs">
              <span className="text-rose-800 font-medium">Piutang Beredar (AR):</span>
              <span className="font-bold text-rose-900 font-mono">
                {formatIDR(totalOutstandingIdr)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs flex items-center justify-between">
          <span>
            Informasi finansial & HPP dibatasi berdasarkan hak akses role:{' '}
            <strong className="text-slate-700">{currentProfile.role}</strong>.
          </span>
          <span className="text-[11px] text-slate-400">Hubungi Finance / Management</span>
        </div>
      )}

      {/* 4. Active Deliveries Quick Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Pengiriman Berlangsung & Terbaru
            </h3>
            <p className="text-xs text-slate-500">
              Status pengangkutan dan rekonsiliasi volume material
            </p>
          </div>
          <button
            onClick={() => onNavigate('deliveries')}
            className="text-xs font-semibold text-[#003C16] hover:text-[#002B10] flex items-center gap-1"
          >
            Lihat Semua Surat Jalan <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">No. Surat Jalan</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3 text-right">Loaded (m³)</th>
                <th className="py-2.5 px-3 text-right">Received (m³)</th>
                <th className="py-2.5 px-3 text-right">Approved (m³)</th>
                <th className="py-2.5 px-3 text-right">Selisih (%)</th>
                <th className="py-2.5 px-3">Truk / Sopir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.slice(0, 5).map((d) => {
                const product = products.find((p) => p.id === d.productId);
                const rec = d.reconciliation;

                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                      {d.deliveryNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'POD_SUBMITTED'
                            ? 'bg-blue-100 text-blue-800'
                            : d.status === 'IN_TRANSIT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {product?.name || 'Agregat'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatVolumeM3(d.loadedVolumeM3, false)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {d.receivedVolumeM3 > 0
                        ? formatVolumeM3(d.receivedVolumeM3, false)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {d.approvedVolumeM3 > 0
                        ? formatVolumeM3(d.approvedVolumeM3, false)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {rec ? (
                        <span
                          className={`font-semibold ${
                            rec.varianceStatus === 'ABOVE_TOLERANCE'
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {rec.variancePercentage.toFixed(2)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {d.vehicleId}
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
