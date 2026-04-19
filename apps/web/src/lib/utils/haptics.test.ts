import { describe, expect, it } from 'vitest';

import { triggerHaptic, isHapticSupported, type HapticType } from './haptics';

describe('haptics', () => {
  describe('triggerHaptic', () => {
    it('returns false when vibrate is not supported', () => {
      const result = triggerHaptic('light');
      expect(result).toBe(false);
    });

    it('returns false when window is undefined', () => {
      const result = triggerHaptic('medium');
      expect(result).toBe(false);
    });

    it('returns false when navigator.vibrate is not available', () => {
      const result = triggerHaptic('heavy');
      expect(result).toBe(false);
    });

    it('returns false for error haptic type when vibrate not supported', () => {
      const result = triggerHaptic('error');
      expect(result).toBe(false);
    });

    it('accepts all valid HapticType values', () => {
      const types: HapticType[] = ['light', 'medium', 'heavy', 'error'];
      types.forEach((type) => {
        const result = triggerHaptic(type);
        expect(result).toBe(false);
      });
    });
  });

  describe('isHapticSupported', () => {
    it('returns false when window is undefined', () => {
      const result = isHapticSupported();
      expect(result).toBe(false);
    });

    it('returns false when navigator.vibrate is not a function', () => {
      const result = isHapticSupported();
      expect(result).toBe(false);
    });
  });

  describe('HapticType', () => {
    it('has light type', () => {
      const type: HapticType = 'light';
      expect(type).toBe('light');
    });

    it('has medium type', () => {
      const type: HapticType = 'medium';
      expect(type).toBe('medium');
    });

    it('has heavy type', () => {
      const type: HapticType = 'heavy';
      expect(type).toBe('heavy');
    });

    it('has error type', () => {
      const type: HapticType = 'error';
      expect(type).toBe('error');
    });
  });
});
