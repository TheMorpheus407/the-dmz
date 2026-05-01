import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { themeStore, resolveEffectiveTheme } from './theme';
import type { EffectivePreferenceValue } from '@the-dmz/shared/schemas';

const mockMatchMedia = vi.fn();

vi.mock('$app/environment', () => ({
  browser: true,
}));

describe('resolveEffectiveTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia.mockReturnValue({ matches: false });
    vi.stubGlobal('window', {
      matchMedia: mockMatchMedia,
    });
    themeStore.init();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('when effectivePrefs is undefined', () => {
    it('uses OS preferences for theme name when prefersContrast is true', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.name).toBe('high-contrast');
      expect(result.source.theme).toBe('os');
    });

    it('uses default green theme when prefersContrast is false', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.name).toBe('green');
      expect(result.source.theme).toBe('default');
    });

    it('disables terminal effects for high-contrast theme', () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.source.enableTerminalEffects).toBe('default');
    });

    it('enables terminal effects for green theme', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.enableTerminalEffects).toBe(true);
    });

    it('uses OS prefersReducedMotion to set fontSize to 18 when true', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true };
        }
        if (query === '(prefers-contrast: more)') {
          return { matches: false };
        }
        return { matches: false };
      });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.fontSize).toBe(18);
      expect(result.source.fontSize).toBe('os');
    });

    it('uses default fontSize of 16 when prefersReducedMotion is false', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.fontSize).toBe(16);
      expect(result.source.fontSize).toBe('default');
    });

    it('returns default effects for green theme', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.effects.scanlines).toBe(true);
      expect(result.effects.curvature).toBe(true);
      expect(result.effects.glow).toBe(true);
      expect(result.effects.noise).toBe(false);
      expect(result.effects.vignette).toBe(true);
      expect(result.effects.flicker).toBe(true);
      expect(result.source.effects).toBe('default');
    });

    it('returns no effects for high-contrast theme', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-contrast: more)') {
          return { matches: true };
        }
        return { matches: false };
      });
      themeStore.init();

      const result = resolveEffectiveTheme(undefined, []);

      expect(result.effects.scanlines).toBe(false);
      expect(result.effects.curvature).toBe(false);
      expect(result.effects.glow).toBe(false);
      expect(result.effects.noise).toBe(false);
      expect(result.effects.vignette).toBe(false);
      expect(result.effects.flicker).toBe(false);
    });
  });

  describe('when effectivePrefs is provided', () => {
    it('uses theme preference value when provided', () => {
      const themePref: EffectivePreferenceValue<'green'> = {
        value: 'green',
        source: 'local',
      };
      const prefs = {
        themePreferences: {
          theme: themePref,
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.name).toBe('green');
      expect(result.source.theme).toBe('local');
    });

    it('falls back to OS preferences when theme preference value is null', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-contrast: more)') {
          return { matches: true };
        }
        return { matches: false };
      });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: null,
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.name).toBe('high-contrast');
      expect(result.source.theme).toBe('os');
    });

    it('uses effects preference value when provided', () => {
      const effectsPref: EffectivePreferenceValue = {
        value: {
          scanlines: false,
          curvature: false,
          glow: false,
          noise: false,
          vignette: false,
          flicker: false,
        },
        source: 'server',
      };
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
          effects: effectsPref,
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.effects.scanlines).toBe(false);
      expect(result.effects.curvature).toBe(false);
      expect(result.source.effects).toBe('server');
    });

    it('falls back to default effects when effects preference is undefined', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.effects.scanlines).toBe(true);
      expect(result.effects.curvature).toBe(true);
      expect(result.source.effects).toBe('default');
    });

    it('uses enableTerminalEffects preference when explicitly set to true', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
          enableTerminalEffects: { value: true, source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(true);
      expect(result.source.enableTerminalEffects).toBe('local');
    });

    it('uses enableTerminalEffects preference when explicitly set to false', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
          enableTerminalEffects: { value: false, source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.source.enableTerminalEffects).toBe('local');
    });

    it('derives enableTerminalEffects from theme when preference is undefined', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(true);
      expect(result.source.enableTerminalEffects).toBe('default');
    });

    it('disables terminal effects for enterprise theme when preference is undefined', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'enterprise', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.source.enableTerminalEffects).toBe('default');
    });

    it('disables terminal effects for high-contrast theme when preference is undefined', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'high-contrast', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.source.enableTerminalEffects).toBe('default');
    });

    it('uses fontSize preference when provided', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
          fontSize: { value: 20, source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(20);
      expect(result.source.fontSize).toBe('local');
    });

    it('falls back to OS prefersReducedMotion for fontSize when preference is undefined', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true };
        }
        return { matches: false };
      });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(18);
      expect(result.source.fontSize).toBe('os');
    });

    it('prefers themePreferences.fontSize over accessibilityPreferences.fontSize', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
          fontSize: { value: 20, source: 'local' },
        },
        accessibilityPreferences: {
          fontSize: { value: 24, source: 'server' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(20);
      expect(result.source.fontSize).toBe('local');
    });

    it('uses accessibilityPreferences.fontSize when themePreferences.fontSize is undefined', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
        },
        accessibilityPreferences: {
          fontSize: { value: 22, source: 'server' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(22);
      expect(result.source.fontSize).toBe('server');
    });

    it('tracks theme source correctly when falling back to OS', () => {
      const prefs = {
        themePreferences: {
          theme: null,
        },
      };

      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-contrast: more)') {
          return { matches: true };
        }
        return { matches: false };
      });
      themeStore.init();

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.name).toBe('high-contrast');
      expect(result.source.theme).toBe('os');
    });

    it('tracks fontSize source correctly when falling back to OS', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
        },
      };

      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true };
        }
        return { matches: false };
      });
      themeStore.init();

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(18);
      expect(result.source.fontSize).toBe('os');
    });
  });

  describe('enterprise theme', () => {
    it('disables terminal effects for enterprise theme', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'enterprise', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.effects.scanlines).toBe(false);
      expect(result.effects.curvature).toBe(false);
    });
  });

  describe('amber theme', () => {
    it('has default effects enabled', () => {
      const prefs = {
        themePreferences: {
          theme: { value: 'amber', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.effects.scanlines).toBe(true);
      expect(result.effects.curvature).toBe(true);
      expect(result.effects.glow).toBe(true);
      expect(result.enableTerminalEffects).toBe(true);
    });
  });
});

