import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { importLocalStorageToSupabase, ImportSummary } from '../../lib/supabaseImport';

export const DataSyncView: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const totalInserted = result?.reduce((sum, r) => sum + r.inserted, 0) ?? 0;
  const totalFailed = result?.reduce((sum, r) => sum + r.failed, 0) ?? 0;

  const handleImport = async () => {
    setRunning(true);
    setError(null);
    try {
      const summaries = await importLocalStorageToSupabase();
      setResult(summaries);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menjalankan import.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#003C16] flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              Sinkronisasi Data ke Supabase
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Impor data yang tersimpan di localStorage (key <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">rev_*</code>)
              ke database Supabase. Dipakai sekali saat migrasi Fase 0 untuk menjadikan Supabase
              sebagai single source of truth.
            </p>

            {!configured && (
              <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Supabase belum dikonfigurasi (cek <code className="font-mono">.env.local</code>).
                  Import baru bisa dijalankan setelah env terisi.
                </span>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleImport}
                disabled={running || !configured}
                className="flex items-center gap-2 bg-[#003C16] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#005020] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {running ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {running ? 'Mengimpor...' : 'Mulai Impor'}
              </button>

              {result && (
                <span className="text-sm text-slate-600">
                  <CheckCircle2 className="inline w-4 h-4 text-emerald-600 mr-1" />
                  {totalInserted} baris terimpor
                  {totalFailed > 0 && (
                    <span className="text-red-600 ml-2">
                      <XCircle className="inline w-4 h-4 mr-1" />
                      {totalFailed} gagal
                    </span>
                  )}
                </span>
              )}
            </div>

            {error && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Hasil Impor per Tabel</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-5 py-2.5 font-semibold">Tabel</th>
                <th className="px-5 py-2.5 font-semibold">Inserted</th>
                <th className="px-5 py-2.5 font-semibold">Failed</th>
              </tr>
            </thead>
            <tbody>
              {result.map((row) => (
                <tr key={row.table} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-700">{row.table}</td>
                  <td className="px-5 py-2.5 text-emerald-600 font-semibold">{row.inserted}</td>
                  <td className="px-5 py-2.5">
                    {row.failed > 0 ? (
                      <span className="text-red-600 font-semibold">{row.failed}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};