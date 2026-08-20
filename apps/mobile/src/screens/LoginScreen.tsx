import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useAppStore } from '../store/useAppStore';
import type { MobileRole } from '../types';

const ROLE_FROM_DB: Record<string, MobileRole> = {
  QUARRY_CHECKER: 'QUARRY_CHECKER',
  SITE_CHECKER: 'SITE_CHECKER',
  MANAGEMENT: 'MANAGEMENT',
  SUPER_ADMIN: 'MANAGEMENT',
  OPERATIONS: 'MANAGEMENT',
  COMMERCIAL: 'MANAGEMENT',
  FINANCE: 'MANAGEMENT',
  DISPATCHER: 'MANAGEMENT',
};

export const LoginScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const setProfile = useAppStore((s) => s.setProfile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const handleLogin = async () => {
    if (!configured) {
      setError('Supabase belum dikonfigurasi — hubungi admin.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      const userId = data.user?.id;
      if (!userId) {
        setError('Login berhasil namun profil tidak ditemukan.');
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) {
        setError(`Gagal memuat profil: ${profileError.message}`);
        return;
      }
      setProfile({
        name: profile?.full_name ?? email.trim(),
        role: ROLE_FROM_DB[profile?.role] ?? 'QUARRY_CHECKER',
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan tidak terduga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>⛰️</Text>
            </View>
            <Text style={styles.title}>REV Bumi OS</Text>
            <Text style={styles.subtitle}>Sistem Operasi Rantai Pasok Material Konstruksi</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk Akun Lapangan</Text>

            {!configured && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Supabase belum dikonfigurasi — hubungi admin.</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (loading || !configured) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleLogin}
              disabled={loading || !configured}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Masuk</Text>
              )}
            </Pressable>

            {/* Demo dihapus Go-Live — wajib login Supabase */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#003C16' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { fontSize: 30 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { color: '#92400E', fontSize: 12, lineHeight: 18 },
  error: { color: '#DC2626', fontSize: 12, marginBottom: 10 },
  primaryButton: {
    backgroundColor: '#003C16',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  demoButton: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#003C16',
  },
  demoButtonText: { color: '#003C16', fontSize: 13, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
});