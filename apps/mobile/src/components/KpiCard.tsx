import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow } from '../theme/tokens';

interface KpiCardProps {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, accent = colors.primary, sub }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 84,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
    ...shadow.card,
    overflow: 'hidden',
  },
  label: {
    fontSize: 9,
    fontFamily: font.extraBold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 18,
    fontFamily: font.black,
    marginTop: 6,
    color: colors.text,
  },
  sub: {
    fontSize: 9,
    fontFamily: font.regular,
    color: colors.mutedLight,
    marginTop: 4,
    lineHeight: 12,
  },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
});