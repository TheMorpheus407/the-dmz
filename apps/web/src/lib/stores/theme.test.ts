import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  themeStore,
  getRouteDefaultTheme,
  STORAGE_KEY,
  type ThemeState,
  DEFAULT_INTENSITIES,
} from './theme';

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

const mockDocumentElement = {
  dataset: {} as Record<string, string>,
  style: {
    setProperty: vi.fn(),
  },
};

const mockMatchMedia = vi.fn();

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.stubGlobal('localStorage', mockLocalStorage);
vi.stubGlobal('document', {
  documentElement: mockDocumentElement,
});
vi.stubGlobal('window', {
  matchMedia: mockMatchMedia,
});

describe('themeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockDocumentElement.dataset = {};
    mockMatchMedia.mockReturnValue({ matches: false });
  });

  describe('initial state', () => {
    it('has correct initial theme state', () => {
      const state = get(themeStore);
      expect(state.name).toBe('green');
      expect(state.enableTerminalEffects).toBe(true);
      expect(state.fontSize).toBe(16);
    });
  });

  describe('setTheme', () => {
    it('changes theme to green and applies effects', () => {
      themeStore.setTheme('green');
      const state = get(themeStore);
      expect(state.name).toBe('green');
      expect(state.effects.scanlines).toBe(true);
      expect(state.effects.glow).toBe(true);
    });

    it('changes theme to amber', () => {
      themeStore.setTheme('amber');
      const state = get(themeStore);
      expect(state.name).toBe('amber');
    });

    it('disables all effects for high-contrast theme', () => {
      themeStore.setTheme('high-contrast');
      const state = get(themeStore);
      expect(state.name).toBe('high-contrast');
      expect(state.enableTerminalEffects).toBe(false);
      expect(state.effects.scanlines).toBe(false);
      expect(state.effects.curvature).toBe(false);
      expect(state.effects.glow).toBe(false);
      expect(state.effects.noise).toBe(false);
      expect(state.effects.vignette).toBe(false);
    });

    it('disables all effects for enterprise theme', () => {
      themeStore.setTheme('enterprise');
      const state = get(themeStore);
      expect(state.name).toBe('enterprise');
      expect(state.enableTerminalEffects).toBe(false);
      expect(state.effects.scanlines).toBe(false);
    });
  });

  describe('setEffects', () => {
    it('updates specific effect while preserving others', () => {
      themeStore.setTheme('green');
      themeStore.setEffects({ scanlines: false });
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(false);
      expect(state.effects.glow).toBe(true);
    });
  });

  describe('setFontSize', () => {
    it('sets font size within valid range', () => {
      themeStore.setFontSize(20);
      const state = get(themeStore);
      expect(state.fontSize).toBe(20);
    });

    it('clamps font size to minimum', () => {
      themeStore.setFontSize(5);
      const state = get(themeStore);
      expect(state.fontSize).toBe(12);
    });

    it('clamps font size to maximum', () => {
      themeStore.setFontSize(50);
      const state = get(themeStore);
      expect(state.fontSize).toBe(32);
    });
  });

  describe('persistence', () => {
    it('saves theme to localStorage', () => {
      themeStore.setTheme('amber');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('loads theme from localStorage', () => {
      const storedState: ThemeState = {
        name: 'amber',
        enableTerminalEffects: true,
        effects: {
          scanlines: false,
          curvature: true,
          glow: true,
          noise: true,
          vignette: true,
          flicker: true,
        },
        intensities: DEFAULT_INTENSITIES,
        fontSize: 18,
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedState));

      themeStore.init();
      const state = get(themeStore);
      expect(state.name).toBe('amber');
      expect(state.fontSize).toBe(18);
    });
  });

  describe('getRouteDefaultTheme', () => {
    it('returns green for game surface', () => {
      expect(getRouteDefaultTheme('game')).toBe('green');
    });

    it('returns enterprise for admin surface', () => {
      expect(getRouteDefaultTheme('admin')).toBe('enterprise');
    });

    it('returns enterprise for auth surface', () => {
      expect(getRouteDefaultTheme('auth')).toBe('enterprise');
    });

    it('returns enterprise for public surface', () => {
      expect(getRouteDefaultTheme('public')).toBe('enterprise');
    });
  });

  describe('STORAGE_KEY', () => {
    it('exports correct storage key', () => {
      expect(STORAGE_KEY).toBe('dmz-theme-preference');
    });
  });

  describe('applyThemeToDom', () => {
    it('sets data attributes for scanlines when enabled', () => {
      themeStore.setTheme('green');
      expect(mockDocumentElement.dataset['scanlines']).toBe('on');
    });

    it('sets data attributes for scanlines when disabled', () => {
      themeStore.setEffects({ scanlines: false });
      expect(mockDocumentElement.dataset['scanlines']).toBe('off');
    });

    it('sets data attributes for curvature when enabled', () => {
      themeStore.setTheme('green');
      expect(mockDocumentElement.dataset['curvature']).toBe('on');
    });

    it('sets data attributes for curvature when disabled', () => {
      themeStore.setEffects({ curvature: false });
      expect(mockDocumentElement.dataset['curvature']).toBe('off');
    });

    it('sets data attributes for glow when enabled', () => {
      themeStore.setTheme('green');
      expect(mockDocumentElement.dataset['glow']).toBe('on');
    });

    it('sets data attributes for glow when disabled', () => {
      themeStore.setEffects({ glow: false });
      expect(mockDocumentElement.dataset['glow']).toBe('off');
    });

    it('sets data attributes for noise when enabled', () => {
      themeStore.setEffects({ noise: true });
      expect(mockDocumentElement.dataset['noise']).toBe('on');
    });

    it('sets data attributes for noise when disabled', () => {
      themeStore.setEffects({ noise: false });
      expect(mockDocumentElement.dataset['noise']).toBe('off');
    });

    it('sets data attributes for vignette when enabled', () => {
      themeStore.setTheme('green');
      expect(mockDocumentElement.dataset['vignette']).toBe('on');
    });

    it('sets data attributes for vignette when disabled', () => {
      themeStore.setEffects({ vignette: false });
      expect(mockDocumentElement.dataset['vignette']).toBe('off');
    });

    it('sets high-contrast data attribute for high-contrast theme', () => {
      themeStore.setTheme('high-contrast');
      expect(mockDocumentElement.dataset['highContrast']).toBe('on');
    });

    it('does not set high-contrast for green theme', () => {
      themeStore.setTheme('green');
      expect(mockDocumentElement.dataset['highContrast']).toBe('off');
    });
  });

  describe('prefers-reduced-motion', () => {
    it('disables all motion effects when prefers-reduced-motion is true', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      themeStore.init();
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(false);
      expect(state.effects.curvature).toBe(false);
      expect(state.effects.glow).toBe(false);
      expect(state.effects.noise).toBe(false);
      expect(state.effects.vignette).toBe(false);
    });
  });

  describe('setIntensity', () => {
    it('sets scanlines intensity', () => {
      themeStore.setIntensity('scanlines', 75);
      const state = get(themeStore);
      expect(state.intensities.scanlines).toBe(75);
    });

    it('clamps intensity to minimum 0', () => {
      themeStore.setIntensity('glow', -10);
      const state = get(themeStore);
      expect(state.intensities.glow).toBe(0);
    });

    it('clamps intensity to maximum 100', () => {
      themeStore.setIntensity('noise', 150);
      const state = get(themeStore);
      expect(state.intensities.noise).toBe(100);
    });

    it('applies intensity to CSS variable', () => {
      themeStore.setIntensity('glow', 50);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        '--glow-intensity',
        expect.any(String),
      );
    });
  });

  describe('applyPreset', () => {
    it('applies off preset', () => {
      themeStore.applyPreset('off');
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(false);
      expect(state.effects.glow).toBe(false);
    });

    it('applies light preset', () => {
      themeStore.applyPreset('light');
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(true);
      expect(state.effects.curvature).toBe(false);
    });

    it('applies authentic preset', () => {
      themeStore.applyPreset('authentic');
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(true);
      expect(state.effects.curvature).toBe(true);
    });

    it('applies heavy preset', () => {
      themeStore.applyPreset('heavy');
      const state = get(themeStore);
      expect(state.effects.noise).toBe(true);
    });
  });

  describe('resetToDefaults', () => {
    it('resets effects to defaults', () => {
      themeStore.setEffects({ scanlines: false, glow: false });
      themeStore.resetToDefaults();
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(true);
      expect(state.effects.glow).toBe(true);
    });

    it('resets intensities to defaults', () => {
      themeStore.setIntensity('scanlines', 100);
      themeStore.resetToDefaults();
      const state = get(themeStore);
      expect(state.intensities.scanlines).toBe(50);
    });
  });

  describe('disableAllEffects', () => {
    it('disables all effects', () => {
      themeStore.disableAllEffects();
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(false);
      expect(state.effects.curvature).toBe(false);
      expect(state.effects.glow).toBe(false);
      expect(state.effects.noise).toBe(false);
      expect(state.effects.vignette).toBe(false);
    });

    it('disables enableTerminalEffects', () => {
      themeStore.disableAllEffects();
      const state = get(themeStore);
      expect(state.enableTerminalEffects).toBe(false);
    });
  });

  describe('exportSettings', () => {
    it('exports current settings as JSON', () => {
      themeStore.setTheme('green');
      const settings = themeStore.exportSettings();
      expect(settings.effects).toBeDefined();
      expect(settings.intensities).toBeDefined();
      expect(settings.effects.scanlines).toBe(true);
    });
  });

  describe('importSettings', () => {
    it('imports valid settings', () => {
      const settings = {
        effects: {
          scanlines: false,
          curvature: true,
          glow: false,
          noise: true,
          vignette: false,
          flicker: false,
        },
        intensities: {
          scanlines: 25,
          curvature: 50,
          glow: 75,
          noise: 100,
          vignette: 10,
          flicker: 30,
        },
      };
      const result = themeStore.importSettings(settings);
      expect(result).toBe(true);
      const state = get(themeStore);
      expect(state.effects.scanlines).toBe(false);
      expect(state.intensities.scanlines).toBe(25);
    });

    it('handles invalid settings gracefully', () => {
      const invalidSettings = null;
      const result = themeStore.importSettings(invalidSettings as never);
      expect(result).toBe(false);
    });
  });
});
