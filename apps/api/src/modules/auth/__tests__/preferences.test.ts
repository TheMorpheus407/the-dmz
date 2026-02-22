import { describe, expect, it } from 'vitest';

import { resolveEffectivePreferences, getLockedPreferenceKeys } from '../preferences.js';

describe('preferences resolution', () => {
  describe('resolveEffectivePreferences', () => {
    it('returns default theme when no preferences provided', () => {
      const result = resolveEffectivePreferences({});

      expect(result.themePreferences?.theme?.value).toBe('green');
      expect(result.themePreferences?.theme?.source).toBe('default');
    });

    it('applies server preferences when provided', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'amber',
          },
        },
      });

      expect(result.themePreferences?.theme?.value).toBe('amber');
      expect(result.themePreferences?.theme?.source).toBe('server');
    });

    it('respects policy-locked preferences', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'amber',
          },
        },
        policyLockedPreferences: {
          theme: true,
        },
      });

      expect(result.themePreferences?.theme?.value).toBe('amber');
      expect(result.themePreferences?.theme?.source).toBe('policy');
    });

    it('returns OS preferences when available', () => {
      const result = resolveEffectivePreferences({
        osPreferences: {
          prefersReducedMotion: true,
          prefersContrast: true,
        },
      });

      expect(result.themePreferences?.theme?.value).toBe('high-contrast');
      expect(result.themePreferences?.theme?.source).toBe('os');
    });

    it('server preferences take precedence over OS preferences', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'green',
          },
        },
        osPreferences: {
          prefersReducedMotion: false,
          prefersContrast: true,
        },
      });

      expect(result.themePreferences?.theme?.value).toBe('green');
      expect(result.themePreferences?.theme?.source).toBe('server');
    });

    it('returns correct effects for high-contrast theme', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'high-contrast',
          },
        },
      });

      expect(result.themePreferences?.effects?.value).toEqual({
        scanlines: false,
        curvature: false,
        glow: false,
        noise: false,
        vignette: false,
      });
    });

    it('returns correct effects for enterprise theme', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'enterprise',
          },
        },
      });

      expect(result.themePreferences?.effects?.value).toEqual({
        scanlines: false,
        curvature: false,
        glow: false,
        noise: false,
        vignette: false,
      });
    });

    it('returns default effects for green theme', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'green',
          },
        },
      });

      expect(result.themePreferences?.effects?.value).toEqual({
        scanlines: true,
        curvature: true,
        glow: true,
        noise: false,
        vignette: true,
      });
    });

    it('applies custom effects from user preferences', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'green',
            effects: {
              scanlines: false,
              curvature: true,
              glow: true,
              noise: true,
              vignette: false,
            },
          },
        },
      });

      expect(result.themePreferences?.effects?.value).toEqual({
        scanlines: false,
        curvature: true,
        glow: true,
        noise: true,
        vignette: false,
      });
      expect(result.themePreferences?.effects?.source).toBe('server');
    });

    it('respects policy-locked effects', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'green',
            effects: {
              scanlines: false,
              curvature: true,
              glow: true,
              noise: true,
              vignette: false,
            },
          },
        },
        policyLockedPreferences: {
          effects: {
            scanlines: true,
          },
        },
      });

      expect(result.themePreferences?.effects?.value).toEqual({
        scanlines: false,
        curvature: true,
        glow: true,
        noise: true,
        vignette: false,
      });
      expect(result.themePreferences?.effects?.source).toBe('policy');
    });

    it('returns correct fontSize defaults', () => {
      const result = resolveEffectivePreferences({});

      expect(result.themePreferences?.fontSize?.value).toBe(16);
      expect(result.themePreferences?.fontSize?.source).toBe('default');
    });

    it('applies accessibility fontSize from OS', () => {
      const result = resolveEffectivePreferences({
        osPreferences: {
          prefersReducedMotion: true,
          prefersContrast: false,
        },
      });

      expect(result.themePreferences?.fontSize?.value).toBe(18);
      expect(result.themePreferences?.fontSize?.source).toBe('os');
    });

    it('applies user fontSize preference', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            fontSize: 20,
          },
        },
      });

      expect(result.themePreferences?.fontSize?.value).toBe(20);
      expect(result.themePreferences?.fontSize?.source).toBe('server');
    });

    it('respects policy-locked fontSize', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            fontSize: 20,
          },
        },
        policyLockedPreferences: {
          fontSize: true,
        },
      });

      expect(result.themePreferences?.fontSize?.value).toBe(20);
      expect(result.themePreferences?.fontSize?.source).toBe('policy');
    });

    it('resolves accessibility preferences correctly', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          accessibilityPreferences: {
            reducedMotion: true,
          },
        },
      });

      expect(result.accessibilityPreferences?.reducedMotion?.value).toBe(true);
      expect(result.accessibilityPreferences?.reducedMotion?.source).toBe('server');
    });

    it('applies OS accessibility preferences', () => {
      const result = resolveEffectivePreferences({
        osPreferences: {
          prefersReducedMotion: true,
          prefersContrast: false,
        },
      });

      expect(result.accessibilityPreferences?.reducedMotion?.value).toBe(true);
      expect(result.accessibilityPreferences?.reducedMotion?.source).toBe('os');
    });

    it('respects route surface defaults', () => {
      const result = resolveEffectivePreferences({
        surface: 'admin',
      });

      expect(result.themePreferences?.theme?.value).toBe('enterprise');
      expect(result.themePreferences?.theme?.source).toBe('default');
    });

    it('server preferences override route defaults', () => {
      const result = resolveEffectivePreferences({
        userPreferences: {
          themePreferences: {
            theme: 'amber',
          },
        },
        surface: 'admin',
      });

      expect(result.themePreferences?.theme?.value).toBe('amber');
      expect(result.themePreferences?.theme?.source).toBe('server');
    });
  });

  describe('getLockedPreferenceKeys', () => {
    it('returns empty array when no policy locked', () => {
      const result = getLockedPreferenceKeys(undefined);
      expect(result).toEqual([]);
    });

    it('returns empty array when no preferences locked', () => {
      const result = getLockedPreferenceKeys({});
      expect(result).toEqual([]);
    });

    it('returns correct keys when preferences are locked', () => {
      const result = getLockedPreferenceKeys({
        theme: true,
        fontSize: true,
        reducedMotion: true,
      });

      expect(result).toContain('theme');
      expect(result).toContain('fontSize');
      expect(result).toContain('reducedMotion');
      expect(result).not.toContain('effects');
    });

    it('returns effects key when effects are locked', () => {
      const result = getLockedPreferenceKeys({
        effects: {
          scanlines: true,
        },
      });

      expect(result).toContain('effects');
    });
  });
});
