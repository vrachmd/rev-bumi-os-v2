import React, { useMemo, useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, Truck } from 'lucide-react-native';
import { colors, font, radius } from '../theme/tokens';

const normalizePlate = (s: string) => s.toUpperCase().replace(/\s+/g, '').trim();
const formatPlate = (s: string) => {
  const n = normalizePlate(s);
  const m = n.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return s.toUpperCase().trim();
};

interface VehicleOption {
  id: string;
  name: string; // plate
  vendorId: string;
  detail?: string;
}

interface Props {
  label?: string;
  vendorId: string;
  vehicles: VehicleOption[];
  value: string; // vehicleId
  onSelect: (id: string) => void;
  onCreateFromPlate?: (plate: string) => void;
  placeholder?: string;
}

export const VehiclePlateInput: React.FC<Props> = ({
  label = 'Armada Truk',
  vendorId,
  vehicles,
  value,
  onSelect,
  onCreateFromPlate,
  placeholder = 'Ketik plat nomor, mis. B 9945 TYT',
}) => {
  const scoped = useMemo(() => vehicles.filter((v) => !vendorId || v.vendorId === vendorId), [vehicles, vendorId]);
  const selected = scoped.find((v) => v.id === value);
  const [query, setQuery] = useState(selected?.name ?? '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setQuery(selected?.name ?? '');
  }, [selected?.name, value]);

  const qNorm = normalizePlate(query);
  const filtered = useMemo(() => {
    if (!qNorm) return scoped.slice(0, 8);
    return scoped.filter((v) => normalizePlate(v.name).includes(qNorm)).slice(0, 8);
  }, [scoped, qNorm]);

  const showDropdown = focused;
  const canCreate = qNorm.length >= 4 && !filtered.some((v) => normalizePlate(v.name) === qNorm);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        <Search size={16} color={colors.muted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            // if user clears, clear selection
            if (!t.trim()) onSelect('');
            else {
              // if exact match, auto-select (helps keyboard submit)
              const exact = scoped.find((v) => normalizePlate(v.name) === normalizePlate(t));
              if (exact) onSelect(exact.id);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedLight}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {selected ? (
          <View style={styles.badge}>
            <Truck size={12} color={colors.primary} />
          </View>
        ) : null}
      </View>
      {vendorId ? null : <Text style={styles.hint}>Pilih vendor dulu untuk filter armada</Text>}
      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>Tidak ada plat cocok</Text>
            ) : (
              filtered.map((o) => (
                <Pressable
                  key={o.id}
                  style={[styles.option, o.id === value && styles.optionActive]}
                  onPress={() => {
                    setQuery(o.name);
                    onSelect(o.id);
                    setFocused(false);
                  }}
                >
                  <Text style={[styles.optionName, o.id === value && styles.optionNameActive]}>{o.name}</Text>
                  {o.detail ? <Text style={styles.optionDetail}>{o.detail}</Text> : null}
                </Pressable>
              ))
            )}
            {canCreate && onCreateFromPlate && (
              <Pressable
                style={styles.create}
                onPress={() => {
                  const formatted = formatPlate(query);
                  onCreateFromPlate(formatted);
                  setQuery(formatted);
                }}
              >
                <Text style={styles.createText}>+ Tambah armada {formatPlate(query)}</Text>
                <Text style={styles.createSub}>Buat plat baru untuk vendor terpilih</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
      {selected ? <Text style={styles.selectedHint}>Terpilih: {selected.name} • {selected.detail ?? ''}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 11, fontFamily: font.semiBold, color: '#475569', marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    gap: 8,
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: '#FFFFFF' },
  input: { flex: 1, paddingVertical: 10, fontSize: 13, fontFamily: font.regular, color: '#0F172A' },
  badge: { backgroundColor: colors.successBg, borderRadius: 6, padding: 4, borderWidth: 1, borderColor: colors.successBorder },
  hint: { fontSize: 10, fontFamily: font.regular, color: colors.mutedLight, marginTop: 4 },
  selectedHint: { fontSize: 10, fontFamily: font.medium, color: colors.primary, marginTop: 4 },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    maxHeight: 240,
  },
  scroll: { maxHeight: 240 },
  empty: { padding: 12, fontSize: 12, fontFamily: font.regular, color: colors.muted, textAlign: 'center' },
  option: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.mutedBg },
  optionActive: { backgroundColor: colors.successBg },
  optionName: { fontSize: 13, fontFamily: font.semiBold, color: '#0F172A' },
  optionNameActive: { color: colors.primary },
  optionDetail: { fontSize: 10, fontFamily: font.regular, color: colors.mutedLight, marginTop: 2 },
  create: { padding: 12, backgroundColor: '#FFFBEB', borderTopWidth: 1, borderTopColor: colors.warnBorder },
  createText: { fontSize: 12, fontFamily: font.bold, color: '#92400E' },
  createSub: { fontSize: 10, fontFamily: font.regular, color: '#B45309', marginTop: 2 },
});
