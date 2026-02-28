import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

interface TipBannerProps {
  text: string;
}

export function TipBanner({ text }: TipBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{'💡'}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.infoSurface,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 16,
    lineHeight: 20,
  },
  text: {
    flex: 1,
    fontSize: typography.caption,
    lineHeight: 18,
    color: colors.textPrimary,
  },
});
