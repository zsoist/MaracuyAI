import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MoodIndicator } from '../components/MoodIndicator';
import { WellnessChart } from '../components/WellnessChart';
import * as api from '../services/api';
import { MOOD_CONFIG, useStore } from '../store/useStore';
import type { AnalysisResult, MoodType, WellnessSummary } from '../types';

export function ParakeetProfileScreen({ route }: { route: any }) {
  const { parakeetId } = route.params;
  const { parakeets } = useStore();
  const parakeet = parakeets.find((p) => p.id === parakeetId);

  const [summary, setSummary] = useState<WellnessSummary | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
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
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (!parakeet) {
    return (
      <View style={styles.center}>
        <Text>Periquito no encontrado</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const trendLabels: Record<string, string> = {
    improving: 'Mejorando',
    stable: 'Estable',
    declining: 'Disminuyendo',
  };

  const trendColors: Record<string, string> = {
    improving: '#4CAF50',
    stable: '#2196F3',
    declining: '#F44336',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{parakeet.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{parakeet.name}</Text>
        {parakeet.color_description && (
          <Text style={styles.description}>{parakeet.color_description}</Text>
        )}
        {parakeet.notes && <Text style={styles.notes}>{parakeet.notes}</Text>}
      </View>

      {summary && summary.total_analyses > 0 ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{summary.total_analyses}</Text>
              <Text style={styles.statLabel}>Analisis</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {Math.round(summary.average_energy * 100)}%
              </Text>
              <Text style={styles.statLabel}>Energia prom.</Text>
            </View>
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  { color: trendColors[summary.recent_trend] || '#666' },
                ]}
              >
                {trendLabels[summary.recent_trend] || summary.recent_trend}
              </Text>
              <Text style={styles.statLabel}>Tendencia</Text>
            </View>
          </View>

          <View style={styles.moodSection}>
            <Text style={styles.sectionTitle}>Estado dominante</Text>
            <MoodIndicator
              mood={summary.dominant_mood}
              confidence={summary.average_confidence}
              size="large"
            />
          </View>

          <WellnessChart analyses={analyses} />

          <View style={styles.distributionSection}>
            <Text style={styles.sectionTitle}>Distribucion de estados</Text>
            {Object.entries(summary.mood_distribution).map(([mood, count]) => {
              const config = MOOD_CONFIG[mood as MoodType];
              const percentage = Math.round((count / summary.total_analyses) * 100);
              return (
                <View key={mood} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: config?.color || '#666' }]}>
                    {config?.label || mood}
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
          <Text style={styles.emptyText}>
            Aun no hay analisis para {parakeet.name}. Graba una vocalizacion para comenzar
            a construir su perfil de bienestar.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 24,
    alignItems: 'center',
    paddingBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  notes: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  moodSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  distributionSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    width: 80,
    fontSize: 13,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    width: 36,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});
