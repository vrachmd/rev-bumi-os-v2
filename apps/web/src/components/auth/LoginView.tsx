import React, { useState } from 'react';
import { LogIn, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface LoginViewProps {
  onDemoContinue?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
      }
      // Sukses: onAuthStateChange di AuthGate akan me-refresh sesi otomatis.
    } catch {
      setError('Gagal terhubung ke server autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-[#003C16] px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                <LogIn className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-extrabold text-lg leading-none">
                  REV BUMI OS
                </h1>
                <p className="text-emerald-200 text-xs mt-1 font-medium">
                  PT REV Bumi Nusantara Perkasa
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-8">
            {!configured && (
              <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Supabase belum dikonfigurasi (cek <code className="font-mono">.env.local</code> di Vercel →
                  Environment Variables).
                </span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nama@revbumi.co.id"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !configured}
                className="w-full flex items-center justify-center gap-2 bg-[#003C16] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#005020] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Masuk
              </button>
            </form>

            {/* Demo dihapus untuk Go-Live — wajib login Supabase (RLS 8 role) */}
          </div>
        </div>
      </div>
    </div>
  );
};