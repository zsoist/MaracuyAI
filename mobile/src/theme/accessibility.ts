import { AccessibilityInfo } from 'react-native';

export async function isReducedMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}
