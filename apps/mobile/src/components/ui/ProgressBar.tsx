import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, font } from '../../theme/tokens';

export const ProgressBar: React.FC<{ value: number; color?: string; width?: number }> = ({ value, color = colors.primary, width = 110 }) => {
  const w = Math.min(100, Math.max(8, value));
  return (
    <View style={[styles.bg, { width }]}>
      <View style={[styles.fill, { width: `${w}%`, backgroundColor: color }]} />
    </View>
  );
};

export const ProgressRow: React.FC<{ label: string; value: number; color: string; meta: string }> = ({ label, value, color, meta }) => (
  <View style={styles.row}>
    <Text style={styles.label} numberOfLines={1}>{label}</Text>
    <ProgressBar value={value} color={color} />
    <Text style={[styles.pct, { color }]}>{meta}</Text>
  </View>
);

const styles = StyleSheet.create({
  bg: { height: 7, backgroundColor: colors.mutedBg, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  label: { fontSize: 10, fontFamily: font.bold, color: '#475569', width: 90 },
  pct: { fontSize: 10, fontFamily: font.black, width: 90, textAlign: 'right' },
});
