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
import { Mountain, Lock, Mail, KeyRound } from 'lucide-react-native';
import { colors, font, radius } from '../theme/tokens';
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
              <Mountain size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>REV Bumi OS</Text>
            <Text style={styles.subtitle}>Sistem Operasi Rantai Pasok Agregat</Text>
            <Text style={styles.version}>PT REV Bumi Nusantara Perkasa</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Lock size={16} color={colors.primary} />
              <Text style={styles.cardTitle}>Masuk Akun Lapangan</Text>
            </View>

            {!configured && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Supabase belum dikonfigurasi — hubungi admin.</Text>
              </View>
            )}

            <View style={styles.inputWrap}>
              <Mail size={16} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Email"
                placeholderTextColor={colors.mutedLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputWrap}>
              <KeyRound size={16} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Password"
                placeholderTextColor={colors.mutedLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

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
  safe: { flex: 1, backgroundColor: colors.primary },
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
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  title: { color: '#fff', fontSize: 24, fontFamily: font.black, letterSpacing: 0.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: font.semiBold, marginTop: 4, textAlign: 'center' },
  version: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: font.regular, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: font.bold, color: colors.text },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: font.regular,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: font.regular,
    color: colors.text,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  infoBox: {
    backgroundColor: colors.warnBg,
    borderColor: colors.warnBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { color: '#92400E', fontSize: 12, fontFamily: font.regular, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 12, fontFamily: font.medium, marginBottom: 10 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontFamily: font.bold },
  demoButton: {
    marginTop: 10,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  demoButtonText: { color: colors.primary, fontSize: 13, fontFamily: font.semiBold },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
});