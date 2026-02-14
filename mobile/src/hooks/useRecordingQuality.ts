import { Audio } from 'expo-av';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';

export type RecordingQualityLabel = 'poor' | 'fair' | 'good' | 'excellent';

interface RecordingQualitySummary {
  currentLevel: number;
  averageLevel: number;
  peakLevel: number;
  label: RecordingQualityLabel;
  guidance: string;
}

interface UseRecordingQualityResult {
  summary: RecordingQualitySummary;
  startMonitoring: (recording: Audio.Recording) => void;
  stopMonitoring: () => void;
  reset: () => void;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeMetering(metering: number): number {
  // iOS metering range is usually around [-160, 0]. Clamp to a practical window.
  return clamp((metering + 60) / 60);
}

function toQualityLabel(level: number): RecordingQualityLabel {
  if (level < 0.15) return 'poor';
  if (level < 0.35) return 'fair';
  if (level < 0.65) return 'good';
  return 'excellent';
}

function guidanceKeyForLabel(label: RecordingQualityLabel): 'guidancePoor' | 'guidanceFair' | 'guidanceGood' | 'guidanceExcellent' {
  switch (label) {
    case 'poor':
      return 'guidancePoor';
    case 'fair':
      return 'guidanceFair';
    case 'good':
      return 'guidanceGood';
    case 'excellent':
      return 'guidanceExcellent';
    default:
      return 'guidanceFair';
  }
}

export function useRecordingQuality(): UseRecordingQualityResult {
  const { t } = useI18n();
  const [currentLevel, setCurrentLevel] = useState(0);
  const [averageLevel, setAverageLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);

  const stopMonitoring = useCallback(() => {
    if (monitorRef.current) {
      clearInterval(monitorRef.current);
      monitorRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopMonitoring();
    samplesRef.current = [];
    setCurrentLevel(0);
    setAverageLevel(0);
    setPeakLevel(0);
  }, [stopMonitoring]);

  const startMonitoring = useCallback(
    (recording: Audio.Recording) => {
      stopMonitoring();
      monitorRef.current = setInterval(() => {
        recording
          .getStatusAsync()
          .then((status) => {
            if (!status.canRecord || !status.isRecording) {
              return;
            }

            const statusWithMetering = status as Audio.RecordingStatus & { metering?: number };
            const metering = typeof statusWithMetering.metering === 'number' ? statusWithMetering.metering : -160;
            const level = normalizeMetering(metering);
            samplesRef.current.push(level);

            const sum = samplesRef.current.reduce((acc, value) => acc + value, 0);
            const avg = sum / samplesRef.current.length;
            const peak = Math.max(...samplesRef.current);

            setCurrentLevel(level);
            setAverageLevel(avg);
            setPeakLevel(peak);
          })
          .catch(() => undefined);
      }, 500);
    },
    [stopMonitoring]
  );

  const summary = useMemo<RecordingQualitySummary>(() => {
    const label = toQualityLabel(averageLevel > 0 ? averageLevel : currentLevel);
    return {
      currentLevel,
      averageLevel,
      peakLevel,
      label,
      guidance: t(guidanceKeyForLabel(label)),
    };
  }, [averageLevel, currentLevel, peakLevel, t]);

  return { summary, startMonitoring, stopMonitoring, reset };
}
