// @ts-nocheck
import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  DollarSign,
  Calendar,
  Building2,
  Search,
  ArrowDownLeft,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIDR, formatDate } from '../../lib/formatters';

export type PaymentMethodType = 'BANK_TRANSFER' | 'GIRO_BILYET' | 'CHEQUE' | 'CASH';

export const PaymentsView: React.FC = () => {
  const { payments, invoices, customers, recordPayment, updatePayment, deletePayment } = useApp() as any;

  const [searchTerm, setSearchTerm] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  // New Payment Form
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id || '');
  const [amountIdr, setAmountIdr] = useState<number>(100000000);
  const [method, setMethod] = useState<PaymentMethodType>('BANK_TRANSFER');
  const [bankRef, setBankRef] = useState('TRF-MDR-2026-088');
  const [notes, setNotes] = useState('Pelunasan termin 1 suplai proyek.');

  // AR Aging Calculation
  const agingCurrent = invoices
    .filter((i) => i.status !== 'PAID')
    .reduce((sum, i) => sum + i.outstandingBalanceIdr, 0);

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) {
      updatePayment(editingPayment.id, { amountPaidIdr: Number(amountIdr), bankReference: bankRef, paymentMethod: method, notes });
      setEditingPayment(null);
    } else {
      recordPayment(invoiceId, Number(amountIdr), bankRef, method, notes);
    }
    setIsRecording(false);
  };
  const openEditPayment = (p: any) => {
    setEditingPayment(p);
    setInvoiceId(p.invoiceId);
    setAmountIdr(p.amountPaidIdr);
    setMethod(p.paymentMethod as PaymentMethodType);
    setBankRef(p.bankReference);
    setNotes(p.notes || '');
    setIsRecording(true);
  };
  const handleDeletePayment = (id: string) => {
    if (!confirm('Hapus pembayaran ini? Piutang faktur akan dikembalikan.')) return;
    const r: any = deletePayment(id);
    if (r && !r.success) alert(r.error || 'Gagal hapus');
  };
  const closeModal = () => { setIsRecording(false); setEditingPayment(null); };

  const filteredPayments = payments.filter(
    (p) =>
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bankReference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* AR Aging Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Piutang Berjalan (Current AR)
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatIDR(agingCurrent)}</p>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
            Dalam batas jatuh tempo
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Aging 31 - 60 Hari</span>
          <p className="text-xl font-bold text-amber-900 mt-1 font-mono">{formatIDR(45000000)}</p>
          <span className="text-[10px] text-amber-700 mt-1 block">Perlu reminder billing</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase">Aging &gt; 60 Hari (Kritis)</span>
          <p className="text-xl font-bold text-rose-900 mt-1 font-mono">{formatIDR(0)}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Tidak ada piutang macet</span>
        </div>

        <div className="bg-[#003C16] text-white border border-[#002B10] rounded-lg p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-200 uppercase">Total Penerimaan Kas</span>
          <p className="text-xl font-bold text-white mt-1 font-mono">
            {formatIDR(payments.reduce((sum, p) => sum + p.amountPaidIdr, 0))}
          </p>
          <span className="text-[10px] text-emerald-200/80 mt-1 block">
            Dari {payments.length} transaksi penerimaan
          </span>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Referensi Bank, Pelanggan, atau Faktur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
          />
        </div>

        <button
          onClick={() => { setEditingPayment(null); setIsRecording(true); }}
          className="w-full sm:w-auto px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" /> Catat Penerimaan Pembayaran Baru
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">ID Transaksi / Bukti</th>
                <th className="py-3 px-3">Tanggal Bayar</th>
                <th className="py-3 px-3">No. Faktur Terkait</th>
                <th className="py-3 px-3">Pelanggan</th>
                <th className="py-3 px-3">Metode & Ref Bank</th>
                <th className="py-3 px-3 text-right">Jumlah Diterima (IDR)</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredPayments.map((p) => {
                const inv = invoices.find((i) => i.id === p.invoiceId);
                const cust = customers.find((c) => c.id === inv?.customerId);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-emerald-100 text-emerald-800">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 font-mono text-[12px]">
                          {p.id}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">{formatDate(p.paymentDate)}</td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {p.invoiceNumber}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900">{p.customerName}</td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{p.paymentMethod}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{p.bankReference}</p>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-800">
                      {formatIDR(p.amountPaidIdr)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={()=>openEditPayment(p)} className="p-1.5 rounded border border-slate-200 hover:bg-slate-50" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={()=>handleDeletePayment(p.id)} className="p-1.5 rounded border border-rose-200 hover:bg-rose-50 text-rose-600" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Record Payment */}
      {isRecording && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingPayment ? 'Edit Pembayaran' : 'Pencatatan Pembayaran Masuk'}
              </h3>
              <button onClick={closeModal} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Faktur yang Dituju *</label>
                <select
                  value={invoiceId}
                  disabled={!!editingPayment}
                  onChange={(e) => {
                    const id = e.target.value;
                    setInvoiceId(id);
                    const inv = invoices.find((i) => i.id === id);
                    if (inv) setAmountIdr(inv.outstandingBalanceIdr);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-medium disabled:bg-slate-100"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — Sisa: {formatIDR(inv.outstandingBalanceIdr)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Jumlah Pembayaran (IDR) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min={1}
                  value={amountIdr}
                  onChange={(e) => setAmountIdr(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Metode Bayar *</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethodType)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-medium"
                >
                  <option value="BANK_TRANSFER">Transfer Bank</option>
                  <option value="GIRO_BILYET">Giro Bilyet (BG)</option>
                  <option value="CHEQUE">Cek Perusahaan</option>
                  <option value="CASH">Tunai / Kas</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Referensi Rekening Koran / Bank *</label>
                <input
                  type="text"
                  required
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan</label>
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
                  onClick={closeModal}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> {editingPayment ? 'Update Pembayaran' : 'Simpan Kwitansi Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
