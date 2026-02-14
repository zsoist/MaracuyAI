import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MoodIndicator } from '../components/MoodIndicator';
import * as api from '../services/api';
import { useStore } from '../store/useStore';
import { formatDuration } from '../utils/audioHelpers';

export function RecordScreen({ navigation }: { navigation: any }) {
  const { parakeets, setLatestAnalysis, addRecording } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso al microfono para grabar.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);
      setAnalysisResult(null);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'No se pudo iniciar la grabacion.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        await analyzeAudio(uri, 'recording.wav');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo detener la grabacion.');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await analyzeAudio(asset.uri, asset.name);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  const analyzeAudio = async (uri: string, filename: string) => {
    setIsAnalyzing(true);
    try {
      const recording = await api.uploadRecording(uri, filename);
      addRecording(recording);

      const parakeetIds = parakeets.length > 0 ? parakeets.map((p) => p.id) : undefined;
      const results = await api.analyzeRecording(recording.id, parakeetIds);

      if (results.length > 0) {
        setAnalysisResult(results[0]);
        setLatestAnalysis(results[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo analizar el audio. Verifica tu conexion.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {isAnalyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.analyzingText}>Analizando vocalizaciones...</Text>
            <Text style={styles.analyzingSubtext}>
              Procesando espectrograma y clasificando patrones
            </Text>
          </View>
        ) : analysisResult ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Resultado del analisis</Text>
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
                <Text style={styles.recommendationText}>
                  {analysisResult.recommendations}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.newRecordingButton}
              onPress={() => {
                setAnalysisResult(null);
                setDuration(0);
              }}
            >
              <Text style={styles.newRecordingText}>Nueva grabacion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recordContainer}>
            <Text style={styles.timerText}>{formatDuration(duration)}</Text>

            {isRecording && (
              <Text style={styles.recordingHint}>
                Minimo 30 segundos recomendados
              </Text>
            )}

            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <View
                style={[styles.recordInner, isRecording && styles.recordInnerActive]}
              />
            </TouchableOpacity>

            <Text style={styles.recordLabel}>
              {isRecording ? 'Toca para detener' : 'Toca para grabar'}
            </Text>

            {!isRecording && (
              <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
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
  analyzingContainer: {
    alignItems: 'center',
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  analyzingSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  resultContainer: {
    alignItems: 'center',
    width: '100%',
  },
  resultTitle: {
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
