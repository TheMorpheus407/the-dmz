import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

const mockMatchMedia = vi.fn();

import { loadPersistedSettings, persistSettings } from './persistence';
import { initialSettingsState } from './defaults';

import type { SettingsState } from './types';

describe('persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockReturnValue({ matches: false });
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('window', {
      matchMedia: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadPersistedSettings', () => {
    it('returns initial state when no stored data exists', () => {
      const result = loadPersistedSettings();
      expect(result).toEqual(initialSettingsState);
    });

    it('returns stored settings when valid JSON exists', () => {
      const storedState = {
        display: {
          theme: 'amber',
          enableTerminalEffects: false,
          effects: {
            scanlines: false,
            curvature: false,
            glow: false,
            noise: false,
            vignette: false,
            flicker: false,
          },
          effectIntensity: {
            scanlines: 50,
            curvature: 50,
            glow: 50,
            noise: 50,
            vignette: 50,
            flicker: 50,
          },
          fontSize: 18,
          terminalGlowIntensity: 50,
        },
        accessibility: initialSettingsState.accessibility,
        gameplay: initialSettingsState.gameplay,
        audio: initialSettingsState.audio,
        account: initialSettingsState.account,
        performance: initialSettingsState.performance,
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedState));

      const result = loadPersistedSettings();
      expect(result.display.theme).toBe('amber');
      expect(result.display.fontSize).toBe(18);
    });

    it('falls back to initial state on invalid JSON', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const result = loadPersistedSettings();
      expect(result).toEqual(initialSettingsState);
    });

    it('falls back to initial state when localStorage throws', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const result = loadPersistedSettings();
      expect(result).toEqual(initialSettingsState);
    });

    it('respects prefers-reduced-motion media query', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true };
        }
        return { matches: false };
      });

      const result = loadPersistedSettings();
      expect(result.accessibility.reducedMotion).toBe(true);
    });

    it('respects prefers-contrast media query', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-contrast: more)') {
          return { matches: true };
        }
        return { matches: false };
      });

      const result = loadPersistedSettings();
      expect(result.accessibility.highContrast).toBe(true);
    });

    it('deep merges partial stored settings with defaults', () => {
      const partialStored = {
        display: {
          theme: 'amber',
        },
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(partialStored));

      const result = loadPersistedSettings();
      expect(result.display.theme).toBe('amber');
      expect(result.display.enableTerminalEffects).toBe(true);
    });
  });

  describe('persistSettings', () => {
    it('saves settings to localStorage', () => {
      const state: SettingsState = {
        ...initialSettingsState,
        display: {
          ...initialSettingsState.display,
          theme: 'amber',
        },
      };

      persistSettings(state);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'dmz-app-settings',
        JSON.stringify(state),
      );
    });

    it('handles localStorage unavailable gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      expect(() => persistSettings(initialSettingsState)).not.toThrow();
    });
  });
});
