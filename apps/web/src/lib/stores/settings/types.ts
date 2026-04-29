import type { ThemeId } from '@the-dmz/shared/constants';
import type {
  ColorBlindMode,
  FocusIndicatorStyle,
  DifficultyLevel,
  PrivacyMode,
} from '@the-dmz/shared/schemas';

export type PerformanceTier = 'low' | 'medium' | 'high';

export interface DisplaySettings {
  theme: ThemeId;
  enableTerminalEffects: boolean;
  effects: {
    scanlines: boolean;
    curvature: boolean;
    glow: boolean;
    noise: boolean;
    vignette: boolean;
    flicker: boolean;
  };
  effectIntensity: {
    scanlines: number;
    curvature: number;
    glow: number;
    noise: number;
    vignette: number;
    flicker: number;
  };
  fontSize: number;
  terminalGlowIntensity: number;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: number;
  colorBlindMode: ColorBlindMode;
  screenReaderAnnouncements: boolean;
  keyboardNavigationHints: boolean;
  focusIndicatorStyle: FocusIndicatorStyle;
}

export interface GameplaySettings {
  difficulty: DifficultyLevel;
  notificationVolume: number;
  notificationCategoryVolumes: {
    master: number;
    alerts: number;
    ui: number;
    ambient: number;
  };
  notificationDuration: number;
  autoAdvanceTiming: number;
  queueBuildupRate: number;
}

export interface AudioSettings {
  masterVolume: number;
  categoryVolumes: {
    alerts: number;
    ui: number;
    ambient: number;
    narrative: number;
    effects: number;
  };
  muteAll: boolean;
  textToSpeechEnabled: boolean;
  textToSpeechSpeed: number;
}

export interface AccountSettings {
  displayName: string;
  privacyMode: PrivacyMode;
}

export interface PerformanceSettings {
  tier: PerformanceTier;
  userOverride: boolean;
  autoDetect: boolean;
  enableVirtualization: boolean;
  reduceAnimations: boolean;
}

export interface ApiSettingsState {
  display: DisplaySettings;
  accessibility: AccessibilitySettings;
  gameplay: GameplaySettings;
  audio: AudioSettings;
  account: AccountSettings;
}

export interface SettingsState extends ApiSettingsState {
  performance: PerformanceSettings;
}
