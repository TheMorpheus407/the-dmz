import { writable } from 'svelte/store';

import type { DifficultyLevel } from '@the-dmz/shared/schemas';

import { defaultGameplaySettings } from './defaults';

import type { GameplaySettings } from './types';

function createGameplayStore() {
  const { subscribe, set, update } = writable<GameplaySettings>(defaultGameplaySettings);

  return {
    subscribe,
    set,
    update,

    updateGameplay(settings: Partial<GameplaySettings>): void {
      update((state) => ({ ...state, ...settings }));
    },

    setDifficulty(difficulty: DifficultyLevel): void {
      update((state) => ({ ...state, difficulty }));
    },

    setNotificationVolume(volume: number): void {
      update((state) => ({
        ...state,
        notificationVolume: Math.max(0, Math.min(100, volume)),
      }));
    },

    setNotificationCategoryVolume(
      category: keyof GameplaySettings['notificationCategoryVolumes'],
      volume: number,
    ): void {
      update((state) => ({
        ...state,
        notificationCategoryVolumes: {
          ...state.notificationCategoryVolumes,
          [category]: Math.max(0, Math.min(100, volume)),
        },
      }));
    },

    setNotificationDuration(duration: number): void {
      update((state) => ({
        ...state,
        notificationDuration: Math.max(1, Math.min(30, duration)),
      }));
    },

    setAutoAdvanceTiming(timing: number): void {
      update((state) => ({
        ...state,
        autoAdvanceTiming: Math.max(0, Math.min(30, timing)),
      }));
    },

    setQueueBuildupRate(rate: number): void {
      update((state) => ({
        ...state,
        queueBuildupRate: Math.max(1, Math.min(10, rate)),
      }));
    },

    resetToDefaults(): void {
      set(defaultGameplaySettings);
    },
  };
}

export const gameplayStore = createGameplayStore();
