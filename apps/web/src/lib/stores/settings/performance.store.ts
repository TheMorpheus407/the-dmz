import { writable } from 'svelte/store';

import { defaultPerformanceSettings } from './defaults';

import type { PerformanceSettings, PerformanceTier } from './types';

function createPerformanceStore() {
  const { subscribe, set, update } = writable<PerformanceSettings>(defaultPerformanceSettings);

  return {
    subscribe,
    set,
    update,

    updatePerformance(settings: Partial<PerformanceSettings>): void {
      update((state) => ({ ...state, ...settings }));
    },

    setPerformanceTier(tier: PerformanceTier): void {
      update((state) => ({ ...state, tier, userOverride: true }));
    },

    enableAutoPerformanceDetect(): void {
      update((state) => ({ ...state, autoDetect: true, userOverride: false }));
    },

    setVirtualization(enabled: boolean): void {
      update((state) => ({ ...state, enableVirtualization: enabled }));
    },

    setReduceAnimations(enabled: boolean): void {
      update((state) => ({ ...state, reduceAnimations: enabled }));
    },

    resetToDefaults(): void {
      set(defaultPerformanceSettings);
    },
  };
}

export const performanceStore = createPerformanceStore();
