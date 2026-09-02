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

      {/* 2b. Tren 7 Hari — Revenue / Margin / Variance */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[#003C16]" /> Tren 7 Hari — Volume & Margin</h3>
          <span className="text-[11px] text-slate-500">Klik bar untuk filter Laporan • Forecast burn-rate di bawah</span>
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-24">
          {(() => {
            const days: { date: string; vol: number; rev: number; margin: number; varCount: number }[] = [];
            const today = new Date(); today.setHours(0,0,0,0);
            for (let i = 6; i >= 0; i--) {
              const d = new Date(today); d.setDate(today.getDate() - i);
              const iso = d.toISOString().slice(0,10);
              const dayDelivs = deliveries.filter((del) => del.scheduledDate === iso && del.approvedVolumeM3 > 0);
              const vol = dayDelivs.reduce((s, del) => s + (del.approvedVolumeM3||0), 0);
              const rev = dayDelivs.reduce((s, del) => s + (del.costRecord?.recognizedRevenueIdr||0), 0);
              const hpp = dayDelivs.reduce((s, del) => s + (del.costRecord?.totalHppIdr||0), 0);
              const margin = rev>0 ? ((rev-hpp)/rev*100) : 0;
              const varCount = dayDelivs.filter((del) => del.reconciliation?.varianceStatus==='ABOVE_TOLERANCE').length;
              days.push({ date: iso.slice(5), vol, rev, margin, varCount });
            }
            const maxVol = Math.max(1, ...days.map((d) => d.vol));
            return days.map((day, idx) => {
              const h = Math.max(8, (day.vol / maxVol) * 80);
              const color = day.margin >= 25 ? '#10B981' : day.margin >= 15 ? '#F59E0B' : day.vol===0 ? '#E2E8F0' : '#EF4444';
              return (
                <div key={idx} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onNavigate('reports' as any)} title={`${day.date} • ${day.vol.toFixed(1)} m³ • Margin ${day.margin.toFixed(1)}%${day.varCount?` • ${day.varCount} above`:''}`}>
                  <div className="text-[10px] font-mono font-bold" style={{ color }}>{day.margin>0 ? `${day.margin.toFixed(0)}%` : '-'}</div>
                  <div className="w-full rounded-t" style={{ height: `${h}px`, backgroundColor: color, opacity: day.vol===0?0.3:1 }} />
                  <div className="text-[10px] font-mono text-slate-600">{day.date}</div>
                  <div className="text-[9px] text-slate-500">{day.vol.toFixed(0)} m³</div>
                </div>
              );
            });
          })()}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {(() => {
            const activeContracts = contracts.filter((c) => c.status==='ACTIVE' && c.contractType!=='NON_PO');
            const totalRemaining = activeContracts.reduce((sum,c) => {
              const ful = deliveries.filter((d)=>d.contractId===c.id).reduce((s,d)=>s+(d.approvedVolumeM3||0),0);
              return sum + Math.max(0, c.contractedVolumeM3 - ful);
            },0);
            const avgDailyVol = deliveries.filter((d)=>d.approvedVolumeM3>0).reduce((s,d)=>s+(d.approvedVolumeM3||0),0) / 30;
            const forecastDays = avgDailyVol>0 ? Math.round(totalRemaining / avgDailyVol) : 0;
            return (
              <>
                <div className="p-2 rounded bg-slate-50 border text-center"><span className="text-[10px] text-slate-500 block">Sisa Kuota Aktif</span><span className="font-bold font-mono">{totalRemaining.toLocaleString('id-ID')} m³</span></div>
                <div className="p-2 rounded bg-slate-50 border text-center"><span className="text-[10px] text-slate-500 block">Rata-rata Harian (30d)</span><span className="font-bold font-mono">{avgDailyVol.toFixed(1)} m³/d</span></div>
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-center"><span className="text-[10px] text-emerald-700 block">Forecast Habis</span><span className="font-bold font-mono text-emerald-800">~{forecastDays} hari</span></div>
              </>
            );
          })()}
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
