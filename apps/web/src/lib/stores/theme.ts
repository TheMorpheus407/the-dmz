import { writable, get } from 'svelte/store';

import type { ThemeId, SurfaceId } from '@the-dmz/shared';
import { defaultEffectStates } from '@the-dmz/shared/schemas';
import type { EffectivePreferences } from '@the-dmz/shared/schemas';

import { browser } from '$app/environment';

export type ThemeName = ThemeId;

export interface EffectState {
  scanlines: boolean;
  curvature: boolean;
  glow: boolean;
  noise: boolean;
  vignette: boolean;
}

export interface ThemeState {
  name: ThemeName;
  enableTerminalEffects: boolean;
  effects: EffectState;
  fontSize: number;
}

export interface PreferenceSourceState {
  theme: 'policy' | 'server' | 'local' | 'os' | 'default';
  enableTerminalEffects: 'policy' | 'server' | 'local' | 'os' | 'default';
  effects: 'policy' | 'server' | 'local' | 'os' | 'default';
  fontSize: 'policy' | 'server' | 'local' | 'os' | 'default';
}

export interface ThemeStoreState extends ThemeState {
  source: PreferenceSourceState;
  lockedPreferences: string[];
  isSyncing: boolean;
  pendingSync: boolean;
}

const DEFAULT_EFFECTS: EffectState = {
  scanlines: true,
  curvature: true,
  glow: true,
  noise: false,
  vignette: true,
};

const HIGH_CONTRAST_EFFECTS: EffectState = {
  scanlines: false,
  curvature: false,
  glow: false,
  noise: false,
  vignette: false,
};

const ENTERPRISE_EFFECTS: EffectState = {
  scanlines: false,
  curvature: false,
  glow: false,
  noise: false,
  vignette: false,
};

const DEFAULT_FONT_SIZE = 16;

export const initialThemeState: ThemeStoreState = {
  name: 'green',
  enableTerminalEffects: true,
  effects: { ...DEFAULT_EFFECTS },
  fontSize: DEFAULT_FONT_SIZE,
  source: {
    theme: 'default',
    enableTerminalEffects: 'default',
    effects: 'default',
    fontSize: 'default',
  },
  lockedPreferences: [],
  isSyncing: false,
  pendingSync: false,
};

export const STORAGE_KEY = 'dmz-theme-preference';

export type SyncCallback = (preferences: {
  theme?: ThemeId;
  enableTerminalEffects?: boolean;
  effects?: EffectState;
  fontSize?: number;
}) => Promise<void>;

let syncCallback: SyncCallback | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY_MS = 500;

