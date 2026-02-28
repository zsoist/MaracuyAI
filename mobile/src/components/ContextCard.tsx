import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../i18n/useI18n';
import type { ContextSnapshot, RiskEvent } from '../types';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface ContextCardProps {
  contextSnapshot: ContextSnapshot | null;
  riskEvents: RiskEvent[];
  onConfigureHabitat?: () => void;
}

function formatValue(value: number | null | undefined, suffix: string, fallback: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return `${Math.round(value)}${suffix}`;
}

export function ContextCard({ contextSnapshot, riskEvents, onConfigureHabitat }: ContextCardProps) {
  const { t } = useI18n();

  if (!contextSnapshot) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('contextTitle')}</Text>
        <Text style={styles.emptyText}>{t('contextEmpty')}</Text>
        {onConfigureHabitat && (
          <TouchableOpacity style={styles.button} onPress={onConfigureHabitat}>
            <Text style={styles.buttonText}>{t('contextConfigure')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('contextTitle')}</Text>
      <View style={styles.grid}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('contextTemp')}</Text>
          <Text style={styles.metricValue}>
            {formatValue(contextSnapshot.temperature_c, '°C', t('commonUnavailable'))}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('contextHumidity')}</Text>
          <Text style={styles.metricValue}>
            {formatValue(contextSnapshot.relative_humidity_pct, '%', t('commonUnavailable'))}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('contextAqi')}</Text>
          <Text style={styles.metricValue}>
            {formatValue(contextSnapshot.aqi_us, '', t('commonUnavailable'))}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('contextWind')}</Text>
          <Text style={styles.metricValue}>
            {formatValue(contextSnapshot.wind_speed_kph, ' km/h', t('commonUnavailable'))}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {t('contextSource', {
          weather: contextSnapshot.source_weather || t('commonUnavailable'),
          air: contextSnapshot.source_aqi || t('commonUnavailable'),
        })}
      </Text>
      {riskEvents.length > 0 && (
        <View style={styles.riskList}>
          {riskEvents.slice(0, 2).map((event) => (
            <View key={event.id} style={styles.riskItem}>
              <Text style={styles.riskTitle}>{event.title}</Text>
              {event.details ? <Text style={styles.riskDetails}>{event.details}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.section,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  button: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.caption,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    columnGap: spacing.sm,
  },
  metric: {
    width: '48%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.sm,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  metricValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  meta: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 11,
  },
  riskList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  riskItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.alertBorder,
    backgroundColor: colors.alertSurface,
    padding: spacing.sm,
  },
  riskTitle: {
    color: '#7F1D1D',
    fontWeight: '700',
    fontSize: typography.caption,
  },
  riskDetails: {
    marginTop: spacing.xs,
    color: '#7F1D1D',
    fontSize: 12,
    lineHeight: 16,
  },
});
