import { writable } from 'svelte/store';

import { defaultAudioSettings } from './defaults';

import type { AudioSettings } from './types';

function createAudioSettingsStore() {
  const { subscribe, set, update } = writable<AudioSettings>(defaultAudioSettings);

  return {
    subscribe,
    set,
    update,

    updateAudio(settings: Partial<AudioSettings>): void {
      update((state) => ({ ...state, ...settings }));
    },

    setMasterVolume(volume: number): void {
      update((state) => ({
        ...state,
        masterVolume: Math.max(0, Math.min(100, volume)),
      }));
    },

    setMuteAll(muted: boolean): void {
      update((state) => ({ ...state, muteAll: muted }));
    },

    setAudioCategoryVolume(category: keyof AudioSettings['categoryVolumes'], volume: number): void {
      update((state) => ({
        ...state,
        categoryVolumes: {
          ...state.categoryVolumes,
          [category]: Math.max(0, Math.min(100, volume)),
        },
      }));
    },

    setTextToSpeechEnabled(enabled: boolean): void {
      update((state) => ({ ...state, textToSpeechEnabled: enabled }));
    },

    setTextToSpeechSpeed(speed: number): void {
      update((state) => ({
        ...state,
        textToSpeechSpeed: Math.max(50, Math.min(200, speed)),
      }));
    },

    resetToDefaults(): void {
      set(defaultAudioSettings);
    },
  };
}

export const audioSettingsStore = createAudioSettingsStore();