function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeStoreState>(initialThemeState);

  function getSystemPreferences(): {
    prefersReducedMotion: boolean;
    prefersContrast: boolean;
  } {
    if (!browser) {
      return { prefersReducedMotion: false, prefersContrast: false };
    }

    return {
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersContrast: window.matchMedia('(prefers-contrast: more)').matches,
    };
  }

  function applyThemeToDom(state: ThemeStoreState): void {
    if (!browser) return;

    const root = document.documentElement;
    root.dataset['theme'] = state.name;

    root.dataset['scanlines'] = state.effects.scanlines ? 'on' : 'off';
    root.dataset['curvature'] = state.effects.curvature ? 'on' : 'off';
    root.dataset['glow'] = state.effects.glow ? 'on' : 'off';
    root.dataset['noise'] = state.effects.noise ? 'on' : 'off';
    root.dataset['vignette'] = state.effects.vignette ? 'on' : 'off';

    root.dataset['highContrast'] = state.name === 'high-contrast' ? 'on' : 'off';

    root.style.setProperty('--base-font-size', `${state.fontSize}px`);
  }

  function determineDefaultTheme(): ThemeName {
    if (!browser) return 'green';

    const systemPrefs = getSystemPreferences();
    if (systemPrefs.prefersContrast) {
      return 'high-contrast';
    }

    return 'green';
  }

  function loadPersistedTheme(): ThemeStoreState {
    if (!browser) return initialThemeState;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ThemeState>;
        return {
          ...initialThemeState,
          ...parsed,
          effects: { ...DEFAULT_EFFECTS, ...parsed.effects },
          source: {
            theme: 'local',
            enableTerminalEffects: 'local',
            effects: 'local',
            fontSize: 'local',
          },
          lockedPreferences: [],
          isSyncing: false,
          pendingSync: false,
        };
      }
    } catch {
      // Invalid stored data, use defaults
    }

    const defaultTheme = determineDefaultTheme();
    const effects = defaultTheme === 'high-contrast' ? HIGH_CONTRAST_EFFECTS : DEFAULT_EFFECTS;

    const systemPrefs = getSystemPreferences();
    const source: PreferenceSourceState =
      systemPrefs.prefersContrast || systemPrefs.prefersReducedMotion
        ? {
            theme: systemPrefs.prefersContrast ? 'os' : 'default',
            enableTerminalEffects: 'default',
            effects: 'default',
            fontSize: systemPrefs.prefersReducedMotion ? 'os' : 'default',
          }
        : {
            theme: 'default',
            enableTerminalEffects: 'default',
            effects: 'default',
            fontSize: 'default',
          };

    return {
      name: defaultTheme,
      enableTerminalEffects: defaultTheme !== 'high-contrast',
      effects,
      fontSize: DEFAULT_FONT_SIZE,
      source,
      lockedPreferences: [],
      isSyncing: false,
      pendingSync: false,
    };
  }

  function persistTheme(state: ThemeStoreState): void {
    if (!browser) return;

    try {
      const toStore: Partial<ThemeState> = {
        name: state.name,
        enableTerminalEffects: state.enableTerminalEffects,
        effects: state.effects,
        fontSize: state.fontSize,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Storage unavailable
    }
  }

  function debouncedSync(): void {
    if (!syncCallback) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    update((s) => ({ ...s, pendingSync: true }));

    debounceTimer = setTimeout(() => {
      void (async () => {
        const currentState = get({ subscribe });

        if (currentState.lockedPreferences.length > 0) {
          update((s) => ({ ...s, pendingSync: false }));
          return;
        }

        update((s) => ({ ...s, isSyncing: true }));

        try {
          await syncCallback!({
            theme: currentState.name,
            enableTerminalEffects: currentState.enableTerminalEffects,
            effects: currentState.effects,
            fontSize: currentState.fontSize,
          });
          update((s) => ({ ...s, isSyncing: false, pendingSync: false }));
        } catch {
          update((s) => ({ ...s, isSyncing: false, pendingSync: true }));
        }
      })();
    }, DEBOUNCE_DELAY_MS);
  }

  function applyEffectivePreferences(
    effectivePrefs: unknown,
    lockedKeys: string[],
    surface?: SurfaceId,
  ): void {
    const prefs = effectivePrefs as EffectivePreferences | undefined;
    const osPrefs = getSystemPreferences();
    const localState = loadPersistedTheme();

    let themeSource: PreferenceSourceState['theme'] = 'default';
    let effectsSource: PreferenceSourceState['effects'] = 'default';
    let enableTerminalEffectsSource: PreferenceSourceState['enableTerminalEffects'] = 'default';
    let fontSizeSource: PreferenceSourceState['fontSize'] = 'default';

    const themePref = prefs?.themePreferences?.theme;
    const effectsPref = prefs?.themePreferences?.effects;
    const enableTerminalEffectsPref = prefs?.themePreferences?.enableTerminalEffects;
    const fontSizePref = prefs?.themePreferences?.fontSize;
    const accessibilityFontSizePref = prefs?.accessibilityPreferences?.fontSize;

    let name: ThemeName = localState.name;
    let effects: EffectState = localState.effects;
    let enableTerminalEffects: boolean = localState.enableTerminalEffects;
    let fontSize: number = localState.fontSize;

    if (themePref && themePref.value) {
      name = themePref.value as ThemeName;
      themeSource = themePref.source as ThemeSource;
    } else if (osPrefs.prefersContrast) {
      name = 'high-contrast';
      themeSource = 'os';
    } else if (surface) {
      name = getRouteDefaultTheme(surface);
      themeSource = 'default';
    }

    if (effectsPref && effectsPref.value) {
      effects = effectsPref.value as EffectState;
      effectsSource = effectsPref.source as ThemeSource;
    } else {
      effects = defaultEffectStates[name] ?? DEFAULT_EFFECTS;
    }

    if (enableTerminalEffectsPref && enableTerminalEffectsPref.value !== undefined) {
      enableTerminalEffects = enableTerminalEffectsPref.value as boolean;
      enableTerminalEffectsSource = enableTerminalEffectsPref.source as ThemeSource;
    } else {
      enableTerminalEffects = name !== 'high-contrast' && name !== 'enterprise';
    }

    const resolvedFontSizePref = fontSizePref ?? accessibilityFontSizePref;
    if (resolvedFontSizePref && resolvedFontSizePref.value !== undefined) {
      fontSize = resolvedFontSizePref.value as number;
      fontSizeSource = resolvedFontSizePref.source as ThemeSource;
    } else if (osPrefs.prefersReducedMotion || osPrefs.prefersContrast) {
      fontSize = 18;
      fontSizeSource = 'os';
    }

    const source: PreferenceSourceState = {
      theme: themeSource,
      effects: effectsSource,
      enableTerminalEffects: enableTerminalEffectsSource,
      fontSize: fontSizeSource,
    };

    const newState: ThemeStoreState = {
      name,
      enableTerminalEffects,
      effects,
      fontSize,
      source,
      lockedPreferences: lockedKeys,
      isSyncing: false,
      pendingSync: false,
    };

    set(newState);
    applyThemeToDom(newState);
    persistTheme(newState);
  }

  return {
    subscribe,

    setSyncCallback(callback: SyncCallback): void {
      syncCallback = callback;
    },

    applyEffectivePreferences(
      effectivePrefs: unknown,
      lockedKeys: string[] = [],
      surface?: SurfaceId,
    ): void {
      applyEffectivePreferences(effectivePrefs, lockedKeys, surface);
    },

    setTheme: (name: ThemeName) => {
      update((state) => {
        if (state.lockedPreferences.includes('theme')) {
          return state;
        }

        let effects: EffectState;

        switch (name) {
          case 'high-contrast':
            effects = HIGH_CONTRAST_EFFECTS;
            break;
          case 'enterprise':
            effects = ENTERPRISE_EFFECTS;
            break;
          default:
            effects = { ...DEFAULT_EFFECTS };
        }

        const newState: ThemeStoreState = {
          ...state,
          name,
          enableTerminalEffects: name !== 'high-contrast' && name !== 'enterprise',
          effects,
          source: {
            ...state.source,
            theme: 'local',
            effects: 'local',
            enableTerminalEffects: 'local',
          },
        };

        applyThemeToDom(newState);
        persistTheme(newState);
        debouncedSync();
        return newState;
      });
    },

    setEffects: (effects: Partial<EffectState>) => {
      update((state) => {
        if (state.lockedPreferences.includes('effects')) {
          return state;
        }

        const newState: ThemeStoreState = {
          ...state,
          effects: { ...state.effects, ...effects },
          source: {
            ...state.source,
            effects: 'local',
          },
        };

        applyThemeToDom(newState);
        persistTheme(newState);
        debouncedSync();
        return newState;
      });
    },

    setFontSize: (size: number) => {
      update((state) => {
        if (state.lockedPreferences.includes('fontSize')) {
          return state;
        }

        const clampedSize = Math.max(12, Math.min(32, size));
        const newState: ThemeStoreState = {
          ...state,
          fontSize: clampedSize,
          source: {
            ...state.source,
            fontSize: 'local',
          },
        };

        applyThemeToDom(newState);
        persistTheme(newState);
        debouncedSync();
        return newState;
      });
    },

    setEnableTerminalEffects: (enabled: boolean) => {
      update((state) => {
        if (state.lockedPreferences.includes('enableTerminalEffects')) {
          return state;
        }

        const newState: ThemeStoreState = {
          ...state,
          enableTerminalEffects: enabled,
          source: {
            ...state.source,
            enableTerminalEffects: 'local',
          },
        };

        applyThemeToDom(newState);
        persistTheme(newState);
        debouncedSync();
        return newState;
      });
    },

    init: () => {
      const loadedState = loadPersistedTheme();
      set(loadedState);
      applyThemeToDom(loadedState);
    },

    getSystemPreferences,

    clearPendingSync(): void {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      update((s) => ({ ...s, pendingSync: false }));
    },
  };
}

