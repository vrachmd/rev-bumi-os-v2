import React, { useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Scale,
  DollarSign,
  FileCheck,
  Search,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Delivery, VarianceReason } from '../../types';
import { formatIDR, formatPercent, formatVolumeM3, formatDate } from '../../lib/formatters';

const VARIANCE_REASONS: { id: VarianceReason; label: string }[] = [
  { id: 'MEASUREMENT_VARIANCE', label: 'Perbedaan Alat Ukur Lapangan (Measurement Variance)' },
  { id: 'PHYSICAL_LOSS', label: 'Kehilangan Fisik / Tumpahan Pengangkutan (Physical Loss)' },
  { id: 'MOISTURE_VARIANCE', label: 'Penyusutan Kadar Air Agregat (Moisture Variance)' },
  { id: 'DENSITY_VARIANCE', label: 'Variasi Densitas Batuan Quarry (Density Variance)' },
  { id: 'LOADING_VARIANCE', label: 'Toleransi Pemuatan Quarry (Loading Variance)' },
  { id: 'RECEIVING_VARIANCE', label: 'Kondisi Area Penampungan Site (Receiving Variance)' },
  { id: 'COMMERCIAL_ADJUSTMENT', label: 'Penyesuaian Komersial Kesepakatan QS Proyek' },
  { id: 'DATA_ERROR', label: 'Koreksi Kesalahan Input Data Lapangan' },
  { id: 'UNDER_INVESTIGATION', label: 'Dalam Proses Investigasi Lapangan' },
  { id: 'OTHER', label: 'Lain-lain / Berita Acara Terpisah' },
];

