import { writable, get } from 'svelte/store';

import type { ThemeId, SurfaceId, ColorBlindMode } from '@the-dmz/shared';
import { defaultEffectStates } from '@the-dmz/shared/schemas';
import type { EffectivePreferences } from '@the-dmz/shared/schemas';
import type { ThemeColors } from '@the-dmz/shared/types';

import { browser } from '$app/environment';

export type ThemeName = ThemeId;

export interface EffectState {
  scanlines: boolean;
  curvature: boolean;
  glow: boolean;
  noise: boolean;
  vignette: boolean;
  flicker: boolean;
}

export interface EffectIntensities {
  scanlines: number;
  curvature: number;
  glow: number;
  noise: number;
  vignette: number;
  flicker: number;
}

export type CrtPreset = 'off' | 'light' | 'authentic' | 'heavy';

export const CRT_PRESETS: Record<
  CrtPreset,
  { effects: Partial<EffectState>; intensities: Partial<EffectIntensities> }
> = {
  off: {
    effects: {
      scanlines: false,
      curvature: false,
      glow: false,
      noise: false,
      vignette: false,
      flicker: false,
    },
    intensities: {
      scanlines: 0,
      curvature: 0,
      glow: 0,
      noise: 0,
      vignette: 0,
      flicker: 0,
    },
  },
  light: {
    effects: {
      scanlines: true,
      curvature: false,
      glow: true,
      noise: false,
      vignette: true,
      flicker: false,
    },
    intensities: {
      scanlines: 30,
      curvature: 0,
      glow: 50,
      noise: 0,
      vignette: 20,
      flicker: 30,
    },
  },
  authentic: {
    effects: {
      scanlines: true,
      curvature: true,
      glow: true,
      noise: false,
      vignette: true,
      flicker: true,
    },
    intensities: {
      scanlines: 50,
      curvature: 100,
      glow: 100,
      noise: 30,
      vignette: 60,
      flicker: 50,
    },
  },
  heavy: {
    effects: {
      scanlines: true,
      curvature: true,
      glow: true,
      noise: true,
      vignette: true,
      flicker: true,
    },
    intensities: {
      scanlines: 100,
      curvature: 100,
      glow: 150,
      noise: 80,
      vignette: 100,
      flicker: 100,
    },
  },
};

export const DEFAULT_INTENSITIES: EffectIntensities = {
  scanlines: 50,
  curvature: 100,
  glow: 100,
  noise: 30,
  vignette: 60,
  flicker: 50,
};

export interface CrtSettingsExport {
  effects: EffectState;
  intensities: EffectIntensities;
  preset?: CrtPreset;
}

export interface ThemeState {
  name: ThemeName;
  enableTerminalEffects: boolean;
  effects: EffectState;
  intensities: EffectIntensities;
  fontSize: number;
  colorBlindMode: ColorBlindMode;
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
  flicker: true,
};

const HIGH_CONTRAST_EFFECTS: EffectState = {
  scanlines: false,
  curvature: false,
  glow: false,
  noise: false,
  vignette: false,
  flicker: false,
};

const ENTERPRISE_EFFECTS: EffectState = {
  scanlines: false,
  curvature: false,
  glow: false,
  noise: false,
  vignette: false,
  flicker: false,
};

const ADMIN_LIGHT_EFFECTS: EffectState = {
  scanlines: false,
  curvature: false,
  glow: false,
  noise: false,
  vignette: false,
  flicker: false,
};

const ADMIN_DARK_EFFECTS: EffectState = {
  scanlines: false,
  curvature: false,
  glow: false,
  noise: false,
  vignette: false,
  flicker: false,
};

const DEFAULT_FONT_SIZE = 16;

