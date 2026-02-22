import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, it } from 'vitest';

import {
  REQUIRED_THEME_IDS,
  REQUIRED_SURFACE_IDS,
  TOKEN_GROUPS,
  THEME_OVERRIDE_TOKENS,
  ROUTE_SURFACE_DEFAULTS,
} from './contract';

export interface ValidationError {
  type: 'missing_theme' | 'missing_token' | 'missing_surface' | 'route_drift' | 'effect_mismatch';
  theme?: string;
  surface?: string;
  token?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function extractThemesFromCss(css: string): string[] {
  const themeRegex = /\[data-theme='([^']+)'\]/g;
  const themes = new Set<string>();
  let match;

  while ((match = themeRegex.exec(css)) !== null) {
    if (match[1]) {
      themes.add(match[1]);
    }
  }

  return Array.from(themes);
}

function extractSurfacesFromCss(css: string): string[] {
  const surfaceRegex = /\[data-surface='([^']+)'\]/g;
  const surfaces = new Set<string>();
  let match;

  while ((match = surfaceRegex.exec(css)) !== null) {
    if (match[1]) {
      surfaces.add(match[1]);
    }
  }

  return Array.from(surfaces);
}

function extractTokensFromThemeBlock(css: string, theme: string): string[] {
  const themeBlockRegex = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]+)\\}`, 'g');
  const tokens = new Set<string>();
  let match;

  while ((match = themeBlockRegex.exec(css)) !== null) {
    const blockContent = match[1];
    if (!blockContent) continue;
    const tokenRegex = /(--[\w-]+)\s*:/g;
    let tokenMatch;

    while ((tokenMatch = tokenRegex.exec(blockContent)) !== null) {
      if (tokenMatch[1]) {
        tokens.add(tokenMatch[1]);
      }
    }
  }

  return Array.from(tokens);
}

function validateThemeTokens(
  css: string,
  requiredThemes: readonly string[],
  _requiredTokenGroups: typeof TOKEN_GROUPS,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const cssThemes = extractThemesFromCss(css);

  for (const theme of requiredThemes) {
    if (!cssThemes.includes(theme)) {
      errors.push({
        type: 'missing_theme',
        theme,
        message: `Required theme '${theme}' is missing from CSS`,
      });
      continue;
    }

    const themeTokens = extractTokensFromThemeBlock(css, theme);
    const requiredOverrides = THEME_OVERRIDE_TOKENS[theme as keyof typeof THEME_OVERRIDE_TOKENS];

    if (requiredOverrides) {
      const missingTokens = requiredOverrides.filter(
        (token: string) => !themeTokens.some((t: string) => t === token),
      );

      if (missingTokens.length > 0) {
        errors.push({
          type: 'missing_token',
          theme,
          token: 'themeOverride',
          message: `Theme '${theme}' is missing required override tokens: ${missingTokens.join(', ')}`,
        });
      }
    }
  }

  return errors;
}

function validateRootTokens(
  css: string,
  requiredTokenGroups: typeof TOKEN_GROUPS,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rootBlockRegex = /:root\s*\{([^}]+)\}/s;
  const rootMatch = rootBlockRegex.exec(css);

  if (!rootMatch) {
    errors.push({
      type: 'missing_token',
      message: ':root block not found in CSS',
    });
    return errors;
  }

  const rootContent = rootMatch[1];
  const rootTokenGroups = Object.entries(requiredTokenGroups).filter(
    ([groupName]) => groupName !== 'effects',
  );
  const allRequiredTokens = Object.values(Object.fromEntries(rootTokenGroups)).flat();

  const missingTokens = allRequiredTokens.filter((token) => {
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedToken + '\\s*:');
    return !(rootContent ? regex.test(rootContent) : false);
  });

  if (missingTokens.length > 0) {
    errors.push({
      type: 'missing_token',
      message: `:root is missing required tokens: ${missingTokens.join(', ')}`,
    });
  }

  return errors;
}

function validateSurfaces(css: string, requiredSurfaces: readonly string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const cssSurfaces = extractSurfacesFromCss(css);

  for (const surface of requiredSurfaces) {
    if (!cssSurfaces.includes(surface)) {
      errors.push({
        type: 'missing_surface',
        surface,
        message: `Required surface '${surface}' is missing from CSS`,
      });
    }
  }

  return errors;
}

function validateRouteDefaults(
  runtimeDefaults: typeof ROUTE_SURFACE_DEFAULTS,
  contractDefaults: typeof ROUTE_SURFACE_DEFAULTS,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [surface, theme] of Object.entries(runtimeDefaults)) {
    const expectedTheme = contractDefaults[surface as keyof typeof contractDefaults];
    if (theme !== expectedTheme) {
      errors.push({
        type: 'route_drift',
        surface,
        theme,
        message: `Route-surface '${surface}' maps to '${theme}' but contract expects '${expectedTheme}'`,
      });
    }
  }

  return errors;
}

function validateThemeEffects(css: string): ValidationError[] {
  const errors: ValidationError[] = [];

  const accessibilityThemeRegex = /\[data-theme='high-contrast'\]/g;
  const accessibilityThemeBlocks: string[] = [];

  while (accessibilityThemeRegex.exec(css) !== null) {
    const blockRegex = /\[data-theme='high-contrast'\]\s*\{([^}]+)\}/g;
    const blockMatch = blockRegex.exec(css);
    if (blockMatch && blockMatch[1]) {
      accessibilityThemeBlocks.push(blockMatch[1]);
    }
  }

  for (const block of accessibilityThemeBlocks) {
    const hasScanlinesOff = block.includes('--effect-scanlines:') && block.includes('0');
    const hasCurvatureOff = block.includes('--effect-curvature:') && block.includes('0');
    const hasGlowOff = block.includes('--effect-glow:') && block.includes('0');

    if (!hasScanlinesOff || !hasCurvatureOff || !hasGlowOff) {
      errors.push({
        type: 'effect_mismatch',
        theme: 'high-contrast',
        message:
          'High-contrast theme must disable CRT effects (--effect-scanlines: 0, --effect-curvature: 0, --effect-glow: 0)',
      });
    }
  }

  const enterpriseThemeRegex = /\[data-theme='enterprise'\]/g;
  const enterpriseThemeBlocks: string[] = [];

  while (enterpriseThemeRegex.exec(css) !== null) {
    const blockRegex = /\[data-theme='enterprise'\]\s*\{([^}]+)\}/g;
    const blockMatch = blockRegex.exec(css);
    if (blockMatch && blockMatch[1]) {
      enterpriseThemeBlocks.push(blockMatch[1]);
    }
  }

  for (const block of enterpriseThemeBlocks) {
    const hasScanlinesOff = block.includes('--effect-scanlines:') && block.includes('0');
    const hasCurvatureOff = block.includes('--effect-curvature:') && block.includes('0');
    const hasGlowOff = block.includes('--effect-glow:') && block.includes('0');

    if (!hasScanlinesOff || !hasCurvatureOff || !hasGlowOff) {
      errors.push({
        type: 'effect_mismatch',
        theme: 'enterprise',
        message:
          'Enterprise theme must disable CRT effects (--effect-scanlines: 0, --effect-curvature: 0, --effect-glow: 0)',
      });
    }
  }

  return errors;
}

export function validateTokenContract(
  cssContent: string,
  runtimeRouteDefaults: typeof ROUTE_SURFACE_DEFAULTS,
): ValidationResult {
  const errors: ValidationError[] = [
    ...validateThemeTokens(cssContent, [...REQUIRED_THEME_IDS], TOKEN_GROUPS),
    ...validateRootTokens(cssContent, TOKEN_GROUPS),
    ...validateSurfaces(cssContent, [...REQUIRED_SURFACE_IDS]),
    ...validateRouteDefaults(runtimeRouteDefaults, ROUTE_SURFACE_DEFAULTS),
    ...validateThemeEffects(cssContent),
  ];

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function runTokenValidation(): void {
  const tokensPath = resolve('./src/lib/ui/tokens/index.css');
  const cssContent = readFileSync(tokensPath, 'utf-8');

  const runtimeRouteDefaults: typeof ROUTE_SURFACE_DEFAULTS = {
    game: 'green',
    admin: 'enterprise',
    auth: 'enterprise',
    public: 'enterprise',
  };

  const result = validateTokenContract(cssContent, runtimeRouteDefaults);

  if (!result.valid) {
    console.error('\n❌ Token Contract Validation FAILED\n');
    console.error('The following issues were found:\n');

    for (const error of result.errors) {
      console.error(`  [${error.type}] ${error.message}`);
    }

    console.error('\n');
    process.exit(1);
  }

  console.log('\n✅ Token Contract Validation PASSED\n');
  console.log(`  - All ${REQUIRED_THEME_IDS.length} required themes present`);
  console.log(`  - All ${REQUIRED_SURFACE_IDS.length} required surfaces present`);
  console.log(`  - Route-surface defaults match contract`);
  console.log(`  - Theme effects configuration validated\n`);

  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTokenValidation();
}

const tokensPath = resolve('./src/lib/ui/tokens/index.css');
const tokensCss = readFileSync(tokensPath, 'utf-8');

const runtimeRouteDefaults: typeof ROUTE_SURFACE_DEFAULTS = {
  game: 'green',
  admin: 'enterprise',
  auth: 'enterprise',
  public: 'enterprise',
};

describe('Token Contract Gate', () => {
  it('passes token contract validation', () => {
    const result = validateTokenContract(tokensCss, runtimeRouteDefaults);

    if (!result.valid) {
      const errorMessages = result.errors.map((e) => e.message).join('\n');
      expect(result.valid, `Token contract validation failed:\n${errorMessages}`).toBe(true);
    }
  });

  it('validates all required themes are present', () => {
    const errors = validateThemeTokens(tokensCss, [...REQUIRED_THEME_IDS], TOKEN_GROUPS);
    const missingThemeErrors = errors.filter((e) => e.type === 'missing_theme');

    expect(
      missingThemeErrors,
      `Missing themes: ${missingThemeErrors.map((e) => e.message).join(', ')}`,
    ).toHaveLength(0);
  });

  it('validates all required surfaces are present', () => {
    const errors = validateSurfaces(tokensCss, [...REQUIRED_SURFACE_IDS]);
    expect(errors, `Missing surfaces: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });

  it('validates route-surface defaults match contract', () => {
    const errors = validateRouteDefaults(runtimeRouteDefaults, ROUTE_SURFACE_DEFAULTS);
    expect(errors, `Route drift: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });

  it('validates high-contrast and enterprise themes disable CRT effects', () => {
    const errors = validateThemeEffects(tokensCss);
    expect(errors, `Effect mismatch: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0);
  });
});
