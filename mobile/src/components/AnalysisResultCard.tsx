import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../i18n/useI18n';
import type { AnalysisDetails, AnalysisResult } from '../types';
import { MoodIndicator } from './MoodIndicator';
import type { TranslationKey } from '../i18n/types';
import { colors, radius, spacing } from '../theme/tokens';

const VOCALIZATION_LABELS: Record<string, TranslationKey> = {
  singing: 'vocalizationSinging',
  chattering: 'vocalizationChattering',
  alarm: 'vocalizationAlarm',
  silence: 'vocalizationSilence',
  distress: 'vocalizationDistress',
  contact_call: 'vocalizationContactCall',
  beak_grinding: 'vocalizationBeakGrinding',
};

const MOOD_LABEL_MAP: Record<string, TranslationKey> = {
  happy: 'moodHappy',
  relaxed: 'moodRelaxed',
  stressed: 'moodStressed',
  scared: 'moodScared',
  sick: 'moodSick',
  neutral: 'moodNeutral',
};

interface AnalysisResultCardProps {
  analysisResult: AnalysisResult;
  onNewRecording: () => void;
}

function ProbabilityBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <View style={probStyles.row}>
      <Text style={probStyles.label}>{label}</Text>
      <View style={probStyles.track}>
        <View style={[probStyles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={probStyles.value}>{pct}%</Text>
    </View>
  );
}

function BirdDetectionBadge({ detected, confidence }: { detected: boolean; confidence: number }) {
  const { t } = useI18n();
  return (
    <View style={[badgeStyles.container, detected ? badgeStyles.detected : badgeStyles.notDetected]}>
      <Text style={badgeStyles.icon}>{detected ? '\u{2705}' : '\u{26A0}'}</Text>
      <View>
        <Text style={[badgeStyles.text, detected ? badgeStyles.textDetected : badgeStyles.textNot]}>
          {detected ? t('analysisBirdDetected') : t('analysisBirdNotDetected')}
        </Text>
        <Text style={badgeStyles.confidence}>
          {t('analysisBirdConfidence', { value: Math.round(confidence * 100) })}
        </Text>
      </View>
    </View>
  );
}

export function AnalysisResultCard({
  analysisResult,
  onNewRecording,
}: AnalysisResultCardProps) {
  const { t } = useI18n();
  const details = analysisResult.details as AnalysisDetails | null;
  const birdDetected = details?.bird_detected ?? true;
  const birdConfidence = details?.bird_confidence ?? 0;
  const moodProbs = details?.mood_probabilities;
  const vocProbs = details?.vocalization_probabilities;
  const segmentCount = details?.segment_count ?? 0;
  const temporalConsistency = details?.temporal_consistency ?? 0;
  const vocalActivity = details?.vocal_activity_ratio ?? 0;
  const modelVersion = details?.model_version ?? 'v1';

  const moodColors: Record<string, string> = {
    happy: '#4CAF50',
    relaxed: '#2196F3',
    stressed: '#FF9800',
    scared: '#F44336',
    sick: '#9C27B0',
    neutral: '#607D8B',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('recordResultTitle')}</Text>

      {/* Bird detection badge */}
      <BirdDetectionBadge detected={birdDetected} confidence={birdConfidence} />

      {/* Main mood indicator */}
      <MoodIndicator
        mood={analysisResult.mood}
        confidence={analysisResult.confidence}
        size="large"
      />

      {/* Core metrics */}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{t('recordVocalization')}</Text>
        <Text style={styles.detailValue}>
          {t(VOCALIZATION_LABELS[analysisResult.vocalization_type] || 'vocalizationUnknown')}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{t('recordEnergy')}</Text>
        <Text style={styles.detailValue}>
          {Math.round(analysisResult.energy_level * 100)}%
        </Text>
      </View>

      {/* Analysis metadata */}
      <View style={styles.metaSection}>
        <Text style={styles.metaItem}>
          {t('analysisSegments', { value: segmentCount })}
        </Text>
        <Text style={styles.metaItem}>
          {t('analysisTemporalConsistency', { value: Math.round(temporalConsistency * 100) })}
        </Text>
        <Text style={styles.metaItem}>
          {t('analysisVocalActivity', { value: Math.round(vocalActivity * 100) })}
        </Text>
        <Text style={styles.metaItem}>
          {t('analysisModelVersion', { value: modelVersion })}
        </Text>
      </View>

      {/* Mood probability breakdown */}
      {moodProbs && Object.keys(moodProbs).length > 0 && (
        <View style={styles.probSection}>
          <Text style={styles.probTitle}>{t('analysisMoodProbabilities')}</Text>
          {Object.entries(moodProbs)
            .sort(([, a], [, b]) => b - a)
            .map(([mood, prob]) => (
              <ProbabilityBar
                key={mood}
                label={t(MOOD_LABEL_MAP[mood] || 'moodNeutral')}
                value={prob}
                color={moodColors[mood] || '#607D8B'}
              />
            ))}
        </View>
      )}

      {/* Vocalization probability breakdown */}
      {vocProbs && Object.keys(vocProbs).length > 0 && (
        <View style={styles.probSection}>
          <Text style={styles.probTitle}>{t('analysisVocProbabilities')}</Text>
          {Object.entries(vocProbs)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([voc, prob]) => (
              <ProbabilityBar
                key={voc}
                label={t(VOCALIZATION_LABELS[voc] || 'vocalizationUnknown')}
                value={prob}
                color={colors.primary}
              />
            ))}
        </View>
      )}

      {/* Recommendations */}
      {analysisResult.recommendations && (
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationTitle}>{t('recordRecommendation')}</Text>
          <Text style={styles.recommendationText}>{analysisResult.recommendations}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.newRecordingButton} onPress={onNewRecording}>
        <Text style={styles.newRecordingText}>{t('recordNewRecording')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    borderWidth: 1,
  },
  detected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  notDetected: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  icon: { fontSize: 18 },
  text: { fontSize: 14, fontWeight: '700' },
  textDetected: { color: '#2E7D32' },
  textNot: { color: '#F57F17' },
  confidence: { fontSize: 11, color: '#666', marginTop: 2 },
});

const probStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    width: 90,
    fontSize: 12,
    color: '#555',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    width: 36,
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  metaSection: {
    width: '100%',
    marginTop: 16,
    padding: spacing.md,
    backgroundColor: '#F8F9FA',
    borderRadius: radius.md,
    gap: 4,
  },
  metaItem: {
    fontSize: 11,
    color: '#888',
  },
  probSection: {
    width: '100%',
    marginTop: 16,
  },
  probTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 8,
  },
  recommendationBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  newRecordingButton: {
    marginTop: 24,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newRecordingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
