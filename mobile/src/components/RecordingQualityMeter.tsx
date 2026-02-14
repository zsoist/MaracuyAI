import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RecordingQualityLabel } from '../hooks/useRecordingQuality';
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

function qualityLabelText(label: RecordingQualityLabel): string {
  switch (label) {
    case 'poor':
      return 'Baja';
    case 'fair':
      return 'Media';
    case 'good':
      return 'Buena';
    case 'excellent':
      return 'Excelente';
    default:
      return 'N/A';
  }
}

export function RecordingQualityMeter({
  currentLevel,
  averageLevel,
  peakLevel,
  label,
  guidance,
}: RecordingQualityMeterProps) {
  const color = qualityColor(label);
  const widthPct: `${number}%` = `${Math.round(currentLevel * 100)}%`;
  const avgPct = `${Math.round(averageLevel * 100)}%`;
  const peakPct = `${Math.round(peakLevel * 100)}%`;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>Calidad de captura</Text>
        <Text style={[styles.value, { color }]}>{qualityLabelText(label)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: widthPct, backgroundColor: color }]} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Promedio: {avgPct}</Text>
        <Text style={styles.meta}>Pico: {peakPct}</Text>
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
