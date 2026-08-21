import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Printer,
  DollarSign,
  CheckCircle2,
  Calendar,
  Building2,
  Download,
  Search,
  X,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceStatus } from '../../types';
import { formatDate, formatIDR, formatVolumeM3 } from '../../lib/formatters';

export const InvoicesView: React.FC = () => {
  const {
    invoices,
    customers,
    projects,
    contracts,
    deliveries,
    company,
    createInvoice,
    exportToCsv,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // New Invoice form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedContractId, setSelectedContractId] = useState(contracts[0]?.id || '');
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [ppnIncluded, setPpnIncluded] = useState(true);
  const [notes, setNotes] = useState('Penagihan suplai material agregat proyek konstruksi.');

  // Unbilled deliveries candidate
  const candidateDeliveries = deliveries.filter(
    (d) => d.contractId === selectedContractId && (d.approvedVolumeM3 > 0 || d.loadedVolumeM3 > 0)
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeliveryIds.length === 0) {
      alert('Pilih minimal 1 surat jalan/pengiriman untuk ditagihkan.');
      return;
    }

    createInvoice(
      selectedCustomerId,
      selectedProjectId,
      selectedContractId,
      selectedDeliveryIds,
      ppnIncluded ? 11.0 : 0,
      notes
    );

    setIsCreatingInvoice(false);
    setSelectedDeliveryIds([]);
  };

  const toggleDeliverySelection = (delId: string) => {
    if (selectedDeliveryIds.includes(delId)) {
      setSelectedDeliveryIds(selectedDeliveryIds.filter((id) => id !== delId));
    } else {
      setSelectedDeliveryIds([...selectedDeliveryIds, delId]);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    const cust = customers.find((c) => c.id === i.customerId);
    const proj = projects.find((p) => p.id === i.projectId);
    return (
      i.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Faktur, Pelanggan, atau Proyek..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => exportToCsv('invoices')}
            className="px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" /> Ekspor Invoices
          </button>
          <button
            onClick={() => setIsCreatingInvoice(true)}
            className="px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Terbitkan Faktur Baru
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">No. Faktur</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Pelanggan & Proyek</th>
                <th className="py-3 px-3 text-right">Volume Tagih (m³)</th>
                <th className="py-3 px-3 text-right">Subtotal DPP</th>
                <th className="py-3 px-3 text-right">PPN 11%</th>
                <th className="py-3 px-3 text-right">Total Faktur</th>
                <th className="py-3 px-3 text-right">Sudah Dibayar</th>
                <th className="py-3 px-3 text-right">Sisa Piutang (AR)</th>
                <th className="py-3 px-3 text-center">Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredInvoices.map((inv) => {
                const cust = customers.find((c) => c.id === inv.customerId);
                const proj = projects.find((p) => p.id === inv.projectId);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900 font-mono text-[13px]">
                        {inv.invoiceNumber}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Jatuh Tempo: {formatDate(inv.dueDate)}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{cust?.name}</p>
                      <p className="text-[11px] text-slate-500">{proj?.name}</p>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {formatVolumeM3(inv.totalApprovedVolumeM3, false)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatIDR(inv.subtotalIdr)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatIDR(inv.taxAmountIdr)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                      {formatIDR(inv.totalInvoiceIdr)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-800">
                      {formatIDR(inv.totalPaidIdr)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-extrabold text-rose-700">
                      {formatIDR(inv.outstandingBalanceIdr)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedInvoiceForPrint(inv)}
                        className="p-1.5 rounded border border-slate-200 hover:bg-[#003C16] hover:text-white transition-colors"
                        title="Cetak Faktur Penagihan Proyek (A4)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create Invoice */}
      {isCreatingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Penerbitan Faktur Penagihan Proyek
              </h3>
              <button onClick={() => setIsCreatingInvoice(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Kontrak Proyek *</label>
                <select
                  value={selectedContractId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setSelectedContractId(cId);
                    const c = contracts.find((con) => con.id === cId);
                    if (c) {
                      setSelectedCustomerId(c.customerId);
                      setSelectedProjectId(c.projectId);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-medium"
                >
                  {contracts.map((c) => {
                    const cust = customers.find((cu) => cu.id === c.customerId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber} — {cust?.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Delivery selector list */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Pilih Surat Jalan Approved yang Akan Ditagih:
                </label>
                {candidateDeliveries.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded border border-slate-200">
                    Tidak ada surat jalan approved pada kontrak ini. Pastikan ritase telah direkonsiliasi.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200 rounded p-2 bg-slate-50">
                    {candidateDeliveries.map((d) => {
                      const isIMCI = customers.find((c) => c.id === contracts.find((co) => co.id === d.contractId)?.customerId)?.name?.toLowerCase().includes('imci');
                      const hasIMCI = d.quarryLoadingInfo?.notes?.includes('SJ IMCI');
                      const imciNo = hasIMCI ? d.quarryLoadingInfo!.notes!.replace('SJ IMCI ', '') : null;
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center justify-between p-2 rounded bg-white border hover:bg-slate-100 cursor-pointer text-xs ${isIMCI && !hasIMCI ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedDeliveryIds.includes(d.id)}
                              onChange={() => toggleDeliverySelection(d.id)}
                              className="rounded text-[#003C16] focus:ring-[#003C16]"
                            />
                            <span className="font-mono font-bold">{d.deliveryNumber}</span>
                            {isIMCI && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${hasIMCI ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {hasIMCI ? `IMCI:${imciNo}` : 'IMCI: -'}
                              </span>
                            )}
                            <span className="text-slate-500 font-medium">({formatDate(d.scheduledDate)})</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-800">
                            {formatVolumeM3(d.approvedVolumeM3 > 0 ? d.approvedVolumeM3 : d.loadedVolumeM3, false)} m³
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {candidateDeliveries.some((d) => {
                  const isIMCI = customers.find((c) => c.id === contracts.find((co) => co.id === d.contractId)?.customerId)?.name?.toLowerCase().includes('imci');
                  return isIMCI && !d.quarryLoadingInfo?.notes?.includes('SJ IMCI');
                }) && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                    Ada SJ IMCI yang belum diisi (kuning) — isi di `Pengiriman & Surat Jalan` detail `DELIVERED` sebelum tagih.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-6 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ppnIncluded}
                    onChange={(e) => setPpnIncluded(e.target.checked)}
                    className="rounded text-[#003C16] focus:ring-[#003C16]"
                  />
                  <span>Kenakan PPN 11%</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Tagihan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingInvoice(false)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Terbitkan & Kirim Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official A4 Printable Invoice Modal */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Action Bar */}
            <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Pratinjau Dokumen Resmi Faktur Penagihan Proyek
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak / Simpan PDF (A4)
                </button>
                <button
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable A4 Sheet */}
            <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 font-sans" id="invoice-a4">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#003C16] flex items-center justify-center text-white font-black text-xl shadow-xs">
                    RBN
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight text-[#003C16] uppercase">
                      {company.name}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium max-w-md">
                      {company.address}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      NPWP: {company.npwp} | Telp: {company.phone}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-[#003C16] text-white font-black text-xs uppercase tracking-widest">
                    FAKTUR PENAGIHAN
                  </span>
                  <p className="text-sm font-black text-slate-900 font-mono mt-1">
                    {selectedInvoiceForPrint.invoiceNumber}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Tanggal: {formatDate(selectedInvoiceForPrint.invoiceDate)}
                  </p>
                  <p className="text-[11px] text-rose-700 font-bold mt-0.5">
                    Jatuh Tempo: {formatDate(selectedInvoiceForPrint.dueDate)}
                  </p>
                </div>
              </div>

              {/* Bill To */}
              <div className="my-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1 mb-2">
                  Ditagihkan Kepada:
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {customers.find((c) => c.id === selectedInvoiceForPrint.customerId)?.name}
                </p>
                <p className="text-slate-600 mt-0.5">
                  Proyek: {projects.find((p) => p.id === selectedInvoiceForPrint.projectId)?.name}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Alamat: {projects.find((p) => p.id === selectedInvoiceForPrint.projectId)?.location}
                </p>
              </div>

              {/* Items Table */}
              <div className="my-4">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-800 text-white font-bold">
                    <tr>
                      <th className="py-2 px-3 border border-slate-300">No</th>
                      <th className="py-2 px-3 border border-slate-300">Deskripsi Pengiriman & Material</th>
                      <th className="py-2 px-3 border border-slate-300 text-right">Approved (m³)</th>
                      <th className="py-2 px-3 border border-slate-300 text-right">Harga Satuan (m³)</th>
                      <th className="py-2 px-3 border border-slate-300 text-right">Total DPP (IDR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoiceForPrint.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2.5 px-3 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 border border-slate-300">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Surat Jalan Ref: {item.deliveryNumber}</p>
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-right font-mono font-bold">
                          {formatVolumeM3(item.approvedVolumeM3, false)} m³
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-right font-mono">
                          {formatIDR(item.unitPricePerM3)}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-300 text-right font-mono font-bold">
                          {formatIDR(item.itemTotalIdr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Total Box */}
              <div className="flex justify-end my-4">
                <div className="w-80 space-y-1.5 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal DPP:</span>
                    <span className="font-bold text-slate-900">{formatIDR(selectedInvoiceForPrint.subtotalIdr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">PPN (11%):</span>
                    <span className="font-bold text-slate-900">{formatIDR(selectedInvoiceForPrint.taxAmountIdr)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-slate-900 text-sm font-extrabold text-[#003C16]">
                    <span>Total Faktur Tagihan:</span>
                    <span>{formatIDR(selectedInvoiceForPrint.totalInvoiceIdr)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Account Info & Signatures */}
              <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t border-slate-300 text-xs">
                <div>
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block mb-1.5">
                    Instruksi Pembayaran Transfer Bank:
                  </span>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1 font-mono text-[11px]">
                    <p className="font-bold text-slate-900">Bank Mandiri (Cabang Cirebon)</p>
                    <p className="text-slate-700">No. Rekening: <strong>134-00-9876543-2</strong></p>
                    <p className="text-slate-700">Atas Nama: <strong>PT REV BUMI NUSANTARA PERKASA</strong></p>
                  </div>
                </div>

                <div className="text-center flex flex-col justify-between items-center h-32">
                  <span className="font-semibold text-slate-700">Hormat Kami,</span>
                  <div className="h-12 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      DIVERIFIKASI & DITANDATANGANI
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 border-t border-slate-400 w-3/4 pt-1">
                    ( Hendra Gunawan, S.E. )<br />
                    <span className="text-[10px] text-slate-500 font-normal">Direktur Keuangan & Akuntansi</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
