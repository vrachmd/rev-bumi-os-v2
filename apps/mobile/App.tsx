import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainTabs } from './src/navigation/MainTabs';
import { LoginScreen } from './src/screens/LoginScreen';
import { supabase, isSupabaseConfigured } from './src/utils/supabase';
import {
  fetchMobileDeliveriesFromSupabase,
  fetchMobileMasterFromSupabase,
  subscribeMobileDeliveryChanges,
} from './src/utils/supabaseData';
import { useAppStore } from './src/store/useAppStore';
import type { MobileRole } from './src/types';

const ROLE_FROM_DB: Record<string, MobileRole> = {
  QUARRY_CHECKER: 'QUARRY_CHECKER',
  SITE_CHECKER: 'SITE_CHECKER',
  MANAGEMENT: 'MANAGEMENT',
};

export default function App() {
  const [session, setSession] = useState<boolean>(!isSupabaseConfigured());
  const [ready, setReady] = useState<boolean>(!isSupabaseConfigured());
  const setProfile = useAppStore((s) => s.setProfile);
  const hydrateMaster = useAppStore((s) => s.hydrateMaster);
  const hydrateDeliveries = useAppStore((s) => s.hydrateDeliveries);
  const setOnline = useAppStore((s) => s.setOnline);
  const refreshQueueStatus = useAppStore((s) => s.refreshQueueStatus);
  useEffect(() => {
    void refreshQueueStatus();
  }, [refreshQueueStatus]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const hydrateOnline = async () => {
      try {
        const [bundle, deliveries] = await Promise.all([
          fetchMobileMasterFromSupabase(),
          fetchMobileDeliveriesFromSupabase(),
        ]);
        hydrateMaster(bundle);
        hydrateDeliveries(deliveries);
        setOnline(true);
      } catch (e) {
        console.warn('[mobile] Gagal memuat data online, memakai seed lokal:', e);
        setOnline(false);
      }
    };

    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const userId = data.session.user.id;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', userId)
            .maybeSingle();
          if (profile?.full_name) {
            setProfile({
              name: profile.full_name,
              role: ROLE_FROM_DB[profile.role] ?? 'QUARRY_CHECKER',
            });
          }
        } catch {
          // profil gagal dimuat; tetap lanjut ke aplikasi
        }
        setSession(true);
        await hydrateOnline();
      } else {
        setSession(false);
      }
      setReady(true);
    };
    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(Boolean(currentSession?.user));
      if (currentSession?.user) {
        const userId = currentSession.user.id;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', userId)
            .maybeSingle();
          if (profile?.full_name) {
            setProfile({
              name: profile.full_name,
              role: ROLE_FROM_DB[profile.role] ?? 'QUARRY_CHECKER',
            });
          }
        } catch {
          // ignore
        }
        await hydrateOnline();
      }
    });

    const unsubscribeRealtime = subscribeMobileDeliveryChanges(async () => {
      try {
        const deliveries = await fetchMobileDeliveriesFromSupabase();
        hydrateDeliveries(deliveries);
      } catch {
        // realtime refresh gagal; abaikan
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      unsubscribeRealtime();
    };
  }, [setProfile, hydrateMaster, hydrateDeliveries, setOnline]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      {session ? (
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      ) : (
        <LoginScreen onDone={() => setSession(true)} />
      )}
    </SafeAreaProvider>
  );
}