import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { guideEn } from '../content/guide/en';
import { guideEs } from '../content/guide/es';
import { useI18n } from '../i18n/useI18n';
import { colors, radius, spacing, typography } from '../theme/tokens';

const toneStyleMap = {
  info: { backgroundColor: '#F8FAFF', borderColor: '#DDE7FF' },
  tip: { backgroundColor: '#F3FBF6', borderColor: '#CDEFD8' },
  risk: { backgroundColor: '#FFF5F5', borderColor: '#FFD7D7' },
};

export function GuideScreen() {
  const { language } = useI18n();

  const content = useMemo(() => (language === 'es' ? guideEs : guideEn), [language]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{content.heroTitle}</Text>
      <Text style={styles.subtitle}>{content.heroSubtitle}</Text>

      {content.sections.map((section) => {
        const toneStyle = section.tone ? toneStyleMap[section.tone] : toneStyleMap.info;
        return (
          <View key={section.id} style={[styles.sectionCard, toneStyle]}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSummary}>{section.summary}</Text>
            {section.bullets.map((bullet, index) => (
              <View key={`${section.id}-${index}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'•'}</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        );
      })}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{content.howToTitle}</Text>
        {content.howToSteps.map((step, index) => (
          <Text key={`step-${index}`} style={styles.stepText}>
            {step}
          </Text>
        ))}
      </View>

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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.section,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSummary: {
    fontSize: typography.caption,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bulletDot: {
    marginRight: spacing.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  stepText: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  safetyBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
    padding: spacing.md,
  },
  safetyText: {
    fontSize: typography.caption,
    lineHeight: 19,
    color: '#7C2D12',
    fontWeight: '600',
  },
});
