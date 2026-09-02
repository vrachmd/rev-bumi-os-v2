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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  // AR Aging Calculation — real bucket dari dueDate vs today
  const today = new Date(); today.setHours(0,0,0,0);
  const buckets = (() => {
    const b = { current: 0, d1_30: 0, d31_60: 0, d60: 0, totalAR: 0 };
    for (const inv of invoices.filter((i: any) => i.status !== 'PAID' && i.outstandingBalanceIdr > 0)) {
      const due = new Date(inv.dueDate); due.setHours(0,0,0,0);
      const diff = Number.isNaN(due.getTime()) ? -1 : Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      b.totalAR += inv.outstandingBalanceIdr;
      if (diff <= 0) b.current += inv.outstandingBalanceIdr;
      else if (diff <= 30) b.d1_30 += inv.outstandingBalanceIdr;
      else if (diff <= 60) b.d31_60 += inv.outstandingBalanceIdr;
      else b.d60 += inv.outstandingBalanceIdr;
    }
    return b;
  })();
  const agingCurrent = buckets.current + buckets.d1_30; // 0-30 hari (termasuk belum jatuh tempo)
  const aging31_60 = buckets.d31_60;
  const aging60 = buckets.d60;
  const totalAR = buckets.totalAR;
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + i.totalInvoiceIdr, 0);
  const dso = totalInvoiced > 0 && totalAR > 0 ? Math.round((totalAR / (totalInvoiced / 30))) : 0; // rough DSO 30-hari basis
  const collectionRate = totalInvoiced > 0 ? Number(((1 - totalAR / totalInvoiced) * 100).toFixed(1)) : 0;

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
      {/* AR Aging Summary Cards — shadcn Card — real bucket dari dueDate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase">Total Piutang Berjalan (Current AR)</CardDescription>
            <CardTitle className="text-xl font-mono">{formatIDR(agingCurrent)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-emerald-700 font-semibold">0-30 hari {buckets.d1_30>0 ? `(+${formatIDR(buckets.d1_30)} 1-30)` : '• DSO ' + dso + ' hari'} • {collectionRate}% koleksi</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold text-amber-600 uppercase">Aging 31 - 60 Hari</CardDescription>
            <CardTitle className="text-xl font-mono text-amber-900">{formatIDR(aging31_60)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-amber-700">{aging31_60>0 ? 'Perlu reminder billing' : 'Tidak ada 31-60 hari'}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold text-destructive uppercase">Aging &gt; 60 Hari (Kritis)</CardDescription>
            <CardTitle className="text-xl font-mono text-destructive">{formatIDR(aging60)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-muted-foreground">{aging60>0 ? 'Piutang macet — follow up direksi' : 'Tidak ada piutang macet'}</span>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-primary">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold text-emerald-100 uppercase">Total Penerimaan Kas</CardDescription>
            <CardTitle className="text-xl font-mono text-primary-foreground">
              {formatIDR(payments.reduce((sum, p) => sum + p.amountPaidIdr, 0))}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-[10px] text-emerald-100/80">Dari {payments.length} transaksi • AR {formatIDR(totalAR)} • DSO {dso}d</span>
          </CardContent>
        </Card>
      </div>

      {/* Top Action Bar — shadcn Card + Input + Button */}
      <Card className="py-4">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 p-0 px-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Cari Referensi Bank, Pelanggan, atau Faktur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>

          <Button size="sm" onClick={() => { setEditingPayment(null); setIsRecording(true); }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Catat Penerimaan Pembayaran Baru
          </Button>
        </CardContent>
      </Card>

      {/* Payments Table — shadcn Card + Table + Button */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">ID Transaksi / Bukti</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Tanggal Bayar</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">No. Faktur Terkait</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Pelanggan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Metode & Ref Bank</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Jumlah Diterima (IDR)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((p) => {
                const inv = invoices.find((i) => i.id === p.invoiceId);
                const cust = customers.find((c) => c.id === inv?.customerId);

                return (
                  <TableRow key={p.id} className="hover:bg-muted/50 text-xs">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold font-mono text-[12px]">{p.id}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>

                    <TableCell className="font-mono font-bold">{p.invoiceNumber}</TableCell>

                    <TableCell className="font-semibold">{p.customerName}</TableCell>

                    <TableCell>
                      <p className="font-semibold">{p.paymentMethod}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.bankReference}</p>
                    </TableCell>

                    <TableCell className="text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                      {formatIDR(p.amountPaidIdr)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="icon-xs" onClick={() => openEditPayment(p)} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon-xs" onClick={() => handleDeletePayment(p.id)} className="border-destructive/30 text-destructive hover:bg-destructive/10" title="Hapus">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRecording} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-3.5 bg-primary text-primary-foreground rounded-t-lg">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-primary-foreground">
              {editingPayment ? 'Edit Pembayaran' : 'Pencatatan Pembayaran Masuk'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordSubmit} className="p-5 space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Faktur yang Dituju *</Label>
              <Select
                value={invoiceId}
                onValueChange={(v) => {
                  setInvoiceId(v);
                  const inv = invoices.find((i) => i.id === v);
                  if (inv) setAmountIdr(inv.outstandingBalanceIdr);
                }}
                disabled={!!editingPayment}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id} className="text-xs">
                      {inv.invoiceNumber} — Sisa: {formatIDR(inv.outstandingBalanceIdr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Jumlah Pembayaran (IDR) *</Label>
              <Input
                type="number"
                step="any"
                required
                min={1}
                value={amountIdr}
                onChange={(e) => setAmountIdr(Number(e.target.value))}
                className="font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Metode Bayar *</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethodType)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER" className="text-xs">Transfer Bank</SelectItem>
                  <SelectItem value="GIRO_BILYET" className="text-xs">Giro Bilyet (BG)</SelectItem>
                  <SelectItem value="CHEQUE" className="text-xs">Cek Perusahaan</SelectItem>
                  <SelectItem value="CASH" className="text-xs">Tunai / Kas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Referensi Rekening Koran / Bank *</Label>
              <Input required value={bankRef} onChange={(e) => setBankRef(e.target.value)} className="font-mono text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Catatan</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {editingPayment ? 'Update Pembayaran' : 'Simpan Kwitansi Pembayaran'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
