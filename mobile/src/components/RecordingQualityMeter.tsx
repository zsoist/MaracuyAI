import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RecordingQualityLabel } from '../hooks/useRecordingQuality';
import { useI18n } from '../i18n/useI18n';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface RecordingQualityMeterProps {
  currentLevel: number;
  averageLevel: number;
  peakLevel: number;
  label: RecordingQualityLabel;
  guidance: string;
}

function qualityColor(label: RecordingQualityLabel): string {
  switch (label) {
    case 'poor':
      return '#EF4444';
    case 'fair':
      return '#F59E0B';
    case 'good':
      return '#22C55E';
    case 'excellent':
      return '#16A34A';
    default:
      return colors.primary;
  }
}

function qualityLabelKey(label: RecordingQualityLabel): 'qualityPoor' | 'qualityFair' | 'qualityGood' | 'qualityExcellent' {
  switch (label) {
    case 'poor':
      return 'qualityPoor';
    case 'fair':
      return 'qualityFair';
    case 'good':
      return 'qualityGood';
    case 'excellent':
      return 'qualityExcellent';
    default:
      return 'qualityFair';
  }
}

export function RecordingQualityMeter({
  currentLevel,
  averageLevel,
  peakLevel,
  label,
  guidance,
}: RecordingQualityMeterProps) {
  const { t } = useI18n();
  const color = qualityColor(label);
  const widthPct: `${number}%` = `${Math.round(currentLevel * 100)}%`;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{t('qualityTitle')}</Text>
        <Text style={[styles.value, { color }]}>{t(qualityLabelKey(label))}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: widthPct, backgroundColor: color }]} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{t('qualityAverage', { value: Math.round(averageLevel * 100) })}</Text>
        <Text style={styles.meta}>{t('qualityPeak', { value: Math.round(peakLevel * 100) })}</Text>
      </View>
      <Text style={styles.guidance}>{guidance}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  value: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: radius.round,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.round,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  guidance: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
