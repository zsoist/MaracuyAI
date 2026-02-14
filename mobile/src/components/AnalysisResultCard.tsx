import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { AnalysisResult } from '../types';
import { MoodIndicator } from './MoodIndicator';

interface AnalysisResultCardProps {
  analysisResult: AnalysisResult;
  onNewRecording: () => void;
}

export function AnalysisResultCard({
  analysisResult,
  onNewRecording,
}: AnalysisResultCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultado del analisis</Text>
      <MoodIndicator
        mood={analysisResult.mood}
        confidence={analysisResult.confidence}
        size="large"
      />
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Vocalizacion:</Text>
        <Text style={styles.detailValue}>{analysisResult.vocalization_type}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Energia:</Text>
        <Text style={styles.detailValue}>
          {Math.round(analysisResult.energy_level * 100)}%
        </Text>
      </View>
      {analysisResult.recommendations && (
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationTitle}>Recomendacion</Text>
          <Text style={styles.recommendationText}>{analysisResult.recommendations}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.newRecordingButton} onPress={onNewRecording}>
        <Text style={styles.newRecordingText}>Nueva grabacion</Text>
      </TouchableOpacity>
    </View>
  );
}

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
