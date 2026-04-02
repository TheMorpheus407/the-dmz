import { writable } from 'svelte/store';

import type { ThemeId } from '@the-dmz/shared/constants';

import { defaultDisplaySettings } from './defaults';

import type { DisplaySettings } from './types';

function createDisplayStore() {
  const { subscribe, set, update } = writable<DisplaySettings>(defaultDisplaySettings);

  return {
    subscribe,
    set,
    update,

    updateDisplay(settings: Partial<DisplaySettings>): void {
      update((state) => ({ ...state, ...settings }));
    },

    setTheme(theme: ThemeId): void {
      update((state) => ({ ...state, theme }));
    },

    toggleEffect(effect: keyof DisplaySettings['effects']): void {
      update((state) => ({
        ...state,
        effects: { ...state.effects, [effect]: !state.effects[effect] },
      }));
    },

    setEffectIntensity(effect: keyof DisplaySettings['effectIntensity'], intensity: number): void {
      update((state) => ({
        ...state,
        effectIntensity: {
          ...state.effectIntensity,
          [effect]: Math.max(0, Math.min(100, intensity)),
        },
      }));
    },

    setFontSize(size: number): void {
      update((state) => ({
        ...state,
        fontSize: Math.max(12, Math.min(32, size)),
      }));
    },

    resetToDefaults(): void {
      set(defaultDisplaySettings);
    },
  };
}

export const displayStore = createDisplayStore();