describe('resolveEffectiveTheme helper functions (extracted)', () => {
  describe('resolveThemeName', () => {
    it('returns themed name from preference when value is set', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const themePref: EffectivePreferenceValue<'green'> = {
        value: 'green',
        source: 'local',
      };

      const result = resolveEffectiveTheme(
        { themePreferences: { theme: themePref } } as EffectivePreferences,
        [],
      );

      expect(result.name).toBe('green');
    });

    it('returns high-contrast when os prefersContrast is true and no preference', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-contrast: more)') {
          return { matches: true };
        }
        return { matches: false };
      });
      themeStore.init();

      const result = resolveEffectiveTheme(
        { themePreferences: {} } as EffectivePreferences,
        [],
      );

      expect(result.name).toBe('high-contrast');
      expect(result.source.theme).toBe('os');
    });

    it('returns green as default when no preferences and no OS preferences', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const result = resolveEffectiveTheme(
        { themePreferences: {} } as EffectivePreferences,
        [],
      );

      expect(result.name).toBe('green');
      expect(result.source.theme).toBe('default');
    });
  });

  describe('resolveEffects', () => {
    it('returns effects from preference when provided', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const effectsPref: EffectivePreferenceValue = {
        value: {
          scanlines: false,
          curvature: false,
          glow: false,
          noise: false,
          vignette: false,
          flicker: false,
        },
        source: 'server',
      };
      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
          effects: effectsPref,
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.effects.scanlines).toBe(false);
      expect(result.effects.curvature).toBe(false);
      expect(result.source.effects).toBe('server');
    });

    it('returns default effects for amber theme', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: { value: 'amber', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.effects.scanlines).toBe(true);
      expect(result.effects.curvature).toBe(true);
      expect(result.effects.glow).toBe(true);
    });

    it('returns no effects for enterprise theme', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: { value: 'enterprise', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.effects.scanlines).toBe(false);
      expect(result.effects.curvature).toBe(false);
      expect(result.effects.glow).toBe(false);
    });
  });

  describe('resolveTerminalEffects', () => {
    it('returns explicit preference value when set', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
          enableTerminalEffects: { value: false, source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.source.enableTerminalEffects).toBe('local');
    });

    it('derives true for green theme when no explicit preference', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: { value: 'green', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(true);
      expect(result.source.enableTerminalEffects).toBe('default');
    });

    it('derives false for high-contrast theme when no explicit preference', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: { value: 'high-contrast', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.source.enableTerminalEffects).toBe('default');
    });

    it('derives false for enterprise theme when no explicit preference', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {
          theme: { value: 'enterprise', source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.enableTerminalEffects).toBe(false);
      expect(result.source.enableTerminalEffects).toBe('default');
    });
  });

  describe('resolveFontSize', () => {
    it('returns fontSize from theme preference when provided', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {
          fontSize: { value: 20, source: 'local' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(20);
      expect(result.source.fontSize).toBe('local');
    });

    it('returns fontSize from accessibility preference when theme preference is missing', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {},
        accessibilityPreferences: {
          fontSize: { value: 22, source: 'server' },
        },
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(22);
      expect(result.source.fontSize).toBe('server');
    });

    it('returns 18 when OS prefersReducedMotion is true and no preference', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true };
        }
        return { matches: false };
      });
      themeStore.init();

      const prefs = {
        themePreferences: {},
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(18);
      expect(result.source.fontSize).toBe('os');
    });

    it('returns 16 as default when no preference and OS prefersReducedMotion is false', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      themeStore.init();

      const prefs = {
        themePreferences: {},
      };

      const result = resolveEffectiveTheme(prefs as EffectivePreferences, []);

      expect(result.fontSize).toBe(16);
      expect(result.source.fontSize).toBe('default');
    });
  });
});