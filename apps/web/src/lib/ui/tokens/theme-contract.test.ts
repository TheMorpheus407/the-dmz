import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { SurfaceId } from '@the-dmz/shared';
import { themeStore, getRouteDefaultTheme } from '$lib/stores/theme';

import {
  REQUIRED_THEME_IDS,
  REQUIRED_SURFACE_IDS,
  ROUTE_SURFACE_DEFAULTS,
  TOKEN_GROUPS,
  ACCESSIBILITY_THEMES,
  ENTERPRISE_THEMES,
} from './contract';

const tokensPath = resolve('./src/lib/ui/tokens/index.css');
const tokensCss = readFileSync(tokensPath, 'utf-8');

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$app/navigation', () => ({
  page: {
    subscribe: vi.fn(),
  },
}));

describe('Token Contract Validation', () => {
  const tokensPath = resolve('./src/lib/ui/tokens/index.css');
  const tokensCss = readFileSync(tokensPath, 'utf-8');

  describe('Required Themes', () => {
    it.each(REQUIRED_THEME_IDS)('defines %s theme in CSS', (theme) => {
      expect(tokensCss).toContain(`[data-theme='${theme}']`);
    });
  });

  describe('Required Surfaces', () => {
    it.each(REQUIRED_SURFACE_IDS)('defines %s surface in CSS', (surface) => {
      expect(tokensCss).toContain(`[data-surface='${surface}']`);
    });
  });

  describe('Background/Surface Tokens', () => {
    it.each(REQUIRED_THEME_IDS)('theme %s defines background tokens', (theme) => {
      const themeBlockRegex = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]+)\\}`, 's');
      const match = themeBlockRegex.exec(tokensCss);
      expect(match).not.toBeNull();

      const blockContent = match![1];
      TOKEN_GROUPS.backgroundSurface.forEach((token) => {
        expect(blockContent).toContain(token);
      });
    });
  });

  describe('Text Tokens', () => {
    it.each(REQUIRED_THEME_IDS)('theme %s defines text tokens', (theme) => {
      const themeBlockRegex = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]+)\\}`, 's');
      const match = themeBlockRegex.exec(tokensCss);
      expect(match).not.toBeNull();

      const blockContent = match![1];
      TOKEN_GROUPS.text.forEach((token) => {
        expect(blockContent).toContain(token);
      });
    });
  });

  describe('Semantic State Tokens', () => {
    it('defines semantic status colors in root', () => {
      TOKEN_GROUPS.semantic.forEach((token) => {
        expect(tokensCss).toContain(token);
      });
    });
  });

  describe('Border/Accent Tokens', () => {
    it.each(REQUIRED_THEME_IDS)('theme %s defines border/accent tokens', (theme) => {
      const themeBlockRegex = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]+)\\}`, 's');
      const match = themeBlockRegex.exec(tokensCss);
      expect(match).not.toBeNull();

      const blockContent = match![1];
      TOKEN_GROUPS.borderAccent.forEach((token) => {
        expect(blockContent).toContain(token);
      });
    });
  });

  describe('Typography Tokens', () => {
    it('defines font families', () => {
      TOKEN_GROUPS.typography
        .filter((t) => t.startsWith('--font-'))
        .forEach((token) => {
          expect(tokensCss).toContain(token);
        });
    });

    it('defines type scale', () => {
      TOKEN_GROUPS.typography
        .filter((t) => t.startsWith('--text-'))
        .forEach((token) => {
          expect(tokensCss).toContain(token);
        });
    });
  });

  describe('Spacing Tokens', () => {
    it('defines spacing scale', () => {
      TOKEN_GROUPS.spacing.forEach((token) => {
        expect(tokensCss).toContain(token);
      });
    });
  });

  describe('Accessibility Themes', () => {
    it.each(ACCESSIBILITY_THEMES)('theme %s disables CRT effects', (theme) => {
      const themeBlockRegex = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]+)\\}`, 's');
      const match = themeBlockRegex.exec(tokensCss);
      expect(match).not.toBeNull();

      const blockContent = match![1];
      expect(blockContent).toContain('--effect-scanlines:');
      expect(blockContent).toContain('--effect-glow:');
    });
  });

  describe('Enterprise Themes', () => {
    it.each(ENTERPRISE_THEMES)('theme %s disables CRT effects', (theme) => {
      const themeBlockRegex = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]+)\\}`, 's');
      const match = themeBlockRegex.exec(tokensCss);
      expect(match).not.toBeNull();

      const blockContent = match![1];
      expect(blockContent).toContain('--effect-scanlines:');
      expect(blockContent).toContain('--effect-glow:');
    });
  });

  describe('High Contrast Readability', () => {
    it('high-contrast theme uses pure black/white for maximum contrast', () => {
      const themeBlockRegex = /\[data-theme='high-contrast'\]\s*\{([^}]+)\}/s;
      const match = themeBlockRegex.exec(tokensCss);
      expect(match).not.toBeNull();

      const blockContent = match![1];
      expect(blockContent).toContain('#000000');
      expect(blockContent).toContain('#ffffff');
    });
  });

  describe('Route-Surface Default Mappings', () => {
    it('game surface uses green theme by default', () => {
      expect(ROUTE_SURFACE_DEFAULTS.game).toBe('green');
    });

    it('admin surface uses enterprise theme by default', () => {
      expect(ROUTE_SURFACE_DEFAULTS.admin).toBe('enterprise');
    });

    it('auth surface uses enterprise theme by default', () => {
      expect(ROUTE_SURFACE_DEFAULTS.auth).toBe('enterprise');
    });

    it('public surface uses enterprise theme by default', () => {
      expect(ROUTE_SURFACE_DEFAULTS.public).toBe('enterprise');
    });
  });
});

describe('Runtime Theme Contract', () => {
  let mockDataset: Record<string, string>;
  let mockStyle: Record<string, string>;

  beforeEach(() => {
    mockDataset = {};
    mockStyle = {};

    vi.stubGlobal('document', {
      documentElement: {
        dataset: mockDataset,
        style: {
          setProperty: (key: string, value: string) => {
            mockStyle[key] = value;
          },
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('data-theme Assignment via setTheme()', () => {
    it('applies green theme correctly', () => {
      themeStore.setTheme('green');
      expect(mockDataset['theme']).toBe('green');
    });

    it('applies amber theme correctly', () => {
      themeStore.setTheme('amber');
      expect(mockDataset['theme']).toBe('amber');
    });

    it('applies high-contrast theme correctly', () => {
      themeStore.setTheme('high-contrast');
      expect(mockDataset['theme']).toBe('high-contrast');
    });

    it('applies enterprise theme correctly', () => {
      themeStore.setTheme('enterprise');
      expect(mockDataset['theme']).toBe('enterprise');
    });

    it('high-contrast theme sets data-high-contrast attribute', () => {
      themeStore.setTheme('high-contrast');
      expect(mockDataset['highContrast']).toBe('on');
    });

    it('non-high-contrast themes do not set high-contrast flag', () => {
      themeStore.setTheme('green');
      expect(mockDataset['highContrast']).toBe('off');
    });
  });

  describe('Effect Toggles via setTheme()', () => {
    it('green theme enables scanlines', () => {
      themeStore.setTheme('green');
      expect(mockDataset['scanlines']).toBe('on');
    });

    it('high-contrast theme disables scanlines', () => {
      themeStore.setTheme('high-contrast');
      expect(mockDataset['scanlines']).toBe('off');
    });

    it('enterprise theme disables scanlines', () => {
      themeStore.setTheme('enterprise');
      expect(mockDataset['scanlines']).toBe('off');
    });

    it('green theme enables glow effects', () => {
      themeStore.setTheme('green');
      expect(mockDataset['glow']).toBe('on');
    });

    it('high-contrast theme disables glow effects', () => {
      themeStore.setTheme('high-contrast');
      expect(mockDataset['glow']).toBe('off');
    });

    it('enterprise theme disables glow effects', () => {
      themeStore.setTheme('enterprise');
      expect(mockDataset['glow']).toBe('off');
    });

    it('green theme enables curvature', () => {
      themeStore.setTheme('green');
      expect(mockDataset['curvature']).toBe('on');
    });

    it('high-contrast theme disables curvature', () => {
      themeStore.setTheme('high-contrast');
      expect(mockDataset['curvature']).toBe('off');
    });
  });

  describe('getRouteDefaultTheme() function', () => {
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

    it('matches contract ROUTE_SURFACE_DEFAULTS', () => {
      (['game', 'admin', 'auth', 'public'] as SurfaceId[]).forEach((surface) => {
        expect(getRouteDefaultTheme(surface)).toBe(ROUTE_SURFACE_DEFAULTS[surface]);
      });
    });
  });

  describe('Surface Data Attribute (via setTheme)', () => {
    it('theme store applies theme which affects CSS selectors', () => {
      themeStore.setTheme('green');
      expect(mockDataset['theme']).toBe('green');
    });
  });

  describe('Token-Driven Primitives', () => {
    it('uses CSS custom properties for all color tokens', () => {
      expect(tokensCss).toContain('--color-bg:');
      expect(tokensCss).toContain('--color-surface:');
      expect(tokensCss).toContain('--color-text:');
    });

    it('themes reference CSS custom properties', () => {
      expect(tokensCss).toContain("[data-theme='green']");
      expect(tokensCss).toContain("[data-theme='amber']");
      expect(tokensCss).toContain("[data-theme='high-contrast']");
      expect(tokensCss).toContain("[data-theme='enterprise']");
    });

    it('uses CSS custom properties for typography', () => {
      expect(tokensCss).toContain('--font-terminal:');
      expect(tokensCss).toContain('--font-document:');
      expect(tokensCss).toContain('--font-admin:');
    });

    it('uses CSS custom properties for spacing', () => {
      expect(tokensCss).toContain('--space-');
    });
  });
});
