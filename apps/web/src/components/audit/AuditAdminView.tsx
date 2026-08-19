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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatDateTime } from '../../lib/formatters';
import { AuditLog, CorrectionRequest } from '../../types';
import { fetchAuditLogsFromSupabase } from '../../lib/supabaseAudit';
import { isSupabaseConfigured } from '../../lib/supabase';

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
    fetchAuditLogsFromSupabase({ limit: 200 }).then(({ data, error }) => {
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

    setIsRequestModalOpen(false);
  };

  const handleExecuteReview = (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingRequest) return;
    reviewCorrectionRequest(reviewingRequest.id, status, reviewNotes);
    setReviewingRequest(null);
    setReviewNotes('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Tab Switcher & Action */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('audit-trail')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'audit-trail'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> Immutable Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'corrections'
                ? 'bg-[#003C16] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Pengajuan Koreksi Data ({correctionRequests.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3.5 py-2 rounded-md bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
          >
            <ShieldAlert className="w-4 h-4" /> Ajukan Koreksi Surat Jalan
          </button>
        </div>
      </div>

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
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari identitas dokumen, user, atau tindakan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Tabel:</span>
              <select
                value={selectedTableFilter}
                onChange={(e) => setSelectedTableFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-slate-50 font-semibold text-slate-800"
              >
                <option value="ALL">Semua Tabel Database</option>
                <option value="deliveries">Deliveries (Surat Jalan)</option>
                <option value="invoices">Invoices (Faktur)</option>
                <option value="payments">Payments (Pembayaran)</option>
                <option value="contracts">Contracts (Kontrak)</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-3.5">Waktu & Timestamp</th>
                    <th className="py-3 px-3">Tabel Entitas</th>
                    <th className="py-3 px-3">Identitas Dokumen</th>
                    <th className="py-3 px-3">Aksi / Event</th>
                    <th className="py-3 px-3">Pelaku Perubahan</th>
                    <th className="py-3 px-3">Catatan / Alasan</th>
                    <th className="py-3 px-3 text-center">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {log.tableName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {log.recordIdentifier}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'STATUS_CHANGE'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'RECONCILE'
                              ? 'bg-purple-100 text-purple-800'
                              : log.action === 'CORRECTION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">{log.changedBy}</p>
                        <span className="text-[10px] text-slate-500 font-mono">({log.userRole})</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {log.reason || 'Operasi reguler sistem'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedLogForDetails(log)}
                          className="p-1 rounded text-slate-500 hover:text-[#003C16] hover:bg-slate-100"
                          title="Lihat Detail Diff JSON"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
      )}

      {/* CORRECTION REQUESTS */}
      {activeTab === 'corrections' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3.5">No. Pengajuan</th>
                  <th className="py-3 px-3">Target Dokumen</th>
                  <th className="py-3 px-3">Pemohon</th>
                  <th className="py-3 px-3">Waktu Diajukan</th>
                  <th className="py-3 px-3">Alasan Koreksi</th>
                  <th className="py-3 px-3">Status Permohonan</th>
                  <th className="py-3 px-3 text-center">Tindakan QS / Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {correctionRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{req.id}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-[#003C16] block">
                        {req.targetNumber}
                      </span>
                      <span className="text-[10px] text-slate-500">Tipe: {req.targetType}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{req.requestedBy}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {formatDateTime(req.requestedAt)}
                    </td>
                    <td className="py-3 px-3 text-slate-700 max-w-sm">{req.reason}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {req.status === 'PENDING' ? (
                        <button
                          onClick={() => setReviewingRequest(req)}
                          className="px-2.5 py-1 rounded bg-[#003C16] hover:bg-[#002B10] text-white text-[11px] font-bold shadow-2xs"
                        >
                          Review & Setujui
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          Diputuskan oleh {req.reviewedBy || 'Management'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Correction Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-amber-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Pengajuan Koreksi Data Resmi
              </h3>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCorrection} className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Sesuai tata kelola REV Bumi OS, data yang sudah disetujui tidak dapat dihapus
                  sembarangan melainkan melalui proses pengajuan koreksi resmi dan tercatat pada audit trail.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Pilih Surat Jalan / Dokumen Target *
                </label>
                <select
                  value={correctionTargetId}
                  onChange={(e) => setCorrectionTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono font-medium"
                >
                  {deliveries.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.deliveryNumber} (Vol Approved: {d.approvedVolumeM3} m³)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Volume Rekonsiliasi yang Diusulkan (m³) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={proposedNewApprovedVol}
                  onChange={(e) => setProposedNewApprovedVol(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Alasan & Justifikasi Koreksi Resmi *
                </label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-3 py-2 rounded-md font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md font-bold text-white bg-amber-700 hover:bg-amber-800 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Ajukan ke Management
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Approve Request Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Review Pengajuan Koreksi Data
              </h3>
              <button
                onClick={() => setReviewingRequest(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p>
                  <strong>Target Dokumen:</strong> {reviewingRequest.targetNumber}
                </p>
                <p>
                  <strong>Pemohon:</strong> {reviewingRequest.requestedBy}
                </p>
                <p>
                  <strong>Alasan:</strong> {reviewingRequest.reason}
                </p>
                <p className="font-mono text-emerald-800">
                  <strong>Usulan Perubahan:</strong>{' '}
                  {JSON.stringify(reviewingRequest.proposedChanges)}
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Catatan Evaluasi Direksi / QS
                </label>
                <input
                  type="text"
                  placeholder="e.g. Disetujui berdasarkan hasil cek ulang slip timbangan quarry."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleExecuteReview('REJECTED')}
                  className="px-3.5 py-2 rounded-md font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" /> Tolak Pengajuan
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteReview('APPROVED')}
                  className="px-4 py-2 rounded-md font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Setujui & Terapkan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Diff Inspector Modal */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                Log Detail Diff: {selectedLogForDetails.recordIdentifier}
              </h3>
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">
                  Nilai Sebelum Perubahan (Old Values):
                </span>
                <pre className="mt-1 p-3 bg-rose-50 text-rose-900 rounded border border-rose-200 text-[11px] overflow-x-auto">
                  {selectedLogForDetails.oldValues
                    ? JSON.stringify(selectedLogForDetails.oldValues, null, 2)
                    : '(Initial / Null)'}
                </pre>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">
                  Nilai Sesudah Perubahan (New Values):
                </span>
                <pre className="mt-1 p-3 bg-emerald-50 text-emerald-900 rounded border border-emerald-200 text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLogForDetails.newValues, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
