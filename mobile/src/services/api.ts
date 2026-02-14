import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, AUTH_TOKEN_KEY, GUEST_ID_KEY, GUEST_SECRET_KEY } from '../config/env';
import type {
  AnalysisResult,
  ContextSnapshot,
  HabitatProfile,
  Parakeet,
  Recording,
  RiskEvent,
  User,
  WellnessSummary,
} from '../types';

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

function createGuestSecret() {
  const segment = () =>
    'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  return `${segment()}${segment()}`;
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

async function getOrCreateGuestSecret() {
  const existing = await SecureStore.getItemAsync(GUEST_SECRET_KEY);
  if (existing && existing.length >= 24) {
    return existing;
  }
  const created = createGuestSecret();
  await SecureStore.setItemAsync(GUEST_SECRET_KEY, created);
  return created;
}

export async function ensureGuestIdentity() {
  await Promise.all([getOrCreateGuestId(), getOrCreateGuestSecret()]);
}

async function setAuthToken(token: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

async function clearAuthToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

api.interceptors.request.use(async (config) => {
  const [guestId, guestSecret] = await Promise.all([
    getOrCreateGuestId(),
    getOrCreateGuestSecret(),
  ]);
  config.headers['X-Guest-Id'] = guestId;
  config.headers['X-Guest-Secret'] = guestSecret;

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

export interface MergeGuestResult {
  merged: boolean;
  guest_id: string | null;
  moved_parakeets: number;
  moved_recordings: number;
  moved_snapshots: number;
  moved_risk_events: number;
}

export async function mergeGuestData(): Promise<MergeGuestResult> {
  const { data } = await api.post<MergeGuestResult>('/auth/merge-guest');
  return data;
}

export async function exportAccountData(): Promise<Record<string, unknown>> {
  const { data } = await api.get<Record<string, unknown>>('/auth/export-data');
  return data;
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/auth/me');
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
  updates: {
    name?: string;
    color_description?: string | null;
    birth_date?: string | null;
    notes?: string | null;
  }
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

// Context
export async function getHabitatProfile(): Promise<HabitatProfile | null> {
  const { data } = await api.get<HabitatProfile | null>('/context/habitat');
  return data;
}

export async function upsertHabitatProfile(payload: {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  timezone_name?: string;
  habitat_type?: string;
  notes?: string | null;
}): Promise<HabitatProfile> {
  const { data } = await api.put<HabitatProfile>('/context/habitat', payload);
  return data;
}

export async function refreshContext(payload?: {
  latitude?: number;
  longitude?: number;
  location_name?: string;
  timezone_name?: string;
}): Promise<ContextSnapshot> {
  const { data } = await api.post<ContextSnapshot>('/context/refresh', payload || {});
  return data;
}

export async function getCurrentContext(): Promise<ContextSnapshot | null> {
  const { data } = await api.get<ContextSnapshot | null>('/context/current');
  return data;
}

export async function getContextHistory(limit = 24): Promise<ContextSnapshot[]> {
  const { data } = await api.get<ContextSnapshot[]>('/context/history', {
    params: { limit },
  });
  return data;
}

export async function getRiskEvents(limit = 20): Promise<RiskEvent[]> {
  const { data } = await api.get<RiskEvent[]>('/context/risk-events', {
    params: { limit },
  });
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
