import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ContextSnapshot, RiskEvent } from '../types';
import { colors, radius, spacing, typography } from '../theme/tokens';

interface ContextCardProps {
  contextSnapshot: ContextSnapshot | null;
  riskEvents: RiskEvent[];
  onConfigureHabitat?: () => void;
}

function formatValue(value: number | null | undefined, suffix: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${Math.round(value)}${suffix}`;
}

export function ContextCard({ contextSnapshot, riskEvents, onConfigureHabitat }: ContextCardProps) {
  if (!contextSnapshot) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Contexto ambiental</Text>
        <Text style={styles.emptyText}>
          Aun no hay datos de habitat. Configura una ubicacion para activar recomendaciones
          por clima y calidad de aire.
        </Text>
        {onConfigureHabitat && (
          <TouchableOpacity style={styles.button} onPress={onConfigureHabitat}>
            <Text style={styles.buttonText}>Configurar habitat</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contexto ambiental</Text>
      <View style={styles.grid}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Temp</Text>
          <Text style={styles.metricValue}>{formatValue(contextSnapshot.temperature_c, '°C')}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Humedad</Text>
          <Text style={styles.metricValue}>
            {formatValue(contextSnapshot.relative_humidity_pct, '%')}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>AQI</Text>
          <Text style={styles.metricValue}>{formatValue(contextSnapshot.aqi_us, '')}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Viento</Text>
          <Text style={styles.metricValue}>{formatValue(contextSnapshot.wind_speed_kph, ' km/h')}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        Fuente clima: {contextSnapshot.source_weather || 'N/A'} · Fuente aire:{' '}
        {contextSnapshot.source_aqi || 'N/A'}
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
