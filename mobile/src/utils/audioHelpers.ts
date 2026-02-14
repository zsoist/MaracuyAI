export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Muy alta';
  if (confidence >= 0.6) return 'Alta';
  if (confidence >= 0.4) return 'Moderada';
  if (confidence >= 0.2) return 'Baja';
  return 'Muy baja';
}

export function getEnergyLabel(energy: number): string {
  if (energy >= 0.8) return 'Muy activo';
  if (energy >= 0.6) return 'Activo';
  if (energy >= 0.4) return 'Moderado';
  if (energy >= 0.2) return 'Bajo';
  return 'Muy bajo';
}
