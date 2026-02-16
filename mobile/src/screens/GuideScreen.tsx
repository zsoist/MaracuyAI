import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { guideEn } from '../content/guide/en';
import { guideEs } from '../content/guide/es';
import type { GuideSection, HealthCheckItem, VocalizationRef } from '../content/guide/types';
import { useI18n } from '../i18n/useI18n';
import { colors, radius, spacing, typography } from '../theme/tokens';

const toneStyleMap: Record<string, { backgroundColor: string; borderColor: string }> = {
  info: { backgroundColor: '#F8FAFF', borderColor: '#DDE7FF' },
  tip: { backgroundColor: '#F3FBF6', borderColor: '#CDEFD8' },
  risk: { backgroundColor: '#FFF5F5', borderColor: '#FFD7D7' },
  emergency: { backgroundColor: '#FFF1F1', borderColor: '#FFCDD2' },
};

function SectionCard({ section }: { section: GuideSection }) {
  const [expanded, setExpanded] = useState(false);
  const toneStyle = section.tone ? toneStyleMap[section.tone] : toneStyleMap.info;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={[styles.sectionCard, toneStyle]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{section.icon}</Text>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionSummary} numberOfLines={expanded ? undefined : 2}>
            {section.summary}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '\u25B2' : '\u25BC'}</Text>
      </View>

      {expanded && (
        <View style={styles.bulletsContainer}>
          {section.bullets.map((bullet, index) => (
            <View key={`${section.id}-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>{'\u2022'}</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function VocalizationCard({ item }: { item: VocalizationRef }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={styles.vocCard}
    >
      <View style={styles.vocHeader}>
        <Text style={styles.vocIcon}>{item.icon}</Text>
        <View style={styles.vocHeaderText}>
          <Text style={styles.vocName}>{item.name}</Text>
          <Text style={styles.vocMood}>{item.mood}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '\u25B2' : '\u25BC'}</Text>
      </View>

      {expanded && (
        <View style={styles.vocBody}>
          <Text style={styles.vocDesc}>{item.description}</Text>
          <View style={styles.vocDetailRow}>
            <Text style={styles.vocDetailLabel}>Sound:</Text>
            <Text style={styles.vocDetailValue}>{item.sound}</Text>
          </View>
          <View style={styles.vocActionBox}>
            <Text style={styles.vocActionText}>{item.action}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function HealthCheckRow({ item }: { item: HealthCheckItem }) {
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthIconCol}>
        <Text style={styles.healthIcon}>{item.icon}</Text>
      </View>
      <View style={styles.healthContent}>
        <Text style={styles.healthLabel}>{item.label}</Text>
        <View style={styles.healthStatusRow}>
          <Text style={styles.healthGreenDot}>{'\u25CF'}</Text>
          <Text style={styles.healthGreen}>{item.healthy}</Text>
        </View>
        <View style={styles.healthStatusRow}>
          <Text style={styles.healthRedDot}>{'\u25CF'}</Text>
          <Text style={styles.healthRed}>{item.warning}</Text>
        </View>
      </View>
    </View>
  );
}

export function GuideScreen() {
  const { language } = useI18n();

  const content = useMemo(() => (language === 'es' ? guideEs : guideEn), [language]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{content.heroTitle}</Text>
        <Text style={styles.heroSubtitle}>{content.heroSubtitle}</Text>
      </View>

      {/* Care Sections (collapsible) */}
      {content.sections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}

      {/* Vocalization Reference */}
      <View style={styles.groupHeader}>
        <Text style={styles.groupIcon}>{'\u{1F3B6}'}</Text>
        <View>
          <Text style={styles.groupTitle}>{content.vocalizationGuide.title}</Text>
          <Text style={styles.groupSubtitle}>{content.vocalizationGuide.subtitle}</Text>
        </View>
      </View>
      {content.vocalizationGuide.items.map((item) => (
        <VocalizationCard key={item.id} item={item} />
      ))}

      {/* Health Checklist */}
      <View style={styles.groupHeader}>
        <Text style={styles.groupIcon}>{'\u{2705}'}</Text>
        <View>
          <Text style={styles.groupTitle}>{content.healthChecklist.title}</Text>
          <Text style={styles.groupSubtitle}>{content.healthChecklist.subtitle}</Text>
        </View>
      </View>
      <View style={styles.healthCard}>
        {content.healthChecklist.items.map((item) => (
          <HealthCheckRow key={item.id} item={item} />
        ))}
      </View>

      {/* Emergency Signs */}
      <View style={[styles.emergencyBox]}>
        <Text style={styles.emergencyIcon}>{'\u{1F6A8}'}</Text>
        <Text style={styles.emergencyTitle}>{content.emergencySigns.title}</Text>
        <Text style={styles.emergencySubtitle}>{content.emergencySigns.subtitle}</Text>
        {content.emergencySigns.signs.map((sign, idx) => (
          <View key={`em-${idx}`} style={styles.emergencyRow}>
            <Text style={styles.emergencyBullet}>{'\u26A0'}</Text>
            <Text style={styles.emergencyText}>{sign}</Text>
          </View>
        ))}
        <View style={styles.emergencyActionBox}>
          <Text style={styles.emergencyActionText}>{content.emergencySigns.action}</Text>
        </View>
      </View>

      {/* How to use */}
      <View style={styles.howToCard}>
        <Text style={styles.sectionTitle}>{content.howToTitle}</Text>
        {content.howToSteps.map((step, index) => (
          <Text key={`step-${index}`} style={styles.stepText}>
            {step}
          </Text>
        ))}
      </View>

      {/* Safety note */}
      <View style={styles.safetyBox}>
        <Text style={styles.safetyText}>{content.safetyNote}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 80,
  },

  /* Hero */
  hero: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    paddingTop: 56,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTitle: {
    fontSize: typography.title,
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },

  /* Care sections */
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.section,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSummary: {
    fontSize: typography.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginTop: 4,
  },
  bulletsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bulletDot: {
    marginRight: spacing.sm,
    color: colors.primary,
    fontSize: 14,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.caption,
    lineHeight: 18,
  },

  /* Group headers */
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  groupIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  groupTitle: {
    fontSize: typography.section,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  groupSubtitle: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  /* Vocalization cards */
  vocCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  vocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vocIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  vocHeaderText: {
    flex: 1,
  },
  vocName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vocMood: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  vocBody: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  vocDesc: {
    fontSize: typography.caption,
    lineHeight: 18,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  vocDetailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  vocDetailLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  vocDetailValue: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  vocActionBox: {
    backgroundColor: '#F3FBF6',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  vocActionText: {
    fontSize: typography.caption,
    color: '#166534',
    lineHeight: 18,
    fontWeight: '600',
  },

  /* Health checklist */
  healthCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  healthRow: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  healthIconCol: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  healthIcon: {
    fontSize: 20,
  },
  healthContent: {
    flex: 1,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  healthGreenDot: {
    fontSize: 8,
    color: '#16A34A',
    marginRight: 6,
    marginTop: 4,
  },
  healthGreen: {
    flex: 1,
    fontSize: typography.caption,
    color: '#166534',
    lineHeight: 17,
  },
  healthRedDot: {
    fontSize: 8,
    color: '#DC2626',
    marginRight: 6,
    marginTop: 4,
  },
  healthRed: {
    flex: 1,
    fontSize: typography.caption,
    color: '#991B1B',
    lineHeight: 17,
  },

  /* Emergency box */
  emergencyBox: {
    backgroundColor: '#FFF1F1',
    borderWidth: 2,
    borderColor: '#FFCDD2',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  emergencyIcon: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emergencyTitle: {
    fontSize: typography.section,
    fontWeight: '800',
    color: '#B71C1C',
    textAlign: 'center',
    marginBottom: 4,
  },
  emergencySubtitle: {
    fontSize: typography.caption,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  emergencyBullet: {
    fontSize: 12,
    color: '#D32F2F',
    marginRight: 8,
    marginTop: 1,
  },
  emergencyText: {
    flex: 1,
    fontSize: typography.caption,
    color: '#B71C1C',
    lineHeight: 18,
    fontWeight: '600',
  },
  emergencyActionBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#EF9A9A',
  },
  emergencyActionText: {
    fontSize: typography.caption,
    color: '#B71C1C',
    lineHeight: 18,
    fontWeight: '700',
  },

  /* How to use */
  howToCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  stepText: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    lineHeight: 20,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },

  /* Safety note */
  safetyBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  safetyText: {
    fontSize: typography.caption,
    lineHeight: 19,
    color: '#7C2D12',
    fontWeight: '600',
  },
});
