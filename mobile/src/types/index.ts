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
  quality_score?: number;
  quality_label?: string;
  quality_warnings?: string[];
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

export interface HabitatProfile {
  id: string;
  owner_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  timezone_name: string;
  habitat_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContextSnapshot {
  id: string;
  owner_id: string;
  habitat_profile_id: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  timezone_name: string;
  temperature_c: number | null;
  relative_humidity_pct: number | null;
  wind_speed_kph: number | null;
  weather_code: string | null;
  aqi_us: number | null;
  pm25_ugm3: number | null;
  daylight_state: string | null;
  sunrise_at: string | null;
  sunset_at: string | null;
  source_weather: string | null;
  source_aqi: string | null;
  confidence: number;
  summary_json: Record<string, unknown> | null;
  captured_at: string;
}

export interface RiskEvent {
  id: string;
  owner_id: string;
  snapshot_id: string | null;
  severity: string;
  category: string;
  title: string;
  details: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}
