import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStatusColor, getStatusLabel } from 'shared-engine';
import type { DeliveryStatus } from 'shared-types';

const COLOR_MAP: Record<string, string> = {
  gray: '#64748B',
  blue: '#2563EB',
  orange: '#EA580C',
  purple: '#7C3AED',
  cyan: '#0891B2',
  amber: '#D97706',
  indigo: '#4F46E5',
  green: '#16A34A',
  emerald: '#059669',
  red: '#DC2626',
  slate: '#475569',
};

export const StatusBadge: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const color = COLOR_MAP[getStatusColor(status)] ?? COLOR_MAP.gray;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{getStatusLabel(status)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
});