import { writable } from 'svelte/store';

import type { ThemeId, SurfaceId } from '@the-dmz/shared';

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

export const initialThemeState: ThemeState = {
  name: 'green',
  enableTerminalEffects: true,
  effects: { ...DEFAULT_EFFECTS },
  fontSize: DEFAULT_FONT_SIZE,
};

export const STORAGE_KEY = 'dmz-theme-preference';

function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeState>(initialThemeState);

  function getSystemPreferences(): { prefersReducedMotion: boolean; prefersContrast: boolean } {
    if (!browser) {
      return { prefersReducedMotion: false, prefersContrast: false };
    }

    return {
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersContrast: window.matchMedia('(prefers-contrast: more)').matches,
    };
  }

  function applyThemeToDom(state: ThemeState): void {
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

  function loadPersistedTheme(): ThemeState {
    if (!browser) return initialThemeState;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ThemeState;
        return {
          ...initialThemeState,
          ...parsed,
          effects: { ...DEFAULT_EFFECTS, ...parsed.effects },
        };
      }
    } catch {
      // Invalid stored data, use defaults
    }

    const defaultTheme = determineDefaultTheme();
    const effects = defaultTheme === 'high-contrast' ? HIGH_CONTRAST_EFFECTS : DEFAULT_EFFECTS;

    return {
      name: defaultTheme,
      enableTerminalEffects: defaultTheme !== 'high-contrast',
      effects,
      fontSize: DEFAULT_FONT_SIZE,
    };
  }

  function persistTheme(state: ThemeState): void {
    if (!browser) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable
    }
  }

  return {
    subscribe,
    setTheme: (name: ThemeName) => {
      update((state) => {
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

        const newState: ThemeState = {
          ...state,
          name,
          enableTerminalEffects: name !== 'high-contrast' && name !== 'enterprise',
          effects,
        };

        applyThemeToDom(newState);
        persistTheme(newState);
        return newState;
      });
    },

    setEffects: (effects: Partial<EffectState>) => {
      update((state) => {
        const newState: ThemeState = {
          ...state,
          effects: { ...state.effects, ...effects },
        };

        applyThemeToDom(newState);
        persistTheme(newState);
        return newState;
      });
    },

    setFontSize: (size: number) => {
      update((state) => {
        const clampedSize = Math.max(12, Math.min(32, size));
        const newState: ThemeState = {
          ...state,
          fontSize: clampedSize,
        };

        applyThemeToDom(newState);
        persistTheme(newState);
        return newState;
      });
    },

    init: () => {
      const loadedState = loadPersistedTheme();
      set(loadedState);
      applyThemeToDom(loadedState);
    },

    getSystemPreferences,
  };
}

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
