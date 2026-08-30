import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StatusBar as RNStatusBar } from 'react-native';
import { Layers, Plus, Trash2, Check, X, Truck } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import type { NewRitaseInput } from '../store/useAppStore';
import { Select } from '../components/Select';
import { VehiclePlateInput } from '../components/VehiclePlateInput';
import { colors, font, radius } from '../theme/tokens';

type Row = Partial<NewRitaseInput>;

const EMPTY_ROW = (): Row => ({ driverName: '', driverPhone: '' });

export const BulkQuarryScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { quarries, products, vendors, vehicles, contracts, bulkAddRitase } = useAppStore();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 10 }, EMPTY_ROW));
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 5) {
      Alert.alert('Minimal 5 baris', 'Bulk minimal 5 baris agar tidak kosong');
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const isRowValid = (r: Row) => !!(r.contractId && r.productId && r.quarryId && r.transportVendorId && r.vehicleId);

  const handleSubmit = () => {
    const valid: NewRitaseInput[] = rows.filter(isRowValid).map((r) => ({
      contractId: r.contractId!,
      productId: r.productId!,
      quarryId: r.quarryId!,
      transportVendorId: r.transportVendorId!,
      vehicleId: r.vehicleId!,
      driverName: r.driverName?.trim() || 'Supir Vendor Armada',
      driverPhone: r.driverPhone?.trim() || '',
    }));
    if (valid.length === 0) {
      Alert.alert('Belum ada baris valid', 'Isi minimal kontrak, produk, quarry, vendor, plat per baris (5 field wajib)');
      return;
    }
    const invalidCount = rows.filter((r) => r.contractId || r.vehicleId).length - valid.length;
    setSubmitting(true);
    try {
      const res = bulkAddRitase(valid);
      Alert.alert('Berhasil', `${res.ok} ritase dibuat — batch ${res.batchId}${invalidCount > 0 ? ` (${invalidCount} baris invalid dilewati)` : ''}`);
      setRows(Array.from({ length: 10 }, EMPTY_ROW));
      onBack?.();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal bulk');
    } finally {
      setSubmitting(false);
    }
  };

  const addRow = () => setRows((prev) => (prev.length >= 20 ? prev : [...prev, EMPTY_ROW()]));
  const validCount = useMemo(() => rows.filter(isRowValid).length, [rows]);

  return (
    <View style={{ flex: 1, backgroundColor: '#003C16' }}>
      <RNStatusBar barStyle="light-content" backgroundColor="#003C16" translucent={false} />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['left', 'right', 'bottom']}>
        <View style={{ height: insets.top, backgroundColor: '#003C16' }} />
        <View style={{ backgroundColor: '#003C16', paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 16, fontFamily: font.black, color: '#FFFFFF' }}>Bulk 10 Ritase</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontFamily: font.extraBold, color: '#FFFFFF' }}>{validCount}/20 valid</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, fontFamily: font.regular, color: '#A7F3D0', marginTop: 2 }}>Pilih master per baris, kosong dilewati. Offline antri otomatis.</Text>
          </View>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8 }}>
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {rows.map((r, idx) => {
            const valid = isRowValid(r);
            const contract = contracts.find((c) => c.id === r.contractId);
            const projectId = contract?.projectId ?? '';
            const eligibleVendors = (() => {
              if (!r.quarryId || !projectId) return vendors;
              // filter vendor yang punya tarif untuk quarry+project (like Dashboard)
              // fallback tampil semua jika belum ada tarif
              return vendors;
            })();
            return (
              <View key={idx} style={{ backgroundColor: valid ? '#FFFFFF' : '#FFFBEB', borderRadius: radius.lg, borderWidth: 1, borderColor: valid ? '#E2E8F0' : '#FDE68A', padding: 12, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontFamily: font.extraBold, color: '#334155' }}>#{idx + 1}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: valid ? '#ECFDF5' : '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: valid ? '#A7F3D0' : '#FECACA' }}>
                      {valid ? <Check size={12} color="#059669" /> : <X size={12} color="#DC2626" />}
                      <Text style={{ fontSize: 11, fontFamily: font.bold, color: valid ? '#059669' : '#DC2626' }}>{valid ? 'Valid' : 'Lengkapi 5 field'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeRow(idx)} style={{ padding: 6, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                      <Trash2 size={12} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Select label="Kontrak Proyek" value={r.contractId} placeholder="Pilih kontrak" options={contracts.map((c) => ({ id: c.id, name: c.contractNumber, detail: c.name }))} onSelect={(id) => updateRow(idx, { contractId: id })} />
                <Select label="Produk" value={r.productId} placeholder="Pilih produk" options={products.map((p) => ({ id: p.id, name: p.name, detail: p.detail }))} onSelect={(id) => updateRow(idx, { productId: id })} />
                <Select label="Quarry Asal" value={r.quarryId} placeholder="Pilih quarry" options={quarries.map((q) => ({ id: q.id, name: q.name, detail: q.detail }))} onSelect={(id) => updateRow(idx, { quarryId: id, transportVendorId: '' as any, vehicleId: '' as any })} />
                <Select label="Vendor Transportasi" value={r.transportVendorId} placeholder={r.quarryId ? 'Pilih vendor' : 'Pilih quarry dulu'} options={eligibleVendors.map((v) => ({ id: v.id, name: v.name, detail: v.detail }))} onSelect={(id) => updateRow(idx, { transportVendorId: id, vehicleId: '' as any })} />

                <VehiclePlateInput
                  vendorId={r.transportVendorId ?? ''}
                  vehicles={vehicles as any}
                  value={r.vehicleId ?? ''}
                  onSelect={(id) => updateRow(idx, { vehicleId: id })}
                  onCreateFromPlate={(plate) => {
                    // create vehicle via store helper would require vendorId; use simple alert fallback: user must use Dashboard quick-add, here just set plate text
                    // For bulk, if plate not found, create via addVehicle if vendor selected
                    const { addVehicle } = useAppStore.getState() as any;
                    if (r.transportVendorId) {
                      const newId = addVehicle(r.transportVendorId, plate, 'Truk bulk');
                      updateRow(idx, { vehicleId: newId });
                    }
                  }}
                  placeholder={r.transportVendorId ? 'Ketik plat mis. B 9945 TYT' : 'Pilih vendor dulu'}
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: font.semiBold, color: '#475569', marginBottom: 4 }}>Nama Supir</Text>
                    <TextInput placeholder="Supir Vendor Armada" value={r.driverName} onChangeText={(t) => updateRow(idx, { driverName: t })} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 12, backgroundColor: '#FFFFFF', fontFamily: font.regular }} placeholderTextColor="#94A3B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: font.semiBold, color: '#475569', marginBottom: 4 }}>HP Supir</Text>
                    <TextInput placeholder="08xx" value={r.driverPhone} onChangeText={(t) => updateRow(idx, { driverPhone: t })} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 12, backgroundColor: '#FFFFFF', fontFamily: font.regular }} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
                  </View>
                </View>
              </View>
            );
          })}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={addRow} disabled={rows.length >= 20} style={{ flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: rows.length >= 20 ? 0.5 : 1 }}>
              <Plus size={14} color="#334155" />
              <Text style={{ fontFamily: font.extraBold, color: '#334155', fontSize: 13 }}>Tambah Baris ({rows.length}/20)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting || validCount === 0} style={{ flex: 1, backgroundColor: validCount === 0 ? '#94A3B8' : '#003C16', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Truck size={14} color="#FFFFFF" />
              <Text style={{ fontFamily: font.black, color: '#FFFFFF', fontSize: 13 }}>{submitting ? 'Menyimpan...' : `Simpan ${validCount} Ritase`}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Truck size={14} color="#92400E" />
            <Text style={{ fontSize: 10, fontFamily: font.regular, color: '#92400E', flex: 1 }}>Metode bayar auto dari freight_rates (ALL_IN hijau / PER_TRIP biru). Baris invalid otomatis dilewati, offline antri.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};