type ThemeSource = 'policy' | 'server' | 'local' | 'os' | 'default';

export const themeStore = createThemeStore();

export function getRouteDefaultTheme(surface: SurfaceId): ThemeId {
  switch (surface) {
    case 'game':
      return 'green';
    case 'admin':
      return 'enterprise';
    case 'auth':
    case 'public':
      return 'enterprise';
    default:
      return 'green';
  }
}

export function resolveEffectiveTheme(
  effectivePrefs: unknown,
  _lockedKeys: string[],
): {
  name: ThemeName;
  enableTerminalEffects: boolean;
  effects: EffectState;
  fontSize: number;
  source: PreferenceSourceState;
} {
  const prefs = effectivePrefs as EffectivePreferences | undefined;

  if (!prefs) {
    const osPrefs = themeStore.getSystemPreferences();
    const name = osPrefs.prefersContrast ? 'high-contrast' : 'green';
    return {
      name,
      enableTerminalEffects: name !== 'high-contrast',
      effects: defaultEffectStates[name] ?? DEFAULT_EFFECTS,
      fontSize: osPrefs.prefersReducedMotion ? 18 : 16,
      source: {
        theme: osPrefs.prefersContrast ? 'os' : 'default',
        enableTerminalEffects: 'default',
        effects: 'default',
        fontSize: osPrefs.prefersReducedMotion ? 'os' : 'default',
      },
    };
  }

  const themePref = prefs.themePreferences?.theme;
  const effectsPref = prefs.themePreferences?.effects;
  const enableTerminalEffectsPref = prefs.themePreferences?.enableTerminalEffects;
  const fontSizePref = prefs.themePreferences?.fontSize ?? prefs.accessibilityPreferences?.fontSize;

  const osPrefs = themeStore.getSystemPreferences();

  const name: ThemeName =
    (themePref?.value as ThemeName) ?? (osPrefs.prefersContrast ? 'high-contrast' : 'green');
  const effects: EffectState =
    (effectsPref?.value as EffectState) ?? defaultEffectStates[name] ?? DEFAULT_EFFECTS;
  const enableTerminalEffects: boolean =
    enableTerminalEffectsPref?.value !== undefined
      ? (enableTerminalEffectsPref.value as boolean)
      : name !== 'high-contrast' && name !== 'enterprise';
  const fontSize: number =
    (fontSizePref?.value as number) ?? (osPrefs.prefersReducedMotion ? 18 : 16);

  const themeSource = themePref?.source ?? (osPrefs.prefersContrast ? 'os' : 'default');
  const effectsSource = effectsPref?.source ?? 'default';
  const enableTerminalEffectsSource = enableTerminalEffectsPref?.source ?? 'default';
  const fontSizeSource = fontSizePref?.source ?? (osPrefs.prefersReducedMotion ? 'os' : 'default');

  return {
    name,
    enableTerminalEffects,
    effects,
    fontSize,
    source: {
      theme: themeSource as ThemeSource,
      effects: effectsSource as ThemeSource,
      enableTerminalEffects: enableTerminalEffectsSource as ThemeSource,
      fontSize: fontSizeSource as ThemeSource,
    },
  };
}
