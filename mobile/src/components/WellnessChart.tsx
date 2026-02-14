import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useI18n } from '../i18n/useI18n';
import type { AnalysisResult, MoodType } from '../types';
import { MOOD_CONFIG } from '../store/useStore';

interface WellnessChartProps {
  analyses: AnalysisResult[];
}

const screenWidth = Dimensions.get('window').width;

export function WellnessChart({ analyses }: WellnessChartProps) {
  const { t } = useI18n();
  if (analyses.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('chartNeedMore')}</Text>
      </View>
    );
  }

  const sorted = [...analyses]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-15);

  const labels = sorted.map((a) => {
    const d = new Date(a.created_at);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const energyData = sorted.map((a) => Math.round(a.energy_level * 100));
  const confidenceData = sorted.map((a) => Math.round(a.confidence * 100));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('chartTitle')}</Text>
      <LineChart
        data={{
          labels: labels.length > 7
            ? labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0)
            : labels,
          datasets: [
            {
              data: energyData,
              color: () => '#4CAF50',
              strokeWidth: 2,
            },
            {
              data: confidenceData,
              color: () => '#2196F3',
              strokeWidth: 1,
            },
          ],
          legend: [t('chartLegendEnergy'), t('chartLegendConfidence')],
        }}
        width={screenWidth - 64}
        height={200}
        yAxisSuffix="%"
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          labelColor: () => '#999',
          propsForDots: {
            r: '4',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#f0f0f0',
          },
        }}
        bezier
        style={styles.chart}
      />
      <View style={styles.legend}>
        {sorted.slice(-5).reverse().map((a) => {
          const config = MOOD_CONFIG[a.mood as MoodType];
          const moodLabelMap: Record<MoodType, Parameters<typeof t>[0]> = {
            happy: 'moodHappy',
            relaxed: 'moodRelaxed',
            stressed: 'moodStressed',
            scared: 'moodScared',
            sick: 'moodSick',
            neutral: 'moodNeutral',
          };
          return (
            <View key={a.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: config?.color || '#999' }]} />
              <Text style={styles.legendText}>{t(moodLabelMap[a.mood as MoodType])}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
    marginLeft: -8,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
});
