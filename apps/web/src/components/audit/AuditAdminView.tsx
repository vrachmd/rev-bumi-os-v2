import React, { useEffect, useState } from 'react';
import {
  History,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  FileCheck,
  AlertTriangle,
  UserCheck,
  ArrowRight,
  Eye,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatDateTime } from '../../lib/formatters';
import { AuditLog, CorrectionRequest } from '../../types';
import { fetchAuditLogsFromSupabase } from '../../lib/supabaseAudit';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const AuditAdminView: React.FC = () => {
  const {
    auditLogs: localAuditLogs,
    correctionRequests,
    currentProfile,
    reviewCorrectionRequest,
    submitCorrectionRequest,
    deliveries,
  } = useApp();
  // Fase 1: jika authed sebagai SUPER_ADMIN/MANAGEMENT, pakai audit server (append-only, timestamp server).
  const [serverLogs, setServerLogs] = useState<AuditLog[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const role = currentProfile.role;
    if (role !== 'SUPER_ADMIN' && role !== 'MANAGEMENT') return;
    let cancelled = false;
    fetchAuditLogsFromSupabase({ limit: 1000 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        // RLS forbidden untuk role lain sudah ditangani; tampilkan fallback lokal
        setServerError(error);
        return;
      }
      const mapped: AuditLog[] = (data as unknown as { id: number; table_name: string; record_id: string; record_identifier: string | null; action: AuditLog['action']; changed_by: string | null; user_role: string | null; old_values: unknown; new_values: unknown; reason: string | null; timestamp: string }[]).map((r) => ({
        id: `aud-${r.id}`,
        tableName: r.table_name,
        recordId: r.record_id,
        recordIdentifier: r.record_identifier ?? r.record_id,
        action: r.action,
        changedBy: r.changed_by ?? r.user_role ?? 'unknown',
        userRole: r.user_role ?? 'unknown',
        oldValues: r.old_values as Record<string, unknown> | undefined,
        newValues: r.new_values as Record<string, unknown> | undefined,
        reason: r.reason ?? undefined,
        timestamp: r.timestamp,
      }));
      setServerLogs(mapped);
    });
    return () => { cancelled = true; };
  }, [currentProfile.role]);
  const auditLogs = serverLogs ?? localAuditLogs;
  const usingServer = serverLogs !== null;

  const [activeTab, setActiveTab] = useState<'audit-trail' | 'corrections'>('audit-trail');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState('ALL');
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLog | null>(null);

  // New correction request state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [correctionTargetType, setCorrectionTargetType] = useState<
    'DELIVERY' | 'INVOICE' | 'RECONCILIATION'
  >('DELIVERY');
  const [correctionTargetId, setCorrectionTargetId] = useState(deliveries[0]?.id || '');
  const [correctionReason, setCorrectionReason] = useState(
    'Koreksi pembacaan tera timbangan slip quarry kotor / salah input tare.'
  );
  const [proposedNewApprovedVol, setProposedNewApprovedVol] = useState<number>(24.0);

  // Review modal state
  const [reviewingRequest, setReviewingRequest] = useState<CorrectionRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Filtered audit logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.recordIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.changedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTable = selectedTableFilter === 'ALL' || log.tableName === selectedTableFilter;
    return matchesSearch && matchesTable;
  });

  const handleExportAudit = () => {
    if (filteredLogs.length === 0) {
      toast.error('Tidak ada log audit untuk diekspor');
      return;
    }
    const rows = filteredLogs.map((log) => ({
      'WAKTU': log.timestamp,
      'TABEL': log.tableName,
      'IDENTITAS DOKUMEN': log.recordIdentifier,
      'AKSI': log.action,
      'PELAKU': log.changedBy,
      'ROLE': log.userRole,
      'ALASAN': log.reason || '',
      'OLD VALUES': log.oldValues ? JSON.stringify(log.oldValues) : '',
      'NEW VALUES': log.newValues ? JSON.stringify(log.newValues) : '',
    }));
    const headers = Object.keys(rows[0]!);
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REV_BUMI_AUDIT_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Audit trail diekspor — ${rows.length} baris (immutability terjaga)`);
  };

  const handleCreateCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    const targetDelivery = deliveries.find((d) => d.id === correctionTargetId);
    const targetNumber = targetDelivery?.deliveryNumber || 'REF-REQ';

    submitCorrectionRequest(
      correctionTargetType,
      correctionTargetId,
      targetNumber,
      correctionReason,
      {
        proposedApprovedVolumeM3: proposedNewApprovedVol,
      }
    );

    toast.success('Pengajuan koreksi diajukan ke Management');
    setIsRequestModalOpen(false);
  };

  const handleExecuteReview = (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingRequest) return;
    reviewCorrectionRequest(reviewingRequest.id, status, reviewNotes);
    toast.success(status === 'APPROVED' ? 'Koreksi disetujui & diterapkan' : 'Koreksi ditolak');
    setReviewingRequest(null);
    setReviewNotes('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Tab Switcher & Action — shadcn Tabs + Card + Button */}
      <Card className="py-3">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 p-0 px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="audit-trail" className="text-xs gap-1.5">
                <History className="w-4 h-4" /> Immutable Audit Trail ({auditLogs.length})
              </TabsTrigger>
              <TabsTrigger value="corrections" className="text-xs gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Pengajuan Koreksi Data ({correctionRequests.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button size="sm" onClick={() => setIsRequestModalOpen(true)} className="bg-amber-700 hover:bg-amber-800 w-full sm:w-auto">
            <ShieldAlert className="w-4 h-4" /> Ajukan Koreksi Surat Jalan
          </Button>
        </CardContent>
      </Card>

      {/* AUDIT TRAIL LOGS */}
      {activeTab === 'audit-trail' && (
        <>
          {usingServer ? (
            <div className="px-3 py-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 text-[11px] flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Sumber: <strong>Supabase audit_logs</strong> (append-only, timestamp server, RLS insert-only). Insert diizinkan semua role terautentikasi; read hanya SUPER_ADMIN/MANAGEMENT via RPC.
            </div>
          ) : serverError ? (
            <div className="px-3 py-2 rounded border border-amber-200 bg-amber-50 text-amber-900 text-[11px]">Audit server: {serverError} — menampilkan audit lokal (fallback).</div>
          ) : null}
        <div className="space-y-4">
          {/* Filter Bar — shadcn Card + Input + Select */}
          <Card className="py-3">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 p-0 px-3">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Cari identitas dokumen, user, atau tindakan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Tabel:</Label>
                <Select value={selectedTableFilter} onValueChange={setSelectedTableFilter}>
                  <SelectTrigger className="h-8 text-xs min-w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">Semua Tabel Database</SelectItem>
                    <SelectItem value="deliveries" className="text-xs">Deliveries (Surat Jalan)</SelectItem>
                    <SelectItem value="invoices" className="text-xs">Invoices (Faktur)</SelectItem>
                    <SelectItem value="payments" className="text-xs">Payments (Pembayaran)</SelectItem>
                    <SelectItem value="contracts" className="text-xs">Contracts (Kontrak)</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleExportAudit} className="gap-1.5 shrink-0">
                  <Download className="w-3.5 h-3.5" /> Unduh Audit CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table — shadcn Card + Table + Badge */}
          <Card className="overflow-hidden py-0 gap-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Waktu & Timestamp</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Tabel Entitas</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Identitas Dokumen</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Aksi / Event</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Pelaku Perubahan</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Catatan / Alasan</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50 text-xs">
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{formatDateTime(log.timestamp)}</TableCell>
                      <TableCell className="font-mono font-bold">
                        <Badge variant="outline" className="bg-muted text-muted-foreground">{log.tableName}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold">{log.recordIdentifier}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold border ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200'
                              : log.action === 'STATUS_CHANGE'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200'
                              : log.action === 'RECONCILE'
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200'
                              : log.action === 'CORRECTION'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{log.changedBy}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">({log.userRole})</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">{log.reason || 'Operasi reguler sistem'}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon-xs" onClick={() => setSelectedLogForDetails(log)} title="Lihat Detail Diff JSON">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        </>
      )}

      {/* CORRECTION REQUESTS — shadcn Card + Table + Badge */}
      {activeTab === 'corrections' && (
        <Card className="overflow-hidden py-0 gap-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">No. Pengajuan</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Target Dokumen</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Pemohon</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Waktu Diajukan</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Alasan Koreksi</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status Permohonan</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">Tindakan QS / Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correctionRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-muted/50 text-xs">
                    <TableCell className="font-mono font-bold">{req.id}</TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-primary block">{req.targetNumber}</span>
                      <span className="text-[10px] text-muted-foreground">Tipe: {req.targetType}</span>
                    </TableCell>
                    <TableCell className="font-semibold">{req.requestedBy}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{formatDateTime(req.requestedAt)}</TableCell>
                    <TableCell className="max-w-sm">{req.reason}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200'
                        }`}
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {req.status === 'PENDING' ? (
                        <Button size="xs" onClick={() => setReviewingRequest(req)} className="text-[11px] h-6">
                          Review & Setujui
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Diputuskan oleh {req.reviewedBy || 'Management'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-5 py-3.5 bg-amber-700 text-white rounded-t-lg shrink-0">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white">
              <ShieldAlert className="w-4 h-4" /> Pengajuan Koreksi Data Resmi
            </DialogTitle>
          </DialogHeader>

            <form onSubmit={handleCreateCorrection} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                <p>Sesuai tata kelola REV Bumi OS, data yang sudah disetujui tidak dapat dihapus sembarangan melainkan melalui proses pengajuan koreksi resmi dan tercatat pada audit trail.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Pilih Surat Jalan / Dokumen Target *</Label>
                <Select value={correctionTargetId} onValueChange={setCorrectionTargetId}>
                  <SelectTrigger className="text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveries.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs font-mono">{d.deliveryNumber} (Vol Approved: {d.approvedVolumeM3} m³)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Volume Rekonsiliasi yang Diusulkan (m³) *</Label>
                <Input type="number" step="0.01" required value={proposedNewApprovedVol} onChange={(e) => setProposedNewApprovedVol(Number(e.target.value))} className="font-mono font-bold" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Alasan & Justifikasi Koreksi Resmi *</Label>
                <Textarea rows={3} required value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="bg-amber-700 hover:bg-amber-800 gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Ajukan ke Management
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewingRequest} onOpenChange={(open) => !open && setReviewingRequest(null)}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-3.5 bg-primary text-primary-foreground rounded-t-lg shrink-0">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-primary-foreground">Review Pengajuan Koreksi Data</DialogTitle>
          </DialogHeader>

            {reviewingRequest && (
            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1.5 bg-muted p-3 rounded-lg border">
                <p>
                  <strong>Target Dokumen:</strong> {reviewingRequest.targetNumber}
                </p>
                <p>
                  <strong>Pemohon:</strong> {reviewingRequest.requestedBy}
                </p>
                <p>
                  <strong>Alasan:</strong> {reviewingRequest.reason}
                </p>
                <p className="font-mono text-emerald-700 dark:text-emerald-300">
                  <strong>Usulan Perubahan:</strong>{' '}
                  {JSON.stringify(reviewingRequest.proposedChanges)}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Catatan Evaluasi Direksi / QS</Label>
                <Input
                  placeholder="e.g. Disetujui berdasarkan hasil cek ulang slip timbangan quarry."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t">
                <Button variant="outline" size="sm" onClick={() => handleExecuteReview('REJECTED')} className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="w-4 h-4" /> Tolak Pengajuan
                </Button>
                <Button size="sm" onClick={() => handleExecuteReview('APPROVED')} className="gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Setujui & Terapkan Perubahan
                </Button>
              </div>
            </div>
            )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLogForDetails} onOpenChange={(open) => !open && setSelectedLogForDetails(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0 max-h-[85vh] flex flex-col">
          {selectedLogForDetails && (
            <>
              <DialogHeader className="px-5 py-3.5 bg-slate-900 text-white rounded-t-lg shrink-0">
                <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  Log Detail Diff: {selectedLogForDetails.recordIdentifier}
                </DialogTitle>
              </DialogHeader>

              <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Nilai Sebelum Perubahan (Old Values):</span>
                  <pre className="mt-1 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 rounded border border-rose-200 dark:border-rose-800 text-[11px] overflow-x-auto">
                    {selectedLogForDetails.oldValues
                      ? JSON.stringify(selectedLogForDetails.oldValues, null, 2)
                      : '(Initial / Null)'}
                  </pre>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Nilai Sesudah Perubahan (New Values):</span>
                  <pre className="mt-1 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 rounded border border-emerald-200 dark:border-emerald-800 text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLogForDetails.newValues, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
