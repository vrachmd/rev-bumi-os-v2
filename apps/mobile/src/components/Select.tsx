import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface SelectProps {
  label: string;
  value?: string;
  placeholder?: string;
  options: { id: string; name: string; detail?: string }[];
  onSelect: (id: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  placeholder = 'Pilih...',
  options,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setOpen((v) => !v)}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected ? selected.name : placeholder}
        </Text>
        <Text style={styles.caret}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={styles.options}>
          <ScrollView style={styles.optionsScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((o) => (
              <Pressable
                key={o.id}
                style={[styles.option, o.id === value && styles.optionActive]}
                onPress={() => {
                  onSelect(o.id);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionName, o.id === value && styles.optionNameActive]}>{o.name}</Text>
                {o.detail ? <Text style={styles.optionDetail}>{o.detail}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  value: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  placeholder: { fontSize: 13, color: '#94A3B8' },
  caret: { fontSize: 10, color: '#94A3B8' },
  options: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    maxHeight: 220,
  },
  optionsScroll: { maxHeight: 220 },
  option: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionActive: { backgroundColor: '#ECFDF5' },
  optionName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  optionNameActive: { color: '#003C16' },
  optionDetail: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
});