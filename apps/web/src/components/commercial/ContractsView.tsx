import React, { useState } from 'react';
import {
  FileBadge,
  Plus,
  TrendingUp,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Search,
  ShieldAlert,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { evaluateContractFulfillment } from '../../engine/contract.engine';
import { formatIDR, formatPercent, formatVolumeM3, formatDate } from '../../lib/formatters';
import { Contract, OverDeliveryPolicy } from '../../types';

export const ContractsView: React.FC = () => {
  const { contracts, customers, projects, products, quarries, deliveries, createContract, updateContract, deleteContract } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New Contract form state
  const [contractType, setContractType] = useState<'PO_BASED' | 'NON_PO'>('PO_BASED');
  const [contractNumber, setContractNumber] = useState('');
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quarryId, setQuarryId] = useState(quarries[0]?.id || '');
  const [sourceQuarryIds, setSourceQuarryIds] = useState<string[]>(quarries[0]?.id ? [quarries[0].id] : []);
  const [contractedVolumeM3, setContractedVolumeM3] = useState<number>(10000);
  const [unitPricePerM3, setUnitPricePerM3] = useState<number>(175000);
  const [tolerancePercent, setTolerancePercent] = useState<number>(2.0);
  const [overDeliveryPolicy, setOverDeliveryPolicy] = useState<OverDeliveryPolicy>('WARNING');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('2026-12-31');
  const [notes, setNotes] = useState('');

  const openCreateModal = () => {
    setEditingContractId(null);
    setContractType('PO_BASED');
    setContractNumber('');
    setCustomerId(customers[0]?.id || '');
    setProjectId(projects[0]?.id || '');
    setProductId(products[0]?.id || '');
    setQuarryId(quarries[0]?.id || '');
    setSourceQuarryIds(quarries[0]?.id ? [quarries[0].id] : []);
    setContractedVolumeM3(10000);
    setUnitPricePerM3(175000);
    setTolerancePercent(2.0);
    setOverDeliveryPolicy('WARNING');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('2026-12-31');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (contract: Contract) => {
    setEditingContractId(contract.id);
    setContractType(contract.contractType);
    setContractNumber(contract.contractNumber);
    setCustomerId(contract.customerId);
    setProjectId(contract.projectId);
    setProductId(contract.productId);
    setQuarryId(contract.quarryId || quarries[0]?.id || '');
    setSourceQuarryIds(
      contract.sourceQuarryIds && contract.sourceQuarryIds.length > 0
        ? contract.sourceQuarryIds
        : contract.quarryId
        ? [contract.quarryId]
        : quarries[0]?.id
        ? [quarries[0].id]
        : []
    );
    setContractedVolumeM3(contract.contractedVolumeM3 || 0);
    setUnitPricePerM3(contract.unitPricePerM3);
    setTolerancePercent(contract.tolerancePercent);
    setOverDeliveryPolicy(contract.overDeliveryPolicy);
    setStartDate(contract.startDate);
    setEndDate(contract.endDate);
    setNotes(contract.notes || '');
    setIsModalOpen(true);
  };

  const filteredContracts = contracts.filter((c) => {
    const cust = customers.find((cu) => cu.id === c.customerId);
    const proj = projects.find((p) => p.id === c.projectId);
    const prod = products.find((pr) => pr.id === c.productId);
    return (
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSources = sourceQuarryIds.length > 0 ? sourceQuarryIds : quarryId ? [quarryId] : [];
    const primaryQuarry = selectedSources[0] || quarryId;
    const payload = {
      contractNumber: contractNumber || `RBN/CON/${new Date().getFullYear()}/${String(contracts.length + 1).padStart(3, '0')}`,
      customerId,
      projectId,
      productId,
      quarryId: primaryQuarry,
      sourceQuarryIds: selectedSources.length > 1 ? selectedSources : undefined,
      contractType,
      contractedVolumeM3: contractType === 'NON_PO' ? 0 : Number(contractedVolumeM3),
      unitPricePerM3: Number(unitPricePerM3),
      tolerancePercent: Number(tolerancePercent),
      overDeliveryPolicy,
      startDate,
      endDate,
      notes,
    };

    if (editingContractId) {
      updateContract(editingContractId, payload);
    } else {
      createContract({ ...payload, status: 'ACTIVE' });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Kontrak, Customer, atau Proyek..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" /> Daftarkan Kontrak Proyek Baru
        </button>
      </div>

      {/* Contract Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredContracts.map((contract) => {
          const cust = customers.find((c) => c.id === contract.customerId);
          const proj = projects.find((p) => p.id === contract.projectId);
          const prod = products.find((p) => p.id === contract.productId);
          const quarry = quarries.find((q) => q.id === contract.quarryId);

          const metrics = evaluateContractFulfillment(contract, deliveries);

          return (
            <div
              key={contract.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {contract.contractNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        contract.contractType === 'NON_PO'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {contract.contractType === 'NON_PO' ? 'Non-PO' : 'PO'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        metrics.contractStatus === 'OVER_DELIVERED'
                          ? 'bg-rose-100 text-rose-800'
                          : metrics.contractStatus === 'NEARING_LIMIT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {metrics.contractStatus}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {cust?.name}
                  </p>
                  <p className="text-[11px] text-slate-500">{proj?.name}</p>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Harga Negosiasi:</span>
                    <span className="font-extrabold text-sm font-mono text-[#003C16]">
                      {formatIDR(contract.unitPricePerM3)} / m³
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openEditModal(contract)}
                      title="Edit kontrak"
                      className="p-1.5 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(contract.id)}
                      title="Hapus kontrak"
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Volume Burn Rate Progress Bar */}
              {contract.contractType === 'NON_PO' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Volume Terkirim (Non-PO Rutin):</span>
                    <span className="font-extrabold font-mono text-slate-900">
                      {formatVolumeM3(metrics.totalApprovedVolumeM3)} m³
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: '100%' }} />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Pengiriman rutin tanpa target volume. Volume diperbarui per ritase diterima.
                  </p>
                </div>
              ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Realisasi Pengiriman Approved:</span>
                  <span className="font-extrabold font-mono text-slate-900">
                    {metrics.fulfillmentPercent.toFixed(2)}% ({formatVolumeM3(metrics.totalApprovedVolumeM3, false)} / {formatVolumeM3(metrics.contractedVolumeM3, false)} m³)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      metrics.isOverDelivered
                        ? 'bg-rose-600'
                        : metrics.fulfillmentPercent >= 85
                        ? 'bg-amber-500'
                        : 'bg-[#003C16]'
                    }`}
                    style={{ width: `${Math.min(100, metrics.fulfillmentPercent)}%` }}
                  />
                </div>
                {metrics.isOverDelivered && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Over-Delivery Terdeteksi: +{formatVolumeM3(metrics.overDeliveredVolumeM3)} (Kebijakan: {contract.overDeliveryPolicy})
                  </p>
                )}
              </div>
              )}

              {/* Stats Summary Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-lg bg-slate-50 border border-slate-100 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Sisa Volume:</span>
                  <span className="font-bold text-slate-800">
                    {contract.contractType === 'NON_PO' ? 'Rutin' : formatVolumeM3(metrics.remainingVolumeM3)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Toleransi Selisih:</span>
                  <span className="font-bold text-slate-800">
                    ±{contract.tolerancePercent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Revenue:</span>
                  <span className="font-bold text-emerald-800">
                    {formatIDR(metrics.totalRevenueRecognizedIdr)}
                  </span>
                </div>
              </div>

              {/* Product & Quarry Detail */}
              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span>Material: <strong>{prod?.name}</strong></span>
                  <span>Quarry Utama: <strong>{quarry?.name}</strong></span>
                </div>
                {contract.sourceQuarryIds && contract.sourceQuarryIds.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sumber Lain:</span>
                    <span className="text-right">
                      {contract.sourceQuarryIds
                        .filter((qid) => qid !== contract.quarryId)
                        .map((qid) => quarries.find((q) => q.id === qid)?.name || qid)
                        .join(', ') || '-'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Contract (Tambah / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-emerald-300" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {editingContractId ? 'Edit Kontrak Suplai Material' : 'Daftarkan Kontrak Suplai Material'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jenis Kontrak *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContractType('PO_BASED')}
                    className={`px-3 py-2 rounded-md text-xs font-bold border text-left transition-colors ${
                      contractType === 'PO_BASED'
                        ? 'bg-[#003C16] text-white border-[#003C16]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    PO (Volume / Tonase)
                    <span className={`block text-[10px] font-medium ${contractType === 'PO_BASED' ? 'text-emerald-200' : 'text-slate-400'}`}>
                      Ada target volume kontrak
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractType('NON_PO')}
                    className={`px-3 py-2 rounded-md text-xs font-bold border text-left transition-colors ${
                      contractType === 'NON_PO'
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Non-PO (Rutin)
                    <span className={`block text-[10px] font-medium ${contractType === 'NON_PO' ? 'text-sky-200' : 'text-slate-400'}`}>
                      Pengiriman rutin tanpa target
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nomor Kontrak Perjanjian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: RBN/WSKT/2026/004"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Pelanggan (Customer) *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Proyek Site *
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Produk Agregat *
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Quarry Sumber (multi) *
                  </label>
                  <div className="border border-slate-300 rounded-md p-2 space-y-1.5 max-h-32 overflow-y-auto">
                    {quarries.map((q) => {
                      const checked = sourceQuarryIds.includes(q.id);
                      return (
                        <label key={q.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? sourceQuarryIds.filter((id) => id !== q.id)
                                : [...sourceQuarryIds, q.id];
                              setSourceQuarryIds(next);
                              if (next.length > 0 && !next.includes(quarryId)) {
                                setQuarryId(next[0] || '');
                              }
                              if (next.length === 0) {
                                setQuarryId('');
                              }
                            }}
                            className="accent-[#003C16]"
                          />
                          <span>{q.name}</span>
                          {checked && (
                            <span className="text-slate-400 text-[10px]">
                              {q.id === quarryId ? '(utama)' : ''}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Centang lebih dari satu untuk sumber fleksibel. Yang pertama menjadi quarry utama.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Volume (m³) *
                  </label>
                  <input
                    type="number"
                    step={100}
                    required={contractType === 'PO_BASED'}
                    disabled={contractType === 'NON_PO'}
                    min={1}
                    value={contractType === 'NON_PO' ? 0 : contractedVolumeM3}
                    onChange={(e) => setContractedVolumeM3(Number(e.target.value))}
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono disabled:bg-slate-50 disabled:text-slate-400`}
                  />
                  {contractType === 'NON_PO' && (
                    <span className="text-[10px] text-sky-600 font-medium">Tidak dipakai utk Non-PO</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Harga / m³ (IDR) *
                  </label>
                  <input
                    type="number"
                    step={1000}
                    required
                    min={1000}
                    value={unitPricePerM3}
                    onChange={(e) => setUnitPricePerM3(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Toleransi (%) *
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    required
                    min={0}
                    value={tolerancePercent}
                    onChange={(e) => setTolerancePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kebijakan Over-Delivery
                </label>
                <select
                  value={overDeliveryPolicy}
                  onChange={(e) => setOverDeliveryPolicy(e.target.value as OverDeliveryPolicy)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-medium"
                >
                  <option value="WARNING">WARNING (Peringatan Visual, Tetap Kirim)</option>
                  <option value="REQUIRES_APPROVAL">REQUIRES_APPROVAL (Perlu Persetujuan Direksi)</option>
                  <option value="BLOCKED">BLOCKED (Kunci / Blokir Pengiriman Baru)</option>
                  <option value="ALLOWED">ALLOWED (Diperbolehkan Tanpa Peringatan)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> {editingContractId ? 'Simpan Perubahan' : 'Simpan Kontrak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Kontrak */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">Hapus Kontrak</h3>
              <button onClick={() => setConfirmDeleteId(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                Yakin ingin menghapus kontrak{' '}
                <strong className="text-slate-900 font-mono">
                  {contracts.find((c) => c.id === confirmDeleteId)?.contractNumber}
                </strong>
                ? Tindakan ini tercatat di audit log dan tidak dapat dibatalkan.
              </p>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteContract(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-4 h-4" /> Hapus Kontrak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
