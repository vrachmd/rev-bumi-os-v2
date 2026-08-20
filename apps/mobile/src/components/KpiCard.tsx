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
    minHeight: 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
    color: '#0F172A',
  },
  sub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 12,
  },
});