import { Platform } from 'react-native';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const defaultDevBaseUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

export const API_BASE_URL =
  configuredBaseUrl || (__DEV__ ? defaultDevBaseUrl : 'https://api.parakeetwellness.com/api/v1');

export const AUTH_TOKEN_KEY = 'auth_token';
export const GUEST_ID_KEY = 'guest_id';

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
