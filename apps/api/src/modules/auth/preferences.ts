import type { SurfaceId, ThemeId } from '@the-dmz/shared/constants';
import { THEME_METADATA } from '@the-dmz/shared/constants';

const defaultEffectStates: Record<string, Record<string, boolean>> = {
  green: {
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
  },
  amber: {
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
  },
  'high-contrast': {
    scanlines: false,
    curvature: false,
    glow: false,
    noise: false,
    vignette: false,
  },
  enterprise: {
    scanlines: false,
    curvature: false,
    glow: false,
    noise: false,
    vignette: false,
  },
};

const defaultRoutePreferences: Record<string, { themePreferences?: { theme?: ThemeId } }> = {
  game: {
    themePreferences: {
      theme: 'green',
    },
  },
  admin: {
    themePreferences: {
      theme: 'enterprise',
    },
  },
  auth: {
    themePreferences: {
      theme: 'enterprise',
    },
  },
  public: {
    themePreferences: {
      theme: 'enterprise',
    },
  },
};

export interface PreferenceResolutionOptions {
  userPreferences?: {
    themePreferences?: {
      theme?: ThemeId;
      enableTerminalEffects?: boolean;
      effects?: Record<string, boolean>;
      fontSize?: number;
    };
    accessibilityPreferences?: {
      reducedMotion?: boolean;
      highContrast?: boolean;
      fontSize?: number;
    };
  };
  policyLockedPreferences?: {
    theme?: boolean;
    enableTerminalEffects?: boolean;
    effects?: Record<string, boolean>;
    fontSize?: boolean;
    reducedMotion?: boolean;
    highContrast?: boolean;
  };
  surface?: SurfaceId;
  osPreferences?: {
    prefersReducedMotion: boolean;
    prefersContrast: boolean;
  };
}

interface EffectivePreferenceValue<T = unknown> {
  value: T;
  source: 'policy' | 'server' | 'local' | 'os' | 'default';
}

function resolveThemePreference(
  userTheme: { theme?: ThemeId } | undefined,
  locked: boolean,
  osPrefs: { prefersReducedMotion: boolean; prefersContrast: boolean },
  surface?: SurfaceId,
): EffectivePreferenceValue<ThemeId> {
  if (locked && userTheme?.theme) {
    return { value: userTheme.theme, source: 'policy' };
  }

  if (userTheme?.theme) {
    return { value: userTheme.theme, source: 'server' };
  }

  if (osPrefs.prefersContrast) {
    return { value: 'high-contrast', source: 'os' };
  }

  if (surface && defaultRoutePreferences[surface]?.themePreferences?.theme) {
    return {
      value: defaultRoutePreferences[surface].themePreferences.theme,
      source: 'default',
    };
  }

  return { value: 'green', source: 'default' };
}

function resolveEffectsPreference(
  userEffects: Record<string, boolean> | undefined,
  locked: boolean,
  theme: ThemeId,
): EffectivePreferenceValue<Record<string, boolean>> {
  const defaultEffects = (defaultEffectStates[theme] ?? defaultEffectStates['green']) as Record<
    string,
    boolean
  >;

  if (locked && userEffects) {
    return { value: { ...defaultEffects, ...userEffects }, source: 'policy' };
  }

  if (userEffects) {
    return { value: { ...defaultEffects, ...userEffects }, source: 'server' };
  }

  return { value: defaultEffects, source: 'default' };
}

function resolveEnableTerminalEffectsPreference(
  userValue: boolean | undefined,
  locked: boolean,
  theme: ThemeId,
): EffectivePreferenceValue<boolean> {
  if (locked && userValue !== undefined) {
    return { value: userValue, source: 'policy' };
  }

  if (userValue !== undefined) {
    return { value: userValue, source: 'server' };
  }

  return {
    value: THEME_METADATA[theme]?.effectsEnabled ?? true,
    source: 'default',
  };
}

function resolveFontSizePreference(
  userValue: number | undefined,
  locked: boolean,
  osPrefs: { prefersReducedMotion: boolean; prefersContrast: boolean },
): EffectivePreferenceValue<number> {
  if (locked && userValue !== undefined) {
    return { value: userValue, source: 'policy' };
  }

  if (userValue !== undefined) {
    return { value: userValue, source: 'server' };
  }

  if (osPrefs.prefersReducedMotion || osPrefs.prefersContrast) {
    return { value: 18, source: 'os' };
  }

  return { value: 16, source: 'default' };
}

