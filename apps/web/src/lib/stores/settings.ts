import { writable, derived } from 'svelte/store';

import type { ThemeId } from '@the-dmz/shared';

import {
  type DisplaySettings,
  type AccessibilitySettings,
  type GameplaySettings,
  type AudioSettings,
  type AccountSettings,
  type PerformanceSettings,
  type SettingsState,
  type PerformanceTier,
} from './settings/types';
import {
  initialSettingsState,
  defaultDisplaySettings,
  defaultAccessibilitySettings,
  defaultGameplaySettings,
  defaultAudioSettings,
  defaultAccountSettings,
  defaultPerformanceSettings,
} from './settings/defaults';
import { loadPersistedSettings, persistSettings } from './settings/persistence';
import { displayStore } from './settings/display.store';
import { accessibilityStore } from './settings/accessibility.store';
import { gameplayStore } from './settings/gameplay.store';
import { audioSettingsStore } from './settings/audio.store';
import { accountStore } from './settings/account.store';
import { performanceStore } from './settings/performance.store';

function createSettingsStore() {
  const { subscribe, set } = writable<SettingsState>(initialSettingsState);

  function syncToIndividualStores(state: SettingsState): void {
    displayStore.set(state.display);
    accessibilityStore.set(state.accessibility);
    gameplayStore.set(state.gameplay);
    audioSettingsStore.set(state.audio);
    accountStore.set(state.account);
    performanceStore.set(state.performance);
  }

  const combinedStore = derived(
    [
      displayStore,
      accessibilityStore,
      gameplayStore,
      audioSettingsStore,
      accountStore,
      performanceStore,
    ],
    ([$display, $accessibility, $gameplay, $audio, $account, $performance]): SettingsState => ({
      display: $display,
      accessibility: $accessibility,
      gameplay: $gameplay,
      audio: $audio,
      account: $account,
      performance: $performance,
    }),
  );

  let persistUnsub: (() => void) | undefined;

  combinedStore.subscribe((state) => {
    if (persistUnsub) {
      persistUnsub();
      persistUnsub = undefined;
    }
    persistSettings(state);
  });

  return {
    subscribe,

    init(): void {
      const loaded = loadPersistedSettings();
      syncToIndividualStores(loaded);
      set(loaded);
    },

    updateDisplay(settings: Partial<DisplaySettings>): void {
      displayStore.updateDisplay(settings);
    },

    updateAccessibility(settings: Partial<AccessibilitySettings>): void {
      accessibilityStore.updateAccessibility(settings);
    },

    updateGameplay(settings: Partial<GameplaySettings>): void {
      gameplayStore.updateGameplay(settings);
    },

    updateAudio(settings: Partial<AudioSettings>): void {
      audioSettingsStore.updateAudio(settings);
    },

    updateAccount(settings: Partial<AccountSettings>): void {
      accountStore.updateAccount(settings);
    },

    setTheme(theme: ThemeId): void {
      displayStore.setTheme(theme);
    },

    setReducedMotion(enabled: boolean): void {
      accessibilityStore.setReducedMotion(enabled);
    },

    setHighContrast(enabled: boolean): void {
      accessibilityStore.setHighContrast(enabled);
    },

    setMasterVolume(volume: number): void {
      audioSettingsStore.setMasterVolume(volume);
    },

    setMuteAll(muted: boolean): void {
      audioSettingsStore.setMuteAll(muted);
    },

    setAudioCategoryVolume(category: keyof AudioSettings['categoryVolumes'], volume: number): void {
      audioSettingsStore.setAudioCategoryVolume(category, volume);
    },

    setNotificationCategoryVolume(
      category: keyof GameplaySettings['notificationCategoryVolumes'],
      volume: number,
    ): void {
      gameplayStore.setNotificationCategoryVolume(category, volume);
    },

    toggleEffect(effect: keyof DisplaySettings['effects']): void {
      displayStore.toggleEffect(effect);
    },

    setEffectIntensity(effect: keyof DisplaySettings['effectIntensity'], intensity: number): void {
      displayStore.setEffectIntensity(effect, intensity);
    },

    setFontSize(size: number): void {
      displayStore.setFontSize(size);
      accessibilityStore.setFontSize(size);
    },

    updatePerformance(settings: Partial<PerformanceSettings>): void {
      performanceStore.updatePerformance(settings);
    },

    setPerformanceTier(tier: PerformanceTier): void {
      performanceStore.setPerformanceTier(tier);
    },

    enableAutoPerformanceDetect(): void {
      performanceStore.enableAutoPerformanceDetect();
    },

    setVirtualization(enabled: boolean): void {
      performanceStore.setVirtualization(enabled);
    },

    resetToDefaults(): void {
      displayStore.resetToDefaults();
      accessibilityStore.resetToDefaults();
      gameplayStore.resetToDefaults();
      audioSettingsStore.resetToDefaults();
      accountStore.resetToDefaults();
      performanceStore.resetToDefaults();
    },
  };
}

export const settingsStore = createSettingsStore();

export const effectiveTheme = derived(settingsStore, ($settings) => {
  if ($settings.accessibility.highContrast) {
    return 'high-contrast' as ThemeId;
  }
  return $settings.display.theme;
});

export const effectiveEffects = derived(settingsStore, ($settings) => {
  const theme = $settings.display.theme;
  if (
    theme === 'high-contrast' ||
    theme === 'enterprise' ||
    theme === 'admin-light' ||
    theme === 'admin-dark'
  ) {
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

export const effectiveColorBlindMode = derived(settingsStore, ($settings) => {
  return $settings.accessibility.colorBlindMode;
});

export const effectivePerformanceTier = derived(settingsStore, ($settings) => {
  if ($settings.performance.userOverride) {
    return $settings.performance.tier;
  }
  return 'medium';
});

export const effectiveVirtualization = derived(settingsStore, ($settings) => {
  return $settings.performance.enableVirtualization;
});

export const effectiveReduceAnimations = derived(settingsStore, ($settings) => {
  if ($settings.accessibility.reducedMotion) {
    return true;
  }
  return $settings.performance.reduceAnimations || $settings.performance.tier === 'low';
});

export type {
  DisplaySettings,
  AccessibilitySettings,
  GameplaySettings,
  AudioSettings,
  AccountSettings,
  PerformanceSettings,
  SettingsState,
  PerformanceTier,
} from './settings/types';
export type {
  ColorBlindMode,
  FocusIndicatorStyle,
  DifficultyLevel,
  PrivacyMode,
} from '@the-dmz/shared/schemas';
export {
  defaultDisplaySettings,
  defaultAccessibilitySettings,
  defaultGameplaySettings,
  defaultAudioSettings,
  defaultAccountSettings,
  defaultPerformanceSettings,
  initialSettingsState,
};

export { displayStore } from './settings/display.store';
export { accessibilityStore } from './settings/accessibility.store';
export { gameplayStore } from './settings/gameplay.store';
export { audioSettingsStore } from './settings/audio.store';
export { accountStore } from './settings/account.store';
export { performanceStore } from './settings/performance.store';

export type { ThemeId } from '@the-dmz/shared';
