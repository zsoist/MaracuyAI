export type MoodType = 'happy' | 'relaxed' | 'stressed' | 'scared' | 'sick' | 'neutral';

export type VocalizationType =
  | 'singing'
  | 'chattering'
  | 'alarm'
  | 'silence'
  | 'distress'
  | 'contact_call'
  | 'beak_grinding';

export interface Parakeet {
  id: string;
  name: string;
  color_description: string | null;
  birth_date: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Recording {
  id: string;
  file_url: string;
  original_filename: string;
  duration_seconds: number;
  file_size_bytes: number;
  sample_rate: number | null;
  recorded_at: string;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  recording_id: string;
  parakeet_id: string | null;
  mood: MoodType;
  confidence: number;
  energy_level: number;
  vocalization_type: VocalizationType;
  recommendations: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface WellnessSummary {
  parakeet_id: string;
  parakeet_name: string;
  total_analyses: number;
  average_confidence: number;
  average_energy: number;
  dominant_mood: MoodType;
  mood_distribution: Record<string, number>;
  recent_trend: 'improving' | 'stable' | 'declining';
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}
