import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, shadow } from '../../theme/tokens';

export const Card: React.FC<ViewProps & { padded?: boolean }> = ({ style, padded = true, ...props }) => (
  <View style={[styles.card, padded && styles.padded, style]} {...props} />
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padded: { padding: 12 },
});
