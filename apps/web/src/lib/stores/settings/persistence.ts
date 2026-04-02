import { initialSettingsState } from './defaults';
import { deepMerge } from './utils';

import type { SettingsState } from './types';

import { browser } from '$app/environment';

const STORAGE_KEY = 'dmz-app-settings';

export function loadPersistedSettings(): SettingsState {
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

export function persistSettings(state: SettingsState): void {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable
  }
}
