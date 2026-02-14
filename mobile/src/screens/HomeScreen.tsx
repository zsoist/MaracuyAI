import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertFeed } from '../components/AlertFeed';
import { ContextCard } from '../components/ContextCard';
import { MoodIndicator } from '../components/MoodIndicator';
import { ParakeetCard } from '../components/ParakeetCard';
import { TipBanner } from '../components/TipBanner';
import { FEATURES } from '../config/env';
import { useHomeDashboard } from '../hooks/useHomeDashboard';
import { useI18n } from '../i18n/useI18n';
import { useStore } from '../store/useStore';
import { colors, spacing, typography } from '../theme/tokens';
import type { HomeScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { t } = useI18n();
  const { parakeets, latestAnalysis } = useStore();
  const { alerts, contextSnapshot, riskEvents, refreshing, onRefresh } = useHomeDashboard();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          accessibilityLabel={t('a11yRefreshHome')}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('homeTitle')}</Text>
        <Text style={styles.subtitle}>{t('homeSubtitle')}</Text>
      </View>

      {latestAnalysis && (
        <View style={styles.latestCard}>
          <Text style={styles.sectionTitle}>{t('homeLatestAnalysis')}</Text>
          <MoodIndicator
            mood={latestAnalysis.mood}
            confidence={latestAnalysis.confidence}
            size="large"
          />
          {latestAnalysis.recommendations && (
            <Text style={styles.recommendation}>{latestAnalysis.recommendations}</Text>
          )}
        </View>
      )}

      {FEATURES.contextEngine && (
        <ContextCard
          contextSnapshot={contextSnapshot}
          riskEvents={riskEvents}
          onConfigureHabitat={() => navigation.navigate('Settings')}
        />
      )}

      <AlertFeed alerts={alerts} />

      <TouchableOpacity
        style={styles.recordButton}
        onPress={() => navigation.navigate('Record')}
        accessibilityRole="button"
        accessibilityLabel={t('homeOpenRecordA11y')}
      >
        <Text style={styles.recordButtonIcon}>{'\u{1F3A4}'}</Text>
        <Text style={styles.recordButtonText}>{t('homeRecordCta')}</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.tipWrapper}>
          <TipBanner text={t('tipHowToHome')} />
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('homeParakeetsSection')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddParakeet')}>
            <Text style={styles.addButton}>{t('homeAddParakeet')}</Text>
          </TouchableOpacity>
        </View>

        {parakeets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\u{1F99C}'}</Text>
            <Text style={styles.emptyText}>
              {t('homeEmptyParakeets')}
            </Text>
          </View>
        ) : (
          parakeets.map((p) => (
            <ParakeetCard
              key={p.id}
              parakeet={p}
              onPress={() => navigation.navigate('ParakeetProfile', { parakeetId: p.id })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingTop: 60,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: typography.title,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  latestCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendation: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  recordButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingBottom: 40,
  },
  tipWrapper: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: typography.section,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
});
