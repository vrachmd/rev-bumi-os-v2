import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface KpiCardProps {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, accent = '#003C16', sub }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  sub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});