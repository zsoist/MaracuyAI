import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, AUTH_TOKEN_KEY, GUEST_ID_KEY } from '../config/env';
import type { AnalysisResult, Parakeet, Recording, User, WellnessSummary } from '../types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

async function getAuthToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

function createGuestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function getOrCreateGuestId() {
  const existing = await SecureStore.getItemAsync(GUEST_ID_KEY);
  if (existing) {
    return existing;
  }
  const created = createGuestId();
  await SecureStore.setItemAsync(GUEST_ID_KEY, created);
  return created;
}

export async function ensureGuestIdentity() {
  await getOrCreateGuestId();
}

async function setAuthToken(token: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

async function clearAuthToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

api.interceptors.request.use(async (config) => {
  const guestId = await getOrCreateGuestId();
  config.headers['X-Guest-Id'] = guestId;

  const token = await getAuthToken();
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
  await setAuthToken(data.access_token);
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ access_token: string }>('/auth/login', {
    email,
    password,
  });
  await setAuthToken(data.access_token);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export async function logout() {
  await clearAuthToken();
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

export async function uploadParakeetPhoto(
  id: string,
  photoUri: string,
  filename: string,
  mimeType: string
): Promise<Parakeet> {
  const formData = new FormData();
  formData.append('file', {
    uri: photoUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const { data } = await api.post<Parakeet>(`/parakeets/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

export function toMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const rootUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${rootUrl}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export default api;
