import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import type { NewRitaseInput } from '../store/useAppStore';

type Row = Partial<NewRitaseInput> & { plate?: string };

const EMPTY_ROW = (): Row => ({ driverName: '', driverPhone: '' });

export const BulkQuarryScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { quarries, products, vendors, vehicles, contracts, bulkAddRitase } = useAppStore();
  // 10 baris default
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 10 }, EMPTY_ROW));
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const isRowValid = (r: Row) => !!(r.contractId && r.productId && r.quarryId && r.transportVendorId && r.vehicleId);

  const handleSubmit = () => {
    const valid: NewRitaseInput[] = rows.filter(isRowValid).map((r) => ({
      contractId: r.contractId!,
      productId: r.productId!,
      quarryId: r.quarryId!,
      transportVendorId: r.transportVendorId!,
      vehicleId: r.vehicleId!,
      driverName: r.driverName || 'Supir Vendor Armada',
      driverPhone: r.driverPhone || '',
    }));
    if (valid.length === 0) {
      Alert.alert('Belum ada baris valid', 'Isi minimal kontrak, produk, quarry, vendor, plat per baris');
      return;
    }
    setSubmitting(true);
    const res = bulkAddRitase(valid);
    setSubmitting(false);
    Alert.alert('Berhasil', `${res.ok} ritase dibuat — batch ${res.batchId}${valid.length < rows.filter(r=>r.contractId||r.vehicleId).length ? ' (beberapa baris invalid dilewati)' : ''}`);
    setRows(Array.from({ length: 10 }, EMPTY_ROW));
    onBack?.();
  };

  const addRow = () => setRows((prev) => (prev.length >= 20 ? prev : [...prev, EMPTY_ROW()]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>Ritase Massal — 10 baris</Text>
          <Text style={{ fontSize: 11, color: '#64748B' }}>Isi plat & master, kosong dilewati. Offline antri otomatis.</Text>
        </View>
        {onBack && <TouchableOpacity onPress={onBack} style={{ padding: 8 }}><Text style={{ color: '#003C16', fontWeight: '700' }}>Tutup</Text></TouchableOpacity>}
      </View>

      {rows.map((r, idx) => {
        const valid = isRowValid(r);
        return (
          <View key={idx} style={{ backgroundColor: valid ? 'white' : '#FFF7F7', borderRadius: 12, borderWidth: 1, borderColor: valid ? '#E2E8F0' : '#FECACA', padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>#{idx + 1}</Text>
              <Text style={{ fontSize: 11, color: valid ? '#059669' : '#DC2626', fontWeight: '700' }}>{valid ? 'Valid' : 'Lengkapi'}</Text>
            </View>
            {/* Quarry picker (simple text + cycle) */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                onPress={() => {
                  const next = quarries[0];
                  if (!next) return;
                  // cycle demo: pick first quarry
                  updateRow(idx, { quarryId: next.id });
                }}
                style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, backgroundColor: 'white' }}
              >
                <Text style={{ fontSize: 11, color: '#64748B' }}>Quarry</Text>
                <Text style={{ fontSize: 12, fontWeight: '700' }}>{quarries.find((q) => q.id === r.quarryId)?.name || 'Pilih quarry'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const p = products[0];
                  if (p) updateRow(idx, { productId: p.id });
                }}
                style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, backgroundColor: 'white' }}
              >
                <Text style={{ fontSize: 11, color: '#64748B' }}>Produk</Text>
                <Text style={{ fontSize: 12, fontWeight: '700' }}>{products.find((p) => p.id === r.productId)?.name || 'Pilih produk'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  const v = vendors[0];
                  if (v) updateRow(idx, { transportVendorId: v.id });
                }}
                style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, backgroundColor: 'white' }}
              >
                <Text style={{ fontSize: 11, color: '#64748B' }}>Vendor</Text>
                <Text style={{ fontSize: 12, fontWeight: '700' }}>{vendors.find((v) => v.id === r.transportVendorId)?.name || 'Pilih vendor'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const vh = vehicles[0];
                  if (vh) updateRow(idx, { vehicleId: vh.id });
                }}
                style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, backgroundColor: 'white' }}
              >
                <Text style={{ fontSize: 11, color: '#64748B' }}>Plat</Text>
                <Text style={{ fontSize: 12, fontWeight: '700' }}>{vehicles.find((v) => v.id === r.vehicleId)?.name || 'Pilih plat'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  const c = contracts[0];
                  if (c) updateRow(idx, { contractId: c.id } as any);
                }}
                style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, backgroundColor: 'white' }}
              >
                <Text style={{ fontSize: 11, color: '#64748B' }}>Kontrak</Text>
                <Text style={{ fontSize: 12, fontWeight: '700' }}>{contracts.find((c) => c.id === r.contractId)?.id || 'Pilih kontrak'}</Text>
              </TouchableOpacity>
              <TextInput
                placeholder="Supir"
                value={r.driverName}
                onChangeText={(t) => updateRow(idx, { driverName: t })}
                style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 12 }}
              />
            </View>
            <TextInput
              placeholder="HP Supir"
              value={r.driverPhone}
              onChangeText={(t) => updateRow(idx, { driverPhone: t })}
              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 12 }}
              keyboardType="phone-pad"
            />
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={addRow} disabled={rows.length >= 20} style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', color: '#334155' }}>+ Tambah Baris ({rows.length}/20)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ flex: 1, backgroundColor: '#003C16', borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ fontWeight: '900', color: 'white' }}>{submitting ? 'Menyimpan...' : `Simpan ${rows.filter(isRowValid).length} Ritase`}</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>Metode bayar vendor: auto dari freight_rates (ALL_IN hijau / PER_TRIP biru), 6 model tetap.</Text>
    </ScrollView>
  );
};