export const ReconciliationView: React.FC = () => {
  const { deliveries, products, contracts, reconcileDeliveryQuantity } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Form states for active reconciliation
  const [receivedVol, setReceivedVol] = useState<number>(0);
  const [commercialAdj, setCommercialAdj] = useState<number>(0);
  const [reason, setReason] = useState<VarianceReason>('MEASUREMENT_VARIANCE');
  const [notes, setNotes] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const openReconcile = (d: Delivery) => {
    setSelectedDelivery(d);
    setReceivedVol(d.receivedVolumeM3 > 0 ? d.receivedVolumeM3 : d.loadedVolumeM3);
    setCommercialAdj(d.reconciliation?.commercialAdjustmentM3 || 0);
    setReason(d.reconciliation?.varianceReason || 'MEASUREMENT_VARIANCE');
    setNotes(d.reconciliation?.reviewNotes || '');
    setSaveSuccess(false);
  };

  const handleSaveReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    const res = reconcileDeliveryQuantity(
      selectedDelivery.id,
      Number(receivedVol),
      Number(commercialAdj),
      reason,
      notes
    );

    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSelectedDelivery(null);
      }, 1000);
    }
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
      {/* Header Info Banner */}
      <div className="bg-[#003C16] text-white rounded-lg p-4 border border-[#002B10] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-white/10 text-emerald-300">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              Quantity Reconciliation Engine (m³)
            </h2>
            <p className="text-xs text-emerald-200/90 max-w-2xl">
              Memvalidasi volume muat quarry vs volume tiba site proyek, menguji batas toleransi kontrak (mis. 2%), dan menetapkan Volume Approved resmi untuk dasar penagihan faktur.
            </p>
          </div>
        </div>

        <div className="text-right text-xs bg-white/10 px-3 py-2 rounded font-mono">
          <span className="text-emerald-200 block text-[10px] uppercase font-bold">
            Satuan Baku Utama
          </span>
          <span className="font-bold text-white">Meter Kubik (m³)</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter No Surat Jalan atau Kontrak..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
          />
        </div>
      </div>

      {/* Main Reconciliation Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">No. Surat Jalan</th>
                <th className="py-3 px-3">Material</th>
                <th className="py-3 px-3 text-right">Loaded (m³)</th>
                <th className="py-3 px-3 text-right">Received (m³)</th>
                <th className="py-3 px-3 text-right">Selisih Fisik (m³)</th>
                <th className="py-3 px-3 text-right">Selisih (%)</th>
                <th className="py-3 px-3 text-center">Status Toleransi</th>
                <th className="py-3 px-3 text-right">Approved (m³)</th>
                <th className="py-3 px-3 text-right">Potensi Nilai Selisih</th>
                <th className="py-3 px-3 text-center">Aksi QS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredDeliveries.map((d) => {
                const product = products.find((p) => p.id === d.productId);
                const contract = contracts.find((c) => c.id === d.contractId);
                const rec = d.reconciliation;

                const tolerance = contract?.tolerancePercent || 2.0;
                const isAboveTolerance = rec?.varianceStatus === 'ABOVE_TOLERANCE';
                const isApprovedAdj = rec?.varianceStatus === 'APPROVED_ADJUSTMENT';

                return (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900 font-mono text-[13px]">
                        {d.deliveryNumber}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {contract?.contractNumber}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900">{product?.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Densitas: {(d.densityApplied ?? 1.6).toFixed(2)} ton/m³
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {formatVolumeM3(d.loadedVolumeM3, false)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {d.receivedVolumeM3 > 0
                        ? formatVolumeM3(d.receivedVolumeM3, false)
                        : '-'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {rec ? (
                        <span
                          className={
                            rec.physicalVarianceM3 > 0
                              ? 'text-rose-600'
                              : rec.physicalVarianceM3 < 0
                              ? 'text-emerald-600'
                              : 'text-slate-600'
                          }
                        >
                          {rec.physicalVarianceM3 > 0 ? '-' : '+'}
                          {formatVolumeM3(Math.abs(rec.physicalVarianceM3), false)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      {rec ? (
                        <span
                          className={`font-extrabold ${
                            isAboveTolerance
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {rec.variancePercentage.toFixed(2)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {rec ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAboveTolerance
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isApprovedAdj
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {rec.varianceStatus}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Belum Direkonsiliasi</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-extrabold text-sm text-[#003C16]">
                      {d.approvedVolumeM3 > 0
                        ? formatVolumeM3(d.approvedVolumeM3, false)
                        : '-'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-xs font-bold">
                      {rec ? (
                        <span
                          className={
                            rec.physicalVarianceM3 > 0
                              ? 'text-rose-600'
                              : rec.physicalVarianceM3 < 0
                              ? 'text-emerald-600'
                              : 'text-slate-700'
                          }
                        >
                          {rec.physicalVarianceM3 > 0 ? '-' : rec.physicalVarianceM3 < 0 ? '+' : ''}
                          {formatIDR(rec.potentialVarianceValueIdr)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => openReconcile(d)}
                        className="px-2.5 py-1 rounded bg-[#003C16] hover:bg-[#002B10] text-white font-bold text-[10px] flex items-center gap-1 mx-auto transition-colors shadow-2xs"
                      >
                        <Scale className="w-3 h-3" /> Rekonsiliasi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer for Reconciliation Form */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Formulir Rekonsiliasi & Penetapan Approved Volume
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 font-mono">
                    {selectedDelivery.deliveryNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="p-1 rounded text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReconciliation} className="p-5 space-y-4">
              {saveSuccess && (
                <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Rekonsiliasi berhasil disimpan! Approved volume telah diperbarui dan dicatat di Audit Log.
                </div>
              )}

              {/* Delivery Base Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded bg-slate-50 border border-slate-200 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Loaded Quarry:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatVolumeM3(selectedDelivery.loadedVolumeM3, false)} m³
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Net Timbangan:</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedDelivery.weighbridge ? `${(selectedDelivery.weighbridge.netWeightKg / 1000).toFixed(2)} ton` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Toleransi Kontrak:</span>
                  <span className="font-bold text-purple-800 text-sm">
                    {contracts.find((c) => c.id === selectedDelivery.contractId)?.tolerancePercent || 2.0}%
                  </span>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Received Volume m³ (Fisik di Proyek) *
                  </label>
                  <input
                    type="number"
                    step={0.001}
                    required
                    min={0}
                    value={receivedVol}
                    onChange={(e) => setReceivedVol(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Hasil ukur fisik bak / jembatan timbang
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Penyesuaian Komersial (m³)
                  </label>
                  <input
                    type="number"
                    step={0.001}
                    value={commercialAdj}
                    onChange={(e) => setCommercialAdj(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Potongan kesepakatan QS (endapan/lumpur)
                  </span>
                </div>
              </div>

              {/* Dynamic Live Calculations */}
              {(() => {
                const loaded = selectedDelivery.loadedVolumeM3;
                const physicalDiff = receivedVol - loaded;
                const pct = loaded > 0 ? (Math.abs(physicalDiff) / loaded) * 100 : 0;
                const approved = Math.max(0, receivedVol - commercialAdj);
                const contract = contracts.find((c) => c.id === selectedDelivery.contractId);
                const tolerance = contract?.tolerancePercent || 2.0;
                const isOver = pct > tolerance;

                return (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Selisih Fisik (Received - Loaded):</span>
                      <span
                        className={`font-mono font-bold ${
                          physicalDiff < 0
                            ? 'text-rose-600'
                            : physicalDiff > 0
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {physicalDiff === 0
                          ? '0.00'
                          : `${physicalDiff > 0 ? '+' : '-'}${Math.abs(physicalDiff).toFixed(2)}`} m³ ({pct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Status Terhadap Toleransi ({tolerance}%):</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          isOver
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOver ? 'DI ATAS TOLERANSI (ABOVE_TOLERANCE)' : 'DALAM TOLERANSI (WITHIN_TOLERANCE)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-900">Volume Resmi Ditagih (Approved m³):</span>
                      <span className="font-mono font-extrabold text-base text-[#003C16]">
                        {approved.toFixed(2)} m³
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Reason Classification */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Klasifikasi Alasan Selisih *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as VarianceReason)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-medium"
                >
                  {VARIANCE_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Review Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catatan Review QS / Berita Acara Rekonsiliasi
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  placeholder="Keterangan kesepakatan bersama Quantity Surveyor proyek..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDelivery(null)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Simpan Rekonsiliasi & Finalisasi Approved m³
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
