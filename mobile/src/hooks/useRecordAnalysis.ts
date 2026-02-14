import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FEATURES } from '../config/env';
import * as api from '../services/api';
import { useStore } from '../store/useStore';
import type { AnalysisResult, Parakeet } from '../types';
import { getErrorMessage } from '../utils/errorMessage';
import { useRecordingQuality } from './useRecordingQuality';

interface UseRecordAnalysisResult {
  isRecording: boolean;
  duration: number;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  selectedParakeetId: string | null;
  setSelectedParakeetId: (id: string | null) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pickAudioFile: () => Promise<void>;
  resetAnalysis: () => void;
  recordingQuality: {
    currentLevel: number;
    averageLevel: number;
    peakLevel: number;
    label: 'poor' | 'fair' | 'good' | 'excellent';
    guidance: string;
  };
}

export function useRecordAnalysis(parakeets: Parakeet[]): UseRecordAnalysisResult {
  const setLatestAnalysis = useStore((state) => state.setLatestAnalysis);
  const addRecording = useStore((state) => state.addRecording);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedParakeetId, setSelectedParakeetId] = useState<string | null>(null);

  const { summary: recordingQuality, startMonitoring, stopMonitoring, reset: resetQuality } =
    useRecordingQuality();

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      stopMonitoring();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [clearTimer, stopMonitoring]);

  useEffect(() => {
    if (parakeets.length === 0) {
      setSelectedParakeetId(null);
      return;
    }
    if (selectedParakeetId && parakeets.some((parakeet) => parakeet.id === selectedParakeetId)) {
      return;
    }
    setSelectedParakeetId(parakeets[0].id);
  }, [parakeets, selectedParakeetId]);

  const analyzeAudio = useCallback(
    async (uri: string, filename: string) => {
      setIsAnalyzing(true);
      try {
        const recording = await api.uploadRecording(uri, filename);
        addRecording(recording);

        const parakeetIds = selectedParakeetId ? [selectedParakeetId] : undefined;
        const results = await api.analyzeRecording(recording.id, parakeetIds);
        if (results.length > 0) {
          setAnalysisResult(results[0]);
          setLatestAnalysis(results[0]);
        }
      } catch (error) {
        Alert.alert(
          'Error',
          getErrorMessage(error, 'No se pudo analizar el audio. Verifica tu conexion.')
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [addRecording, selectedParakeetId, setLatestAnalysis]
  );

  const startRecording = useCallback(async () => {
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

      const recordingOptions: Audio.RecordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);
      setAnalysisResult(null);
      resetQuality();

      if (FEATURES.captureQuality) {
        startMonitoring(recording);
      }

      clearTimer();
      timerRef.current = setInterval(() => {
        setDuration((seconds) => seconds + 1);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo iniciar la grabacion.'));
    }
  }, [clearTimer, resetQuality, startMonitoring]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      return;
    }

    clearTimer();
    stopMonitoring();
    setIsRecording(false);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (duration < 3) {
        Alert.alert('Grabacion muy corta', 'Graba al menos 3 segundos para analizar.');
        resetQuality();
        return;
      }

      if (FEATURES.captureQuality && recordingQuality.averageLevel < 0.08) {
        Alert.alert(
          'Calidad de audio baja',
          'La señal se ve muy baja. Puedes volver a grabar en un ambiente mas silencioso.'
        );
      }

      if (uri) {
        await analyzeAudio(uri, 'recording.wav');
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo detener la grabacion.'));
    }
  }, [
    analyzeAudio,
    clearTimer,
    duration,
    recordingQuality.averageLevel,
    resetQuality,
    stopMonitoring,
  ]);

  const pickAudioFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const asset = result.assets[0];
      await analyzeAudio(asset.uri, asset.name);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo seleccionar el archivo.'));
    }
  }, [analyzeAudio]);

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setDuration(0);
    resetQuality();
  };

  return {
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
  };
}
