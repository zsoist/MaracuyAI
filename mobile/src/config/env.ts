import { Platform } from 'react-native';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const defaultDevBaseUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

function isLocalBackendUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('10.0.2.2')
  );
}

function resolveApiBaseUrl(): string {
  if (configuredBaseUrl && configuredBaseUrl.length > 0) {
    if (!__DEV__ && isLocalBackendUrl(configuredBaseUrl)) {
      throw new Error(
        'EXPO_PUBLIC_API_BASE_URL cannot point to localhost/loopback in non-development builds.'
      );
    }
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (__DEV__) {
    return defaultDevBaseUrl;
  }

  throw new Error('EXPO_PUBLIC_API_BASE_URL is required for non-development builds.');
}

export const API_BASE_URL = resolveApiBaseUrl();

export const AUTH_TOKEN_KEY = 'auth_token';
export const GUEST_ID_KEY = 'guest_id';
export const GUEST_SECRET_KEY = 'guest_secret';

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const FEATURES = {
  contextEngine: parseBooleanEnv(process.env.EXPO_PUBLIC_FEATURE_CONTEXT_ENGINE, true),
  captureQuality: parseBooleanEnv(process.env.EXPO_PUBLIC_FEATURE_CAPTURE_QUALITY, true),
  iosUxFoundation: parseBooleanEnv(process.env.EXPO_PUBLIC_FEATURE_IOS_UX_FOUNDATION, true),
  advancedReasoning: parseBooleanEnv(process.env.EXPO_PUBLIC_FEATURE_ADVANCED_REASONING, false),
  offlineResilience: parseBooleanEnv(process.env.EXPO_PUBLIC_FEATURE_OFFLINE_RESILIENCE, false),
  smartDiscovery: parseBooleanEnv(process.env.EXPO_PUBLIC_FEATURE_SMART_DISCOVERY, false),
};
