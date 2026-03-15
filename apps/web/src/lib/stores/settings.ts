import { writable, derived } from 'svelte/store';

import { browser } from '$app/environment';

export type ThemeId = 'green' | 'amber' | 'high-contrast' | 'enterprise';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type FocusIndicatorStyle = 'subtle' | 'strong';
export type DifficultyLevel = 'tutorial' | 'easy' | 'normal' | 'hard';
export type PrivacyMode = 'public' | 'friends' | 'private';

export interface DisplaySettings {
  theme: ThemeId;
  enableTerminalEffects: boolean;
  effects: {
    scanlines: boolean;
    curvature: boolean;
    glow: boolean;
    noise: boolean;
    vignette: boolean;
    flicker: boolean;
  };
  effectIntensity: {
    scanlines: number;
    curvature: number;
    glow: number;
    noise: number;
    vignette: number;
    flicker: number;
  };
  fontSize: number;
  terminalGlowIntensity: number;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: number;
  colorBlindMode: ColorBlindMode;
  screenReaderAnnouncements: boolean;
  keyboardNavigationHints: boolean;
  focusIndicatorStyle: FocusIndicatorStyle;
}

export interface GameplaySettings {
  difficulty: DifficultyLevel;
  notificationVolume: number;
  notificationCategoryVolumes: {
    master: number;
    alerts: number;
    ui: number;
    ambient: number;
  };
  notificationDuration: number;
  autoAdvanceTiming: number;
  queueBuildupRate: number;
}

export interface AudioSettings {
  masterVolume: number;
  categoryVolumes: {
    alerts: number;
    ui: number;
    ambient: number;
    narrative: number;
    effects: number;
  };
  muteAll: boolean;
  textToSpeechEnabled: boolean;
  textToSpeechSpeed: number;
}

export interface AccountSettings {
  displayName: string;
  privacyMode: PrivacyMode;
}

export interface SettingsState {
  display: DisplaySettings;
  accessibility: AccessibilitySettings;
  gameplay: GameplaySettings;
  audio: AudioSettings;
  account: AccountSettings;
}

export const defaultDisplaySettings: DisplaySettings = {
  theme: 'green',
  enableTerminalEffects: true,
  effects: {
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
    flicker: true,
  },
  effectIntensity: {
    scanlines: 70,
    curvature: 50,
    glow: 60,
    noise: 30,
    vignette: 50,
    flicker: 40,
  },
  fontSize: 16,
  terminalGlowIntensity: 60,
};

export const defaultAccessibilitySettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  fontSize: 16,
  colorBlindMode: 'none',
  screenReaderAnnouncements: true,
  keyboardNavigationHints: true,
  focusIndicatorStyle: 'subtle',
};

export const defaultGameplaySettings: GameplaySettings = {
  difficulty: 'normal',
  notificationVolume: 80,
  notificationCategoryVolumes: {
    master: 80,
    alerts: 80,
    ui: 60,
    ambient: 50,
  },
  notificationDuration: 5,
  autoAdvanceTiming: 0,
  queueBuildupRate: 3,
};

export const defaultAudioSettings: AudioSettings = {
  masterVolume: 80,
  categoryVolumes: {
    alerts: 80,
    ui: 60,
    ambient: 50,
    narrative: 70,
    effects: 80,
  },
  muteAll: false,
  textToSpeechEnabled: false,
  textToSpeechSpeed: 100,
};

export const defaultAccountSettings: AccountSettings = {
  displayName: '',
  privacyMode: 'public',
};

export const initialSettingsState: SettingsState = {
  display: defaultDisplaySettings,
  accessibility: defaultAccessibilitySettings,
  gameplay: defaultGameplaySettings,
  audio: defaultAudioSettings,
  account: defaultAccountSettings,
};

