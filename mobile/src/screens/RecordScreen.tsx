import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AnalysisLoadingState } from '../components/AnalysisLoadingState';
import { AnalysisResultCard } from '../components/AnalysisResultCard';
import { ParakeetTargetSelector } from '../components/ParakeetTargetSelector';
import { useRecordAnalysis } from '../hooks/useRecordAnalysis';
import { useStore } from '../store/useStore';
import { formatDuration } from '../utils/audioHelpers';

export function RecordScreen() {
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
            <ParakeetTargetSelector
              parakeets={parakeets}
              selectedParakeetId={selectedParakeetId}
              onSelect={setSelectedParakeetId}
            />

            <Text style={styles.timerText}>{formatDuration(duration)}</Text>

            {isRecording && (
              <Text style={styles.recordingHint}>Minimo 30 segundos recomendados</Text>
            )}

            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={toggleRecording}
            >
              <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
            </TouchableOpacity>

            <Text style={styles.recordLabel}>
              {isRecording ? 'Toca para detener' : 'Toca para grabar'}
            </Text>

            {!isRecording && (
              <TouchableOpacity style={styles.uploadButton} onPress={() => void pickAudioFile()}>
                <Text style={styles.uploadText}>Subir archivo de audio</Text>
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
    backgroundColor: '#F5F7FA',
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
    fontSize: 64,
    fontWeight: '200',
    color: '#333',
    marginBottom: 8,
  },
  recordingHint: {
    fontSize: 13,
    color: '#999',
    marginBottom: 40,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordBtnActive: {
    borderColor: '#F44336',
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F44336',
  },
  recordInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  recordLabel: {
    fontSize: 15,
    color: '#666',
    marginBottom: 40,
  },
  uploadButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  uploadText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '500',
  },
});
