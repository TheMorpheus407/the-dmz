import { THEME_IDS } from '@the-dmz/shared/constants';

import type {
  DisplaySettings,
  AccessibilitySettings,
  GameplaySettings,
  AudioSettings,
  AccountSettings,
  PerformanceSettings,
  SettingsState,
} from './types';

export const defaultDisplaySettings: DisplaySettings = {
  theme: THEME_IDS[0],
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

export const defaultPerformanceSettings: PerformanceSettings = {
  tier: 'medium',
  userOverride: false,
  autoDetect: true,
  enableVirtualization: true,
  reduceAnimations: false,
};

export const initialSettingsState: SettingsState = {
  display: defaultDisplaySettings,
  accessibility: defaultAccessibilitySettings,
  gameplay: defaultGameplaySettings,
  audio: defaultAudioSettings,
  account: defaultAccountSettings,
  performance: defaultPerformanceSettings,
};
