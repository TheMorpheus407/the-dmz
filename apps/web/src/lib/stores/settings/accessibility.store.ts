import { writable } from 'svelte/store';

import type { ColorBlindMode, FocusIndicatorStyle } from '@the-dmz/shared/schemas';

import { defaultAccessibilitySettings } from './defaults';

import type { AccessibilitySettings } from './types';

function createAccessibilityStore() {
  const { subscribe, set, update } = writable<AccessibilitySettings>(defaultAccessibilitySettings);

  return {
    subscribe,
    set,
    update,

    updateAccessibility(settings: Partial<AccessibilitySettings>): void {
      update((state) => ({ ...state, ...settings }));
    },

    setReducedMotion(enabled: boolean): void {
      update((state) => ({ ...state, reducedMotion: enabled }));
    },

    setHighContrast(enabled: boolean): void {
      update((state) => ({ ...state, highContrast: enabled }));
    },

    setFontSize(size: number): void {
      update((state) => ({
        ...state,
        fontSize: Math.max(12, Math.min(32, size)),
      }));
    },

    setColorBlindMode(mode: ColorBlindMode): void {
      update((state) => ({ ...state, colorBlindMode: mode }));
    },

    setFocusIndicatorStyle(style: FocusIndicatorStyle): void {
      update((state) => ({ ...state, focusIndicatorStyle: style }));
    },

    resetToDefaults(): void {
      set(defaultAccessibilitySettings);
    },
  };
}

export const accessibilityStore = createAccessibilityStore();
