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
