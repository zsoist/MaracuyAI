import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MoodIndicator } from '../components/MoodIndicator';
import { WellnessChart } from '../components/WellnessChart';
import { useI18n } from '../i18n/useI18n';
import * as api from '../services/api';
import { MOOD_CONFIG, useStore } from '../store/useStore';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { AnalysisResult, MoodType, WellnessSummary } from '../types';
import type { ParakeetProfileScreenProps } from '../types/navigation';

export function ParakeetProfileScreen({ route }: ParakeetProfileScreenProps) {
  const { t } = useI18n();
  const { parakeetId } = route.params;
  const { parakeets, updateParakeet } = useStore();
  const parakeet = parakeets.find((p) => p.id === parakeetId);

  const [summary, setSummary] = useState<WellnessSummary | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    void loadData();
  }, [parakeetId]);

  const loadData = async () => {
    try {
      const [summaryData, historyData] = await Promise.all([
        api.getWellnessSummary(parakeetId),
        api.getAnalysisHistory(parakeetId),
      ]);
      setSummary(summaryData);
      setAnalyses(historyData);
    } catch {
      Alert.alert(t('commonError'), t('errorLoadProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!parakeet) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('commonError'), t('warningNeedPhotos'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName || `parakeet-${parakeet.id}.jpg`;
    const mimeType = asset.mimeType || 'image/jpeg';

    setIsUploadingPhoto(true);
    try {
      const updated = await api.uploadParakeetPhoto(parakeet.id, asset.uri, fileName, mimeType);
      updateParakeet(updated);
    } catch {
      Alert.alert(t('commonError'), t('errorUploadPhoto'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (!parakeet) {
    return (
      <View style={styles.center}>
        <Text>{t('profileNotFound')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const trendLabels: Record<string, string> = {
    improving: t('profileTrendImproving'),
    stable: t('profileTrendStable'),
    declining: t('profileTrendDeclining'),
  };

  const trendColors: Record<string, string> = {
    improving: colors.primary,
    stable: '#2196F3',
    declining: colors.danger,
  };

  const moodLabelMap: Record<MoodType, Parameters<typeof t>[0]> = {
    happy: 'moodHappy',
    relaxed: 'moodRelaxed',
    stressed: 'moodStressed',
    scared: 'moodScared',
    sick: 'moodSick',
    neutral: 'moodNeutral',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {parakeet.photo_url ? (
          <Image
            style={styles.photo}
            source={{
              uri: api.toMediaUrl(parakeet.photo_url),
            }}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{parakeet.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{parakeet.name}</Text>
        {parakeet.color_description && <Text style={styles.description}>{parakeet.color_description}</Text>}
        {parakeet.notes && <Text style={styles.notes}>{parakeet.notes}</Text>}
        <TouchableOpacity
          style={[styles.photoButton, isUploadingPhoto && styles.photoButtonDisabled]}
          disabled={isUploadingPhoto}
          onPress={() => void handlePickPhoto()}
        >
          <Text style={styles.photoButtonText}>
            {isUploadingPhoto ? t('profileUploadingPhoto') : t('profileUploadPhoto')}
          </Text>
        </TouchableOpacity>
      </View>

      {summary && summary.total_analyses > 0 ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{summary.total_analyses}</Text>
              <Text style={styles.statLabel}>{t('profileAnalyses')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(summary.average_energy * 100)}%</Text>
              <Text style={styles.statLabel}>{t('profileAvgEnergy')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: trendColors[summary.recent_trend] || '#666',
                    fontSize: 14,
                  },
                ]}
              >
                {trendLabels[summary.recent_trend] || summary.recent_trend}
              </Text>
              <Text style={styles.statLabel}>{t('profileTrend')}</Text>
            </View>
          </View>

          <View style={styles.moodSection}>
            <Text style={styles.sectionTitle}>{t('profileDominantMood')}</Text>
            <MoodIndicator
              mood={summary.dominant_mood}
              confidence={summary.average_confidence}
              size="large"
            />
          </View>

          <WellnessChart analyses={analyses} />

          <View style={styles.distributionSection}>
            <Text style={styles.sectionTitle}>{t('profileMoodDistribution')}</Text>
            {Object.entries(summary.mood_distribution).map(([mood, count]) => {
              const config = MOOD_CONFIG[mood as MoodType];
              const percentage = Math.round((count / summary.total_analyses) * 100);
              return (
                <View key={mood} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: config?.color || '#666' }]}>
                    {t(moodLabelMap[mood as MoodType])}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: config?.color || '#666',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{percentage}%</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('profileEmpty', { name: parakeet.name })}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.xxl,
    alignItems: 'center',
    paddingBottom: spacing.xxxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  description: {
    fontSize: typography.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  notes: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  photoButton: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.round,
  },
  photoButtonDisabled: {
    opacity: 0.7,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: -16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  moodSection: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.section,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  distributionSection: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginTop: 0,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: 40,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  barLabel: {
    width: 84,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: spacing.sm,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    width: 36,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
