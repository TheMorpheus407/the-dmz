import { writable } from 'svelte/store';

import { browser } from '$app/environment';

export interface SettingsState {
  reducedMotion: boolean;
  soundEnabled: boolean;
}

export const initialSettingsState: SettingsState = {
  reducedMotion: false,
  soundEnabled: true,
};

const STORAGE_KEY = 'dmz-app-settings';

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>(initialSettingsState);

  function loadPersistedSettings(): SettingsState {
    if (!browser) return initialSettingsState;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        return {
          ...initialSettingsState,
          ...parsed,
        };
      }
    } catch {
      // Invalid stored data
    }

    if (browser) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return {
        ...initialSettingsState,
        reducedMotion: prefersReducedMotion,
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

    setReducedMotion(enabled: boolean): void {
      update((state) => {
        const newState = { ...state, reducedMotion: enabled };
        persistSettings(newState);
        return newState;
      });
    },

    setSoundEnabled(enabled: boolean): void {
      update((state) => {
        const newState = { ...state, soundEnabled: enabled };
        persistSettings(newState);
        return newState;
      });
    },
  };
}

export const settingsStore = createSettingsStore();
