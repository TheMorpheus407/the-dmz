import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { themeStore, getRouteDefaultTheme, STORAGE_KEY, type ThemeState } from './theme';

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
        effects: { scanlines: false, curvature: true, glow: true, noise: true, vignette: true },
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
});
