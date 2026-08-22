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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

      {/* Search & Filter — shadcn Card + Input */}
      <Card className="py-3">
        <CardContent className="p-0 px-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Filter No Surat Jalan atau Kontrak..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Reconciliation Table — shadcn Table + Badge */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">No. Surat Jalan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Material</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Loaded (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Received (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Selisih Fisik (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Selisih (%)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">Status Toleransi</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Approved (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Potensi Nilai Selisih</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">Aksi QS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.map((d) => {
                const product = products.find((p) => p.id === d.productId);
                const contract = contracts.find((c) => c.id === d.contractId);
                const rec = d.reconciliation;

                const tolerance = contract?.tolerancePercent || 2.0;
                const isAboveTolerance = rec?.varianceStatus === 'ABOVE_TOLERANCE';
                const isApprovedAdj = rec?.varianceStatus === 'APPROVED_ADJUSTMENT';

                return (
                  <TableRow key={d.id} className="hover:bg-muted/50 text-xs">
                    <TableCell>
                      <p className="font-bold text-foreground font-mono text-[13px]">
                        {d.deliveryNumber}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {contract?.contractNumber}
                      </span>
                    </TableCell>

                    <TableCell>
                      <p className="font-medium text-foreground">{product?.name}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Densitas: {(d.densityApplied ?? 1.6).toFixed(2)} ton/m³
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-mono font-semibold">
                      {formatVolumeM3(d.loadedVolumeM3, false)}
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      {d.receivedVolumeM3 > 0
                        ? formatVolumeM3(d.receivedVolumeM3, false)
                        : '-'}
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold">
                      {rec ? (
                        <span
                          className={
                            rec.physicalVarianceM3 > 0
                              ? 'text-destructive'
                              : rec.physicalVarianceM3 < 0
                              ? 'text-emerald-600'
                              : 'text-muted-foreground'
                          }
                        >
                          {rec.physicalVarianceM3 > 0 ? '-' : '+'}
                          {formatVolumeM3(Math.abs(rec.physicalVarianceM3), false)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      {rec ? (
                        <span className={`font-extrabold ${isAboveTolerance ? 'text-destructive' : 'text-emerald-700'}`}>
                          {rec.variancePercentage.toFixed(2)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {rec ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold border ${
                            isAboveTolerance
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-200'
                              : isApprovedAdj
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200'
                          }`}
                        >
                          {rec.varianceStatus}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Belum Direkonsiliasi</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono font-extrabold text-primary">
                      {d.approvedVolumeM3 > 0
                        ? formatVolumeM3(d.approvedVolumeM3, false)
                        : '-'}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold">
                      {rec ? (
                        <span
                          className={
                            rec.physicalVarianceM3 > 0
                              ? 'text-destructive'
                              : rec.physicalVarianceM3 < 0
                              ? 'text-emerald-600'
                              : 'text-muted-foreground'
                          }
                        >
                          {rec.physicalVarianceM3 > 0 ? '-' : rec.physicalVarianceM3 < 0 ? '+' : ''}
                          {formatIDR(rec.potentialVarianceValueIdr)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Button size="xs" onClick={() => openReconcile(d)} className="text-[10px] h-6">
                        <Scale className="w-3 h-3" /> Rekonsiliasi
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reconciliation Form — shadcn Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
          {selectedDelivery && (
            <>
              <DialogHeader className="px-5 py-3.5 bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center gap-2 text-left">
                  <GitCompare className="w-5 h-5 text-emerald-200" />
                  <div>
                    <DialogTitle className="text-sm font-bold uppercase tracking-wider text-primary-foreground">
                      Formulir Rekonsiliasi & Penetapan Approved Volume
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-emerald-100 font-mono">
                      {selectedDelivery.deliveryNumber}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleSaveReconciliation} className="p-5 space-y-4">
                {saveSuccess && (
                  <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Rekonsiliasi berhasil disimpan! Approved volume telah diperbarui dan dicatat di Audit Log.
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded bg-muted border font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Loaded Quarry:</span>
                    <span className="font-bold text-foreground text-sm">
                      {formatVolumeM3(selectedDelivery.loadedVolumeM3, false)} m³
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Net Timbangan:</span>
                    <span className="font-bold text-sm">
                      {selectedDelivery.weighbridge ? `${(selectedDelivery.weighbridge.netWeightKg / 1000).toFixed(2)} ton` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Toleransi Kontrak:</span>
                    <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">
                      {contracts.find((c) => c.id === selectedDelivery.contractId)?.tolerancePercent || 2.0}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Received Volume m³ (Fisik di Proyek) *</Label>
                    <Input
                      type="number"
                      step={0.001}
                      required
                      min={0}
                      value={receivedVol}
                      onChange={(e) => setReceivedVol(Number(e.target.value))}
                      className="font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Hasil ukur fisik bak / jembatan timbang</span>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Penyesuaian Komersial (m³)</Label>
                    <Input
                      type="number"
                      step={0.001}
                      value={commercialAdj}
                      onChange={(e) => setCommercialAdj(Number(e.target.value))}
                      className="font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Potongan kesepakatan QS (endapan/lumpur)</span>
                  </div>
                </div>

                {(() => {
                  const loaded = selectedDelivery.loadedVolumeM3;
                  const physicalDiff = receivedVol - loaded;
                  const pct = loaded > 0 ? (Math.abs(physicalDiff) / loaded) * 100 : 0;
                  const approved = Math.max(0, receivedVol - commercialAdj);
                  const contract = contracts.find((c) => c.id === selectedDelivery.contractId);
                  const tolerance = contract?.tolerancePercent || 2.0;
                  const isOver = pct > tolerance;

                  return (
                    <div className="p-3.5 rounded-lg bg-muted border text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Selisih Fisik (Received - Loaded):</span>
                        <span
                          className={`font-mono font-bold ${
                            physicalDiff < 0 ? 'text-destructive' : physicalDiff > 0 ? 'text-emerald-600' : 'text-foreground'
                          }`}
                        >
                          {physicalDiff === 0 ? '0.00' : `${physicalDiff > 0 ? '+' : '-'}${Math.abs(physicalDiff).toFixed(2)}`} m³ ({pct.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status Terhadap Toleransi ({tolerance}%):</span>
                        <Badge variant="outline" className={isOver ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200'}>
                          {isOver ? 'DI ATAS TOLERANSI (ABOVE_TOLERANCE)' : 'DALAM TOLERANSI (WITHIN_TOLERANCE)'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-bold text-foreground">Volume Resmi Ditagih (Approved m³):</span>
                        <span className="font-mono font-extrabold text-base text-primary">{approved.toFixed(2)} m³</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Klasifikasi Alasan Selisih *</Label>
                  <Select value={reason} onValueChange={(v) => setReason(v as VarianceReason)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIANCE_REASONS.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Catatan Review QS / Berita Acara Rekonsiliasi</Label>
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Keterangan kesepakatan bersama Quantity Surveyor proyek..."
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDelivery(null)}>
                    Batal
                  </Button>
                  <Button type="submit" size="sm" className="gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Simpan Rekonsiliasi & Finalisasi Approved m³
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
