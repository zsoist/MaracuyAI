import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AnalysisLoadingState } from '../components/AnalysisLoadingState';
import { AnalysisResultCard } from '../components/AnalysisResultCard';
import { ParakeetTargetSelector } from '../components/ParakeetTargetSelector';
import { RecordingQualityMeter } from '../components/RecordingQualityMeter';
import { TipBanner } from '../components/TipBanner';
import { FEATURES } from '../config/env';
import { useRecordAnalysis } from '../hooks/useRecordAnalysis';
import { useI18n } from '../i18n/useI18n';
import { useStore } from '../store/useStore';
import { colors, spacing, typography } from '../theme/tokens';
import { formatDuration } from '../utils/audioHelpers';

export function RecordScreen() {
  const { t } = useI18n();
  const parakeets = useStore((state) => state.parakeets);
  const {
    isRecording,
    duration,
    isAnalyzing,
    analysisResult,
    selectedParakeetId,
    setSelectedParakeetId,
    startRecording,
    stopRecording,
    pickAudioFile,
    resetAnalysis,
    recordingQuality,
  } = useRecordAnalysis(parakeets);

  const toggleRecording = () => {
    if (isRecording) {
      void stopRecording();
      return;
    }
    void startRecording();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {isAnalyzing ? (
          <AnalysisLoadingState />
        ) : analysisResult ? (
          <AnalysisResultCard analysisResult={analysisResult} onNewRecording={resetAnalysis} />
        ) : (
          <View style={styles.recordContainer}>
            <TipBanner text={t('tipHowToRecord')} />

            <ParakeetTargetSelector
              parakeets={parakeets}
              selectedParakeetId={selectedParakeetId}
              onSelect={setSelectedParakeetId}
            />

            {FEATURES.captureQuality && (
              <RecordingQualityMeter
                currentLevel={recordingQuality.currentLevel}
                averageLevel={recordingQuality.averageLevel}
                peakLevel={recordingQuality.peakLevel}
                label={recordingQuality.label}
                guidance={recordingQuality.guidance}
              />
            )}

            <Text style={styles.timerText}>{formatDuration(duration)}</Text>

            {isRecording && (
              <Text style={styles.recordingHint}>{t('recordTimerHint')}</Text>
            )}

            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={toggleRecording}
              accessibilityRole="button"
              accessibilityLabel={
                isRecording ? t('a11yStopRecording') : t('a11yStartRecording')
              }
            >
              <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
            </TouchableOpacity>

            <Text style={styles.recordLabel}>
              {isRecording ? t('recordTapToStop') : t('recordTapToRecord')}
            </Text>

            {!isRecording && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => void pickAudioFile()}
                accessibilityRole="button"
                accessibilityLabel={t('a11yUploadAudio')}
              >
                <Text style={styles.uploadText}>{t('recordUploadAudio')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recordContainer: {
    alignItems: 'center',
    width: '100%',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '200',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  recordingHint: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordBtnActive: {
    borderColor: colors.danger,
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.danger,
  },
  recordInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  recordLabel: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  uploadButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  uploadText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '500',
  },
});
