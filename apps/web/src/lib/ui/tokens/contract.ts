import type { ThemeId, SurfaceId } from '@the-dmz/shared';

export const REQUIRED_THEME_IDS: readonly ThemeId[] = [
  'green',
  'amber',
  'high-contrast',
  'enterprise',
] as const;

export const REQUIRED_SURFACE_IDS: readonly SurfaceId[] = [
  'game',
  'admin',
  'auth',
  'public',
] as const;

export const TOKEN_GROUPS = {
  backgroundSurface: ['--color-bg', '--color-surface'],
  text: ['--color-text', '--color-text-muted'],
  semantic: [
    '--color-safe',
    '--color-warning',
    '--color-danger',
    '--color-info',
    '--color-critical',
  ],
  borderAccent: ['--color-border', '--color-accent'],
  typography: [
    '--font-terminal',
    '--font-document',
    '--font-admin',
    '--text-xs',
    '--text-sm',
    '--text-base',
    '--text-xl',
    '--text-2xl',
  ],
  spacing: ['--space-0', '--space-1', '--space-2', '--space-4', '--space-8'],
  effects: [
    '--effect-scanlines',
    '--effect-curvature',
    '--effect-glow',
    '--effect-noise',
    '--effect-vignette',
  ],
} as const;

export const THEME_OVERRIDE_TOKENS = {
  green: [
    '--color-bg',
    '--color-surface',
    '--color-text',
    '--color-text-muted',
    '--color-border',
    '--color-accent',
    '--color-muted',
  ],
  amber: [
    '--color-bg',
    '--color-surface',
    '--color-text',
    '--color-text-muted',
    '--color-border',
    '--color-accent',
    '--color-muted',
  ],
  'high-contrast': [
    '--color-bg',
    '--color-surface',
    '--color-text',
    '--color-text-muted',
    '--color-border',
    '--color-accent',
    '--color-muted',
    '--color-backdrop',
    '--effect-scanlines',
    '--effect-curvature',
    '--effect-glow',
    '--effect-noise',
    '--effect-vignette',
  ],
  enterprise: [
    '--color-bg',
    '--color-surface',
    '--color-text',
    '--color-text-muted',
    '--color-border',
    '--color-accent',
    '--color-muted',
    '--color-backdrop',
    '--effect-scanlines',
    '--effect-curvature',
    '--effect-glow',
    '--effect-noise',
    '--effect-vignette',
  ],
} as const;

export const EFFECT_DISABLE_TOKENS = [
  '--effect-scanlines',
  '--effect-curvature',
  '--effect-glow',
  '--effect-noise',
  '--effect-vignette',
] as const;

export type TokenGroup = keyof typeof TOKEN_GROUPS;

export const ROUTE_SURFACE_DEFAULTS: Record<SurfaceId, ThemeId> = {
  game: 'green',
  admin: 'enterprise',
  auth: 'enterprise',
  public: 'enterprise',
};

export const ACCESSIBILITY_THEMES: readonly ThemeId[] = ['high-contrast'] as const;

export const ENTERPRISE_THEMES: readonly ThemeId[] = ['enterprise'] as const;

export function getRequiredTokenGroupsForTheme(
  themeId: ThemeId,
): readonly (keyof typeof TOKEN_GROUPS)[] {
  const baseGroups: (keyof typeof TOKEN_GROUPS)[] = [
    'backgroundSurface',
    'text',
    'semantic',
    'borderAccent',
    'typography',
    'spacing',
  ];

  if (themeId === 'high-contrast' || themeId === 'enterprise') {
    return [...baseGroups, 'effects'];
  }

  if (themeId === 'green' || themeId === 'amber') {
    return [...baseGroups, 'effects'];
  }

  return baseGroups;
}

export function isAccessibilityTheme(themeId: ThemeId): boolean {
  return ACCESSIBILITY_THEMES.includes(themeId);
}

export function isEnterpriseTheme(themeId: ThemeId): boolean {
  return ENTERPRISE_THEMES.includes(themeId);
}

export interface TokenContract {
  themes: typeof REQUIRED_THEME_IDS;
  surfaces: typeof REQUIRED_SURFACE_IDS;
  tokenGroups: typeof TOKEN_GROUPS;
  routeDefaults: typeof ROUTE_SURFACE_DEFAULTS;
}

export const TOKEN_CONTRACT: TokenContract = {
  themes: REQUIRED_THEME_IDS,
  surfaces: REQUIRED_SURFACE_IDS,
  tokenGroups: TOKEN_GROUPS,
  routeDefaults: ROUTE_SURFACE_DEFAULTS,
};
