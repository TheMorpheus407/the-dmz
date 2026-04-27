import { writable } from 'svelte/store';

import {
  SoundCategory,
  type SoundSettings,
  DEFAULT_SOUND_SETTINGS,
  soundManager,
  loadSoundSettings,
  saveSoundSettings,
} from '$lib/audio';

import { browser } from '$app/environment';

function createSoundStore() {
  const { subscribe, set, update } = writable<SoundSettings>(DEFAULT_SOUND_SETTINGS);

  function applySettings(settings: SoundSettings): void {
    soundManager.setSettings(settings);
    soundManager.setMasterVolume(settings.masterVolume);
    Object.values(SoundCategory).forEach((category) => {
      if (settings.categories[category].enabled) {
        soundManager.unmute(category);
      } else {
        soundManager.mute(category);
      }
    });
  }

  return {
    subscribe,

    init(): void {
      if (!browser) return;

      const loadedSettings = loadSoundSettings();
      set(loadedSettings);
      applySettings(loadedSettings);

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.disableAll();
      }
    },

    setMasterVolume(volume: number): void {
      update((state) => {
        const newState = {
          ...state,
          masterVolume: Math.max(0, Math.min(100, volume)),
        };
        soundManager.setMasterVolume(newState.masterVolume);
        saveSoundSettings(newState);
        return newState;
      });
    },

    setCategoryEnabled(category: SoundCategory, enabled: boolean): void {
      update((state) => {
        const newState = {
          ...state,
          categories: {
            ...state.categories,
            [category]: {
              ...state.categories[category],
              enabled,
            },
          },
        };
        if (enabled) {
          soundManager.unmute(category);
        } else {
          soundManager.mute(category);
        }
        saveSoundSettings(newState);
        return newState;
      });
    },

    setCategoryVolume(category: SoundCategory, volume: number): void {
      update((state) => {
        const newState = {
          ...state,
          categories: {
            ...state.categories,
            [category]: {
              ...state.categories[category],
              volume: Math.max(0, Math.min(100, volume)),
            },
          },
        };
        soundManager.setVolume(category, newState.categories[category].volume);
        saveSoundSettings(newState);
        return newState;
      });
    },

    mute(category?: SoundCategory): void {
      soundManager.mute(category);
      if (!category) {
        update((state) => {
          const newState = { ...state, masterVolume: 0 };
          saveSoundSettings(newState);
          return newState;
        });
      }
    },

    unmute(category?: SoundCategory): void {
      soundManager.unmute(category);
    },

    disableAll(): void {
      update((state) => {
        const newState = {
          ...state,
          categories: {
            [SoundCategory.AMBIENT]: { ...state.categories[SoundCategory.AMBIENT], enabled: false },
            [SoundCategory.UI_FEEDBACK]: {
              ...state.categories[SoundCategory.UI_FEEDBACK],
              enabled: false,
            },
            [SoundCategory.ALERTS]: { ...state.categories[SoundCategory.ALERTS], enabled: false },
            [SoundCategory.STAMPS]: { ...state.categories[SoundCategory.STAMPS], enabled: false },
            [SoundCategory.NARRATIVE]: {
              ...state.categories[SoundCategory.NARRATIVE],
              enabled: false,
            },
            [SoundCategory.EFFECTS]: { ...state.categories[SoundCategory.EFFECTS], enabled: false },
          },
        };
        Object.values(SoundCategory).forEach((cat) => soundManager.mute(cat));
        saveSoundSettings(newState);
        return newState;
      });
    },

    enableAll(): void {
      update((state) => {
        const newState = {
          ...state,
          categories: {
            [SoundCategory.AMBIENT]: { ...state.categories[SoundCategory.AMBIENT], enabled: true },
            [SoundCategory.UI_FEEDBACK]: {
              ...state.categories[SoundCategory.UI_FEEDBACK],
              enabled: true,
            },
            [SoundCategory.ALERTS]: { ...state.categories[SoundCategory.ALERTS], enabled: true },
            [SoundCategory.STAMPS]: { ...state.categories[SoundCategory.STAMPS], enabled: true },
            [SoundCategory.NARRATIVE]: {
              ...state.categories[SoundCategory.NARRATIVE],
              enabled: true,
            },
            [SoundCategory.EFFECTS]: { ...state.categories[SoundCategory.EFFECTS], enabled: true },
          },
        };
        Object.values(SoundCategory).forEach((cat) => soundManager.unmute(cat));
        saveSoundSettings(newState);
        return newState;
      });
    },

    resetToDefaults(): void {
      set(DEFAULT_SOUND_SETTINGS);
      applySettings(DEFAULT_SOUND_SETTINGS);
      saveSoundSettings(DEFAULT_SOUND_SETTINGS);
    },
  };
}

export const soundStore = createSoundStore();
