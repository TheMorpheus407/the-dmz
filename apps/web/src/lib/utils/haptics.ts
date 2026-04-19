export type HapticType = 'light' | 'medium' | 'heavy' | 'error';

export function triggerHaptic(type: HapticType): boolean {
  if (typeof window === 'undefined' || !navigator.vibrate) {
    return false;
  }

  const patterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    error: [50, 30, 50],
  };

  navigator.vibrate(patterns[type]);
  return true;
}

export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof navigator.vibrate === 'function';
}