function resolveAccessibilityPreference(
  userValue: boolean | undefined,
  locked: boolean,
  osPrefs: { prefersReducedMotion: boolean; prefersContrast: boolean },
  preferenceName: 'reducedMotion' | 'highContrast',
): EffectivePreferenceValue<boolean> {
  if (locked && userValue !== undefined) {
    return { value: userValue, source: 'policy' };
  }

  if (userValue !== undefined) {
    return { value: userValue, source: 'server' };
  }

  if (preferenceName === 'reducedMotion' && osPrefs.prefersReducedMotion) {
    return { value: true, source: 'os' };
  }

  if (preferenceName === 'highContrast' && osPrefs.prefersContrast) {
    return { value: true, source: 'os' };
  }

  return { value: false, source: 'default' };
}

export interface EffectiveThemePreferences {
  theme: EffectivePreferenceValue<ThemeId>;
  enableTerminalEffects: EffectivePreferenceValue<boolean>;
  effects: EffectivePreferenceValue<Record<string, boolean>>;
  fontSize: EffectivePreferenceValue<number>;
}

export interface EffectiveAccessibilityPreferences {
  reducedMotion: EffectivePreferenceValue<boolean>;
  highContrast: EffectivePreferenceValue<boolean>;
  fontSize: EffectivePreferenceValue<number>;
}

export interface EffectivePreferences {
  themePreferences?: EffectiveThemePreferences;
  accessibilityPreferences?: EffectiveAccessibilityPreferences;
}

export function resolveEffectivePreferences(
  options: PreferenceResolutionOptions,
): EffectivePreferences {
  const {
    userPreferences,
    policyLockedPreferences = {},
    surface,
    osPreferences = { prefersReducedMotion: false, prefersContrast: false },
  } = options;

  const themePrefs = userPreferences?.themePreferences;
  const accessibilityPrefs = userPreferences?.accessibilityPreferences;

  const lockedTheme = policyLockedPreferences.theme ?? false;
  const lockedEffects = policyLockedPreferences.effects
    ? Object.keys(policyLockedPreferences.effects).length > 0
    : false;
  const lockedFontSize = policyLockedPreferences.fontSize ?? false;
  const lockedReducedMotion = policyLockedPreferences.reducedMotion ?? false;
  const lockedHighContrast = policyLockedPreferences.highContrast ?? false;

  const effectiveTheme = resolveThemePreference(themePrefs, lockedTheme, osPreferences, surface);
  const themeId = effectiveTheme.value;

  const effectiveEffects = resolveEffectsPreference(themePrefs?.effects, lockedEffects, themeId);
  const effectiveEnableTerminalEffects = resolveEnableTerminalEffectsPreference(
    themePrefs?.enableTerminalEffects,
    lockedTheme || lockedEffects,
    themeId,
  );
  const effectiveFontSize = resolveFontSizePreference(
    themePrefs?.fontSize,
    lockedFontSize,
    osPreferences,
  );
  const effectiveReducedMotion = resolveAccessibilityPreference(
    accessibilityPrefs?.reducedMotion,
    lockedReducedMotion,
    osPreferences,
    'reducedMotion',
  );
  const effectiveHighContrast = resolveAccessibilityPreference(
    accessibilityPrefs?.highContrast,
    lockedHighContrast,
    osPreferences,
    'highContrast',
  );

  const themePreferences: EffectiveThemePreferences = {
    theme: effectiveTheme,
    enableTerminalEffects: effectiveEnableTerminalEffects,
    effects: effectiveEffects,
    fontSize: effectiveFontSize,
  };

  const accessibilityPreferences: EffectiveAccessibilityPreferences = {
    reducedMotion: effectiveReducedMotion,
    highContrast: effectiveHighContrast,
    fontSize: effectiveFontSize,
  };

  return {
    themePreferences,
    accessibilityPreferences,
  };
}

export function getLockedPreferenceKeys(
  policyLocked:
    | {
        theme?: boolean;
        enableTerminalEffects?: boolean;
        effects?: Record<string, boolean>;
        fontSize?: boolean;
        reducedMotion?: boolean;
        highContrast?: boolean;
      }
    | undefined,
): string[] {
  if (!policyLocked) return [];

  const keys: string[] = [];

  if (policyLocked.theme) keys.push('theme');
  if (policyLocked.enableTerminalEffects) keys.push('enableTerminalEffects');
  if (policyLocked.effects) keys.push('effects');
  if (policyLocked.fontSize) keys.push('fontSize');
  if (policyLocked.reducedMotion) keys.push('reducedMotion');
  if (policyLocked.highContrast) keys.push('highContrast');

  return keys;
}
