import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { User, LogOut, Camera, Image as ImageIcon, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../utils/supabase';
import { useAppStore } from '../store/useAppStore';

export const ProfileScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [avatar, setAvatar] = useState<string | null>(null);
  const setOnline = useAppStore((s) => s.setOnline);

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setAvatar(res.assets[0].uri);
    // TODO: upload to supabase.storage.from('avatars') + update profiles.avatar_url
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setAvatar(res.assets[0].uri);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setOnline(false);
    onClose();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Saya</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{profile.name.charAt(0)}</Text></View>
            )}
            <View style={styles.avatarBadge}><ShieldCheck size={12} color="#FFFFFF" /></View>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{profile.role}</Text></View>
          <Text style={styles.email}>Akun terhubung Supabase</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={pickFromGallery}>
            <ImageIcon size={16} color="#003C16" /><Text style={styles.actionText}> Galeri</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={takePhoto}>
            <Camera size={16} color="#003C16" /><Text style={styles.actionText}> Kamera</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Foto dari galeri/kamera HP — nanti simpan ke Supabase Storage `avatars`.</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}><User size={14} color="#64748B" /><Text style={styles.infoLabel}> Role</Text><Text style={styles.infoValue}>{profile.role}</Text></View>
          <View style={styles.divider} />
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Versi</Text><Text style={styles.infoValue}>1.0.0 · Vercel 119de1a</Text></View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={16} color="#FFFFFF" /><Text style={styles.logoutText}> Keluar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#003C16' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#003C16', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  name: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 10 },
  roleBadge: { marginTop: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '800', color: '#047857' },
  email: { fontSize: 11, color: '#64748B', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700', color: '#003C16' },
  hint: { fontSize: 10, color: '#94A3B8', marginTop: 6, textAlign: 'center' },
  infoCard: { marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  infoValue: { fontSize: 11, fontWeight: '800', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  logoutBtn: { marginTop: 16, backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
