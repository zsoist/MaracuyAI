import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertFeed } from '../components/AlertFeed';
import { ContextCard } from '../components/ContextCard';
import { MoodIndicator } from '../components/MoodIndicator';
import { ParakeetCard } from '../components/ParakeetCard';
import { TipBanner } from '../components/TipBanner';
import { FEATURES } from '../config/env';
import { useHomeDashboard } from '../hooks/useHomeDashboard';
import { useI18n } from '../i18n/useI18n';
import { useStore } from '../store/useStore';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { HomeScreenProps } from '../types/navigation';

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={statStyles.badge}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { t } = useI18n();
  const { parakeets, latestAnalysis } = useStore();
  const { alerts, contextSnapshot, riskEvents, refreshing, onRefresh } = useHomeDashboard();

  const birdDetected = latestAnalysis?.details?.bird_detected;
  const birdConf = latestAnalysis?.details?.bird_confidence ?? 0;
  const moodProbs = latestAnalysis?.details?.mood_probabilities;

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
      {/* Hero header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('homeTitle')}</Text>
        <Text style={styles.subtitle}>{t('homeSubtitle')}</Text>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <StatBadge
            label={t('homeStatBirds')}
            value={String(parakeets.length)}
            color="#fff"
          />
          <StatBadge
            label={t('homeStatConfidence')}
            value={
              latestAnalysis
                ? `${Math.round(latestAnalysis.confidence * 100)}%`
                : '--'
            }
            color="#fff"
          />
          <StatBadge
            label={t('homeStatEnergy')}
            value={
              latestAnalysis
                ? `${Math.round(latestAnalysis.energy_level * 100)}%`
                : '--'
            }
            color="#fff"
          />
        </View>
      </View>

      {/* Latest analysis dashboard card */}
      {latestAnalysis ? (
        <View style={styles.dashCard}>
          <View style={styles.dashCardHeader}>
            <Text style={styles.dashCardTitle}>{t('homeLatestAnalysis')}</Text>
            {birdDetected === false && (
              <View style={styles.birdBadgeWarn}>
                <Text style={styles.birdBadgeWarnText}>{t('analysisBirdNotDetected')}</Text>
              </View>
            )}
            {birdDetected === true && (
              <View style={styles.birdBadgeOk}>
                <Text style={styles.birdBadgeOkText}>
                  {t('analysisBirdConfidence', { value: Math.round(birdConf * 100) })}
                </Text>
              </View>
            )}
          </View>

          <MoodIndicator
            mood={latestAnalysis.mood}
            confidence={latestAnalysis.confidence}
            size="large"
          />

          {/* Mini mood probability chart */}
          {moodProbs && Object.keys(moodProbs).length > 0 && (
            <View style={styles.miniChart}>
              {Object.entries(moodProbs)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([mood, prob]) => (
                  <View key={mood} style={styles.miniBarRow}>
                    <Text style={styles.miniBarLabel}>{mood}</Text>
                    <View style={styles.miniBarTrack}>
                      <View
                        style={[
                          styles.miniBarFill,
                          { width: `${Math.round(prob * 100)}%` as `${number}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.miniBarValue}>{Math.round(prob * 100)}%</Text>
                  </View>
                ))}
            </View>
          )}

          {latestAnalysis.recommendations && (
            <Text style={styles.recommendation}>{latestAnalysis.recommendations}</Text>
          )}
        </View>
      ) : (
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeIcon}>{'\u{1F99C}'}</Text>
          <Text style={styles.welcomeTitle}>{t('homeWelcomeTitle')}</Text>
          <Text style={styles.welcomeText}>{t('homeWelcomeText')}</Text>
          <TouchableOpacity
            style={styles.welcomeButton}
            onPress={() => navigation.navigate('AddParakeet')}
          >
            <Text style={styles.welcomeButtonText}>{t('homeWelcomeAddBird')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Context card */}
      {FEATURES.contextEngine && (
        <ContextCard
          contextSnapshot={contextSnapshot}
          riskEvents={riskEvents}
          onConfigureHabitat={() => navigation.navigate('Settings')}
        />
      )}

      {/* Alerts */}
      <AlertFeed alerts={alerts} />

      {/* Big CTA buttons row */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={styles.ctaRecord}
          onPress={() => navigation.navigate('Record')}
          accessibilityRole="button"
          accessibilityLabel={t('homeOpenRecordA11y')}
        >
          <Text style={styles.ctaIcon}>{'\u{1F3A4}'}</Text>
          <Text style={styles.ctaText}>{t('homeRecordCta')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaAddBird}
          onPress={() => navigation.navigate('AddParakeet')}
          accessibilityRole="button"
          accessibilityLabel={t('homeAddParakeetA11y')}
        >
          <Text style={styles.ctaIcon}>{'\u{2795}'}</Text>
          <Text style={styles.ctaTextAlt}>{t('homeAddBirdCta')}</Text>
        </TouchableOpacity>
      </View>

      {/* My Parakeets section */}
      <View style={styles.section}>
        <TipBanner text={t('tipHowToHome')} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('homeParakeetsSection')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddParakeet')}>
            <Text style={styles.addButton}>{t('homeAddParakeet')}</Text>
          </TouchableOpacity>
        </View>

        {parakeets.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => navigation.navigate('AddParakeet')}
          >
            <Text style={styles.emptyIcon}>{'\u{1F99C}'}</Text>
            <Text style={styles.emptyText}>{t('homeEmptyParakeets')}</Text>
            <Text style={styles.emptyAction}>{t('homeAddBirdCta')}</Text>
          </TouchableOpacity>
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

const statStyles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },

  /* Dashboard card */
  dashCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  dashCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.sm,
  },
  dashCardTitle: {
    fontSize: typography.section,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  birdBadgeWarn: {
    backgroundColor: '#FFF8E1',
    borderRadius: radius.round,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  birdBadgeWarnText: { fontSize: 10, color: '#F57F17', fontWeight: '700' },
  birdBadgeOk: {
    backgroundColor: '#E8F5E9',
    borderRadius: radius.round,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  birdBadgeOkText: { fontSize: 10, color: '#2E7D32', fontWeight: '700' },

  /* Mini probability chart */
  miniChart: {
    width: '100%',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  miniBarLabel: {
    width: 55,
    fontSize: 11,
    color: '#888',
    textTransform: 'capitalize',
  },
  miniBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  miniBarValue: {
    width: 32,
    fontSize: 10,
    color: '#888',
    textAlign: 'right',
  },

  recommendation: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },

  /* Welcome card for first-time users */
  welcomeCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeIcon: { fontSize: 56, marginBottom: spacing.md },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  welcomeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  welcomeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* CTA row */
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  ctaRecord: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaAddBird: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ctaIcon: { fontSize: 20, marginRight: 8 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ctaTextAlt: { color: colors.primary, fontSize: 15, fontWeight: '700' },

  /* Sections */
  section: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 48 },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyAction: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 8,
  },
});
