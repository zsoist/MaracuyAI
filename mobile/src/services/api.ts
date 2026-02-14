import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import type { AnalysisResult, Parakeet, Recording, User, WellnessSummary } from '../types';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api/v1'
  : 'https://api.parakeetwellness.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export async function register(email: string, password: string, displayName?: string) {
  const { data } = await api.post<{ access_token: string }>('/auth/register', {
    email,
    password,
    display_name: displayName,
  });
  await AsyncStorage.setItem('auth_token', data.access_token);
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ access_token: string }>('/auth/login', {
    email,
    password,
  });
  await AsyncStorage.setItem('auth_token', data.access_token);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem('auth_token');
}

// Parakeets
export async function createParakeet(parakeet: {
  name: string;
  color_description?: string;
  birth_date?: string;
  notes?: string;
}): Promise<Parakeet> {
  const { data } = await api.post<Parakeet>('/parakeets/', parakeet);
  return data;
}

export async function getParakeets(): Promise<Parakeet[]> {
  const { data } = await api.get<Parakeet[]>('/parakeets/');
  return data;
}

export async function updateParakeet(
  id: string,
  updates: Partial<Parakeet>
): Promise<Parakeet> {
  const { data } = await api.put<Parakeet>(`/parakeets/${id}`, updates);
  return data;
}

export async function deleteParakeet(id: string): Promise<void> {
  await api.delete(`/parakeets/${id}`);
}

// Recordings
export async function uploadRecording(fileUri: string, filename: string): Promise<Recording> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: 'audio/wav',
  } as unknown as Blob);

  const { data } = await api.post<Recording>('/recordings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function getRecordings(limit = 20, offset = 0): Promise<Recording[]> {
  const { data } = await api.get<Recording[]>('/recordings/', {
    params: { limit, offset },
  });
  return data;
}

export async function deleteRecording(id: string): Promise<void> {
  await api.delete(`/recordings/${id}`);
}

// Analysis
export async function analyzeRecording(
  recordingId: string,
  parakeetIds?: string[]
): Promise<AnalysisResult[]> {
  const { data } = await api.post<AnalysisResult[]>('/analysis/analyze', {
    recording_id: recordingId,
    parakeet_ids: parakeetIds,
  });
  return data;
}

export async function getAnalysisHistory(
  parakeetId: string,
  limit = 30
): Promise<AnalysisResult[]> {
  const { data } = await api.get<AnalysisResult[]>(`/analysis/history/${parakeetId}`, {
    params: { limit },
  });
  return data;
}

export async function getWellnessSummary(parakeetId: string): Promise<WellnessSummary> {
  const { data } = await api.get<WellnessSummary>(`/analysis/summary/${parakeetId}`);
  return data;
}

export interface Alert {
  priority: 'high' | 'medium' | 'low';
  parakeet_id: string | null;
  parakeet_name: string | null;
  message: string;
  mood: string;
  created_at: string;
}

export async function getAlerts(): Promise<Alert[]> {
  const { data } = await api.get<Alert[]>('/analysis/alerts');
  return data;
}

export default api;
