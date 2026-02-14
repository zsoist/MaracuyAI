import { AccessibilityInfo } from 'react-native';

export async function isReducedMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

export const accessibilityLabels = {
  startRecording: 'Iniciar grabacion de audio',
  stopRecording: 'Detener grabacion de audio',
  uploadAudio: 'Subir archivo de audio para analisis',
  refreshHome: 'Actualizar tablero principal',
} as const;