const STORAGE_KEY = 'dmz-app-settings';

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else {
        (result as Record<string, unknown>)[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>(initialSettingsState);

  function loadPersistedSettings(): SettingsState {
    if (!browser) return initialSettingsState;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        return deepMerge({ ...initialSettingsState }, parsed);
      }
    } catch {
      // Invalid stored data
    }

    if (browser) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prefersContrast = window.matchMedia('(prefers-contrast: more)').matches;

      return {
        ...initialSettingsState,
        accessibility: {
          ...initialSettingsState.accessibility,
          reducedMotion: prefersReducedMotion,
          highContrast: prefersContrast,
        },
      };
    }

    return initialSettingsState;
  }

  function persistSettings(state: SettingsState): void {
    if (!browser) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable
    }
  }

  return {
    subscribe,

    init(): void {
      const loaded = loadPersistedSettings();
      set(loaded);
      persistSettings(loaded);
    },

    updateDisplay(settings: Partial<DisplaySettings>): void {
      update((state) => {
        const newState = {
          ...state,
          display: { ...state.display, ...settings },
        };
        persistSettings(newState);
        return newState;
      });
    },

    updateAccessibility(settings: Partial<AccessibilitySettings>): void {
      update((state) => {
        const newState = {
          ...state,
          accessibility: { ...state.accessibility, ...settings },
        };
        persistSettings(newState);
        return newState;
      });
    },

    updateGameplay(settings: Partial<GameplaySettings>): void {
      update((state) => {
        const newState = {
          ...state,
          gameplay: { ...state.gameplay, ...settings },
        };
        persistSettings(newState);
        return newState;
      });
    },

    updateAudio(settings: Partial<AudioSettings>): void {
      update((state) => {
        const newState = {
          ...state,
          audio: { ...state.audio, ...settings },
        };
        persistSettings(newState);
        return newState;
      });
    },

    updateAccount(settings: Partial<AccountSettings>): void {
      update((state) => {
        const newState = {
          ...state,
          account: { ...state.account, ...settings },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setTheme(theme: ThemeId): void {
      update((state) => {
        const newState = {
          ...state,
          display: { ...state.display, theme },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setReducedMotion(enabled: boolean): void {
      update((state) => {
        const newState = {
          ...state,
          accessibility: { ...state.accessibility, reducedMotion: enabled },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setHighContrast(enabled: boolean): void {
      update((state) => {
        const newState = {
          ...state,
          accessibility: { ...state.accessibility, highContrast: enabled },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setMasterVolume(volume: number): void {
      update((state) => {
        const newState = {
          ...state,
          audio: { ...state.audio, masterVolume: Math.max(0, Math.min(100, volume)) },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setMuteAll(muted: boolean): void {
      update((state) => {
        const newState = {
          ...state,
          audio: { ...state.audio, muteAll: muted },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setAudioCategoryVolume(category: keyof AudioSettings['categoryVolumes'], volume: number): void {
      update((state) => {
        const newState = {
          ...state,
          audio: {
            ...state.audio,
            categoryVolumes: {
              ...state.audio.categoryVolumes,
              [category]: Math.max(0, Math.min(100, volume)),
            },
          },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setNotificationCategoryVolume(
      category: keyof GameplaySettings['notificationCategoryVolumes'],
      volume: number,
    ): void {
      update((state) => {
        const newState = {
          ...state,
          gameplay: {
            ...state.gameplay,
            notificationCategoryVolumes: {
              ...state.gameplay.notificationCategoryVolumes,
              [category]: Math.max(0, Math.min(100, volume)),
            },
          },
        };
        persistSettings(newState);
        return newState;
      });
    },

    toggleEffect(effect: keyof DisplaySettings['effects']): void {
      update((state) => {
        const newEffects = {
          ...state.display.effects,
          [effect]: !state.display.effects[effect],
        };
        const newState = {
          ...state,
          display: { ...state.display, effects: newEffects },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setEffectIntensity(effect: keyof DisplaySettings['effectIntensity'], intensity: number): void {
      update((state) => {
        const newIntensity = {
          ...state.display.effectIntensity,
          [effect]: Math.max(0, Math.min(100, intensity)),
        };
        const newState = {
          ...state,
          display: { ...state.display, effectIntensity: newIntensity },
        };
        persistSettings(newState);
        return newState;
      });
    },

    setFontSize(size: number): void {
      update((state) => {
        const newState = {
          ...state,
          display: { ...state.display, fontSize: Math.max(12, Math.min(32, size)) },
          accessibility: { ...state.accessibility, fontSize: Math.max(12, Math.min(32, size)) },
        };
        persistSettings(newState);
        return newState;
      });
    },

    resetToDefaults(): void {
      set(initialSettingsState);
      persistSettings(initialSettingsState);
    },
  };
}

export const settingsStore = createSettingsStore();

export const effectiveTheme = derived(settingsStore, ($settings) => {
  if ($settings.accessibility.highContrast) {
    return 'high-contrast';
  }
  return $settings.display.theme;
});

export const effectiveEffects = derived(settingsStore, ($settings) => {
  const theme = $settings.display.theme;
  if (theme === 'high-contrast' || theme === 'enterprise') {
    return {
      scanlines: false,
      curvature: false,
      glow: false,
      noise: false,
      vignette: false,
      flicker: false,
    };
  }
  return $settings.display.effects;
});

export const effectiveFontSize = derived(settingsStore, ($settings) => {
  return $settings.accessibility.fontSize || $settings.display.fontSize;
});

export const effectiveReducedMotion = derived(settingsStore, ($settings) => {
  return $settings.accessibility.reducedMotion;
});