export const initialThemeState: ThemeStoreState = {
  name: 'green',
  enableTerminalEffects: true,
  effects: { ...DEFAULT_EFFECTS },
  intensities: { ...DEFAULT_INTENSITIES },
  fontSize: DEFAULT_FONT_SIZE,
  colorBlindMode: 'none',
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

const DEBOUNCE_DELAY_MS = 500;

function createThemeStore() {
  let syncCallback: SyncCallback | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let keyboardEventHandler: ((event: KeyboardEvent) => void) | null = null;

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
    root.dataset['flicker'] = state.effects.flicker ? 'on' : 'off';

    root.dataset['highContrast'] = state.name === 'high-contrast' ? 'on' : 'off';

    root.dataset['colorBlind'] = state.colorBlindMode;

    root.style.setProperty('--base-font-size', `${state.fontSize}px`);

    root.style.setProperty(
      '--scanline-opacity',
      String((state.intensities.scanlines / 100) * 0.15),
    );
    root.style.setProperty('--glow-intensity', String((state.intensities.glow / 100) * 2));
    root.style.setProperty('--noise-opacity', String((state.intensities.noise / 100) * 0.1));
    root.style.setProperty('--vignette-opacity', String((state.intensities.vignette / 100) * 0.5));
  }

  function applyCustomThemeColors(colors: ThemeColors): void {
    if (!browser) return;

    const root = document.documentElement;

    root.style.setProperty('--custom-bg-primary', colors.background.primary);
    root.style.setProperty('--custom-bg-secondary', colors.background.secondary);
    root.style.setProperty('--custom-text-primary', colors.text.primary);
    root.style.setProperty('--custom-text-secondary', colors.text.secondary);
    root.style.setProperty('--custom-text-accent', colors.text.accent);
    root.style.setProperty('--custom-border', colors.border);
    root.style.setProperty('--custom-highlight', colors.highlight);
    root.style.setProperty('--custom-semantic-error', colors.semantic.error);
    root.style.setProperty('--custom-semantic-warning', colors.semantic.warning);
    root.style.setProperty('--custom-semantic-success', colors.semantic.success);
    root.style.setProperty('--custom-semantic-info', colors.semantic.info);
  }

  function clearCustomThemeColors(): void {
    if (!browser) return;

    const root = document.documentElement;
    const customProps = [
      '--custom-bg-primary',
      '--custom-bg-secondary',
      '--custom-text-primary',
      '--custom-text-secondary',
      '--custom-text-accent',
      '--custom-border',
      '--custom-highlight',
      '--custom-semantic-error',
      '--custom-semantic-warning',
      '--custom-semantic-success',
      '--custom-semantic-info',
    ];

    customProps.forEach((prop) => {
      root.style.removeProperty(prop);
    });
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
          intensities: { ...DEFAULT_INTENSITIES, ...parsed.intensities },
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
      intensities: { ...DEFAULT_INTENSITIES },
      fontSize: DEFAULT_FONT_SIZE,
      colorBlindMode: 'none',
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
        intensities: state.intensities,
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
      intensities: { ...DEFAULT_INTENSITIES },
      fontSize,
      colorBlindMode: 'none',
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
          case 'admin-light':
            effects = ADMIN_LIGHT_EFFECTS;
            break;
          case 'admin-dark':
            effects = ADMIN_DARK_EFFECTS;
            break;
          default:
            effects = { ...DEFAULT_EFFECTS };
        }

        const newState: ThemeStoreState = {
          ...state,
          name,
          enableTerminalEffects:
            name !== 'high-contrast' &&
            name !== 'enterprise' &&
            name !== 'admin-light' &&
            name !== 'admin-dark',
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

    setColorBlindMode: (mode: ColorBlindMode) => {
      update((state) => {
        const newState: ThemeStoreState = {
          ...state,
          colorBlindMode: mode,
        };

        applyThemeToDom(newState);
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

    setIntensity: (effect: keyof EffectIntensities, value: number) => {
      update((state) => {
        if (state.lockedPreferences.includes('effects')) {
          return state;
        }

        const clampedValue = Math.max(0, Math.min(100, value));
        const newState: ThemeStoreState = {
          ...state,
          intensities: { ...state.intensities, [effect]: clampedValue },
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

    applyPreset: (preset: CrtPreset) => {
      update((state) => {
        if (state.lockedPreferences.includes('effects')) {
          return state;
        }

        const presetConfig = CRT_PRESETS[preset];
        const newState: ThemeStoreState = {
          ...state,
          effects: { ...state.effects, ...presetConfig.effects },
          intensities: { ...DEFAULT_INTENSITIES, ...presetConfig.intensities },
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

    resetToDefaults: () => {
      update((state) => {
        if (state.lockedPreferences.includes('effects')) {
          return state;
        }

        const newState: ThemeStoreState = {
          ...state,
          effects: { ...DEFAULT_EFFECTS },
          intensities: { ...DEFAULT_INTENSITIES },
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

    exportSettings: (): CrtSettingsExport => {
      const state = get({ subscribe });
      return {
        effects: state.effects,
        intensities: state.intensities,
      };
    },

    importSettings: (settings: CrtSettingsExport): boolean => {
      try {
        update((state) => {
          if (state.lockedPreferences.includes('effects')) {
            return state;
          }

          const validatedEffects: EffectState = {
            scanlines: settings.effects.scanlines ?? state.effects.scanlines,
            curvature: settings.effects.curvature ?? state.effects.curvature,
            glow: settings.effects.glow ?? state.effects.glow,
            noise: settings.effects.noise ?? state.effects.noise,
            vignette: settings.effects.vignette ?? state.effects.vignette,
            flicker: settings.effects.flicker ?? state.effects.flicker,
          };

          const validatedIntensities: EffectIntensities = {
            scanlines: settings.intensities.scanlines ?? state.intensities.scanlines,
            curvature: settings.intensities.curvature ?? state.intensities.curvature,
            glow: settings.intensities.glow ?? state.intensities.glow,
            noise: settings.intensities.noise ?? state.intensities.noise,
            vignette: settings.intensities.vignette ?? state.intensities.vignette,
            flicker: settings.intensities.flicker ?? state.intensities.flicker,
          };

          const newState: ThemeStoreState = {
            ...state,
            effects: validatedEffects,
            intensities: validatedIntensities,
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
        return true;
      } catch {
        return false;
      }
    },

    disableAllEffects: () => {
      update((state) => {
        if (state.lockedPreferences.includes('effects')) {
          return state;
        }

        const newState: ThemeStoreState = {
          ...state,
          effects: {
            scanlines: false,
            curvature: false,
            glow: false,
            noise: false,
            vignette: false,
            flicker: false,
          },
          enableTerminalEffects: false,
          source: {
            ...state.source,
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

    applyCustomTheme(colors: ThemeColors): void {
      update((state) => {
        const newState: ThemeStoreState = {
          ...state,
          name: 'custom',
          source: {
            ...state.source,
            theme: 'local',
          },
        };

        applyThemeToDom(newState);
        applyCustomThemeColors(colors);
        persistTheme(newState);
        return newState;
      });
    },

    clearCustomTheme(): void {
      update((state) => {
        const currentTheme = state.name === 'custom' ? 'green' : state.name;
        const newState: ThemeStoreState = {
          ...state,
          name: currentTheme,
          source: {
            ...state.source,
            theme: 'local',
          },
        };

        applyThemeToDom(newState);
        clearCustomThemeColors();
        persistTheme(newState);
        return newState;
      });
    },

    toggleHighContrast: () => {
      const state = get({ subscribe });
      if (state.lockedPreferences.includes('theme')) {
        return;
      }
      const newTheme: ThemeName = state.name === 'high-contrast' ? 'green' : 'high-contrast';
      update((s) => {
        const effects = newTheme === 'high-contrast' ? HIGH_CONTRAST_EFFECTS : DEFAULT_EFFECTS;
        const newState: ThemeStoreState = {
          ...s,
          name: newTheme,
          enableTerminalEffects: newTheme !== 'high-contrast',
          effects,
          source: {
            ...s.source,
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

    registerKeyboardShortcut: () => {
      if (!browser || keyboardEventHandler) return;

      keyboardEventHandler = (event: KeyboardEvent) => {
        if (event.altKey && event.key.toLowerCase() === 'h') {
          event.preventDefault();
          const state = get({ subscribe });
          if (!state.lockedPreferences.includes('theme')) {
            const newTheme: ThemeName = state.name === 'high-contrast' ? 'green' : 'high-contrast';
            update((s) => {
              const effects =
                newTheme === 'high-contrast' ? HIGH_CONTRAST_EFFECTS : DEFAULT_EFFECTS;
              const newState: ThemeStoreState = {
                ...s,
                name: newTheme,
                enableTerminalEffects: newTheme !== 'high-contrast',
                effects,
                source: {
                  ...s.source,
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
          }
        }
      };

      document.addEventListener('keydown', keyboardEventHandler);
    },

    unregisterKeyboardShortcut: () => {
      if (!browser || !keyboardEventHandler) return;
      document.removeEventListener('keydown', keyboardEventHandler);
      keyboardEventHandler = null;
      syncCallback = null;
    },

    clearAll: () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (keyboardEventHandler) {
        document.removeEventListener('keydown', keyboardEventHandler);
        keyboardEventHandler = null;
      }
      syncCallback = null;
    },

    isHighContrastTheme: (): boolean => {
      const state = get({ subscribe });
      return state.name === 'high-contrast';
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
      return 'admin-light';
    case 'auth':
    case 'public':
      return 'admin-light';
    default:
      return 'green';
  }
}

export function resolveThemeName(
  themePref: EffectivePreferences['themePreferences']['theme'],
  osPrefs: ReturnType<typeof themeStore.getSystemPreferences>,
): { name: ThemeName; source: PreferenceSourceState['theme'] } {
  const name: ThemeName =
    (themePref?.value as ThemeName) ?? (osPrefs.prefersContrast ? 'high-contrast' : 'green');
  const source = (themePref?.source ?? (osPrefs.prefersContrast ? 'os' : 'default')) as ThemeSource;
  return { name, source };
}

export function resolveEffects(
  effectsPref: EffectivePreferences['themePreferences']['effects'],
  themeName: ThemeName,
): { effects: EffectState; source: PreferenceSourceState['effects'] } {
  const effects: EffectState =
    (effectsPref?.value as EffectState) ?? defaultEffectStates[themeName] ?? DEFAULT_EFFECTS;
  const source = (effectsPref?.source ?? 'default') as ThemeSource;
  return { effects, source };
}

export function resolveTerminalEffects(
  enableTerminalEffectsPref: EffectivePreferences['themePreferences']['enableTerminalEffects'],
  themeName: ThemeName,
): { enableTerminalEffects: boolean; source: PreferenceSourceState['enableTerminalEffects'] } {
  const enableTerminalEffects: boolean =
    enableTerminalEffectsPref?.value !== undefined
      ? (enableTerminalEffectsPref.value as boolean)
      : themeName !== 'high-contrast' && themeName !== 'enterprise';
  const source = (enableTerminalEffectsPref?.source ?? 'default') as ThemeSource;
  return { enableTerminalEffects, source };
}

export function resolveFontSize(
  fontSizePref: EffectivePreferences['themePreferences']['fontSize'] | undefined,
  osPrefs: ReturnType<typeof themeStore.getSystemPreferences>,
): { fontSize: number; source: PreferenceSourceState['fontSize'] } {
  const fontSize: number =
    (fontSizePref?.value as number) ?? (osPrefs.prefersReducedMotion ? 18 : 16);
  const source = (fontSizePref?.source ?? (osPrefs.prefersReducedMotion ? 'os' : 'default')) as ThemeSource;
  return { fontSize, source };
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
    const { name, source: themeSource } = resolveThemeName(undefined, osPrefs);
    return {
      name,
      enableTerminalEffects: name !== 'high-contrast',
      effects: defaultEffectStates[name] ?? DEFAULT_EFFECTS,
      fontSize: osPrefs.prefersReducedMotion ? 18 : 16,
      source: {
        theme: themeSource,
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

  const { name, source: themeSource } = resolveThemeName(themePref, osPrefs);
  const { effects, source: effectsSource } = resolveEffects(effectsPref, name);
  const { enableTerminalEffects, source: enableTerminalEffectsSource } = resolveTerminalEffects(
    enableTerminalEffectsPref,
    name,
  );
  const { fontSize, source: fontSizeSource } = resolveFontSize(fontSizePref, osPrefs);

  return {
    name,
    enableTerminalEffects,
    effects,
    fontSize,
    source: {
      theme: themeSource,
      effects: effectsSource,
      enableTerminalEffects: enableTerminalEffectsSource,
      fontSize: fontSizeSource,
    },
  };
}
