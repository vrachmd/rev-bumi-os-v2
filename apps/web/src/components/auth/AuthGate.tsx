import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { LoginView } from './LoginView';

interface AuthGateProps {
  children: React.ReactNode;
  onDemoContinue: () => void;
  demoMode: boolean;
}

/**
 * Gate autentikasi web.
 * - Bila Supabase dikonfigurasi & demo belum diaktifkan: wajib sesi aktif.
 * - Bila demo diaktifkan atau Supabase belum dikonfigurasi: langsung tampilkan aplikasi.
 */
export const AuthGate: React.FC<AuthGateProps> = ({ children, onDemoContinue, demoMode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [configured]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (configured && !session && !demoMode) {
    return <LoginView onDemoContinue={onDemoContinue} />;
  }

  return <>{children}</>;
};