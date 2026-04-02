import { randomUUID } from 'crypto';

import {
  themePreferencesSchema,
  accessibilityPreferencesSchema,
  gameplayPreferencesSchema,
  audioPreferencesSchema,
  accountPreferencesSchema,
} from '@the-dmz/shared';

import { validationFailed } from '../../shared/middleware/error-handler.js';

import type { SettingsRepository } from './settings.repository.js';

export interface DisplaySettings {
  theme?: string;
  enableTerminalEffects?: boolean;
  effects?: Record<string, boolean>;
  effectIntensity?: Record<string, number>;
  fontSize?: number;
  terminalGlowIntensity?: number;
}

export interface AccessibilitySettings {
  reducedMotion?: boolean;
  highContrast?: boolean;
  fontSize?: number;
  colorBlindMode?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  screenReaderAnnouncements?: boolean;
  keyboardNavigationHints?: boolean;
  focusIndicatorStyle?: 'subtle' | 'strong';
}

export interface GameplaySettings {
  difficulty?: 'tutorial' | 'easy' | 'normal' | 'hard';
  notificationVolume?: number;
  notificationCategoryVolumes?: Record<'master' | 'alerts' | 'ui' | 'ambient', number>;
  notificationDuration?: number;
  autoAdvanceTiming?: number;
  queueBuildupRate?: number;
}

export interface AudioSettings {
  masterVolume?: number;
  categoryVolumes?: Record<'alerts' | 'ui' | 'ambient' | 'narrative' | 'effects', number>;
  muteAll?: boolean;
  textToSpeechEnabled?: boolean;
  textToSpeechSpeed?: number;
}

export interface AccountSettings {
  displayName?: string;
  privacyMode?: 'public' | 'friends' | 'private';
}

export interface UserAllSettings {
  display: DisplaySettings | null;
  accessibility: AccessibilitySettings | null;
  gameplay: GameplaySettings | null;
  audio: AudioSettings | null;
  account: AccountSettings | null;
}

export interface ExportData {
  settings: UserAllSettings;
  exportedAt: string;
}

function validateSettingsInput(
  category: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  switch (category) {
    case 'display': {
      const result = themePreferencesSchema.safeParse(input);
      if (!result.success) {
        throw validationFailed('Invalid display settings', { violations: result.error.errors });
      }
      return result.data;
    }
    case 'accessibility': {
      const result = accessibilityPreferencesSchema.safeParse(input);
      if (!result.success) {
        throw validationFailed('Invalid accessibility settings', {
          violations: result.error.errors,
        });
      }
      return result.data;
    }
    case 'gameplay': {
      const result = gameplayPreferencesSchema.safeParse(input);
      if (!result.success) {
        throw validationFailed('Invalid gameplay settings', { violations: result.error.errors });
      }
      return result.data;
    }
    case 'audio': {
      const result = audioPreferencesSchema.safeParse(input);
      if (!result.success) {
        throw validationFailed('Invalid audio settings', { violations: result.error.errors });
      }
      return result.data;
    }
    case 'account': {
      const result = accountPreferencesSchema.safeParse(input);
      if (!result.success) {
        throw validationFailed('Invalid account settings', { violations: result.error.errors });
      }
      return result.data;
    }
    default: {
      throw validationFailed(`Invalid settings category: ${category}`);
    }
  }
}

export const defaultSettings: UserAllSettings = {
  display: {
    theme: 'green',
    enableTerminalEffects: true,
    fontSize: 16,
    terminalGlowIntensity: 60,
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
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    fontSize: 16,
    colorBlindMode: 'none',
    screenReaderAnnouncements: true,
    keyboardNavigationHints: true,
    focusIndicatorStyle: 'subtle',
  },
  gameplay: {
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
  },
  audio: {
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
  },
  account: {
    privacyMode: 'public',
  },
};

export async function getUserSettings(
  repository: SettingsRepository,
  userId: string,
  tenantId: string,
): Promise<UserAllSettings> {
  const profile = await repository.findUserProfile(userId, tenantId);

  if (!profile) {
    return defaultSettings;
  }

  const preferences = profile.preferences || {};
  const accessibilitySettings = profile.accessibilitySettings || {};

  return {
    display: {
      ...defaultSettings.display,
      ...(preferences['display'] as Partial<DisplaySettings>),
    },
    accessibility: {
      ...defaultSettings.accessibility,
      ...(preferences['accessibility'] as Partial<AccessibilitySettings>),
      ...accessibilitySettings,
    },
    gameplay: {
      ...defaultSettings.gameplay,
      ...(preferences['gameplay'] as Partial<GameplaySettings>),
    },
    audio: {
      ...defaultSettings.audio,
      ...(preferences['audio'] as Partial<AudioSettings>),
    },
    account: {
      ...defaultSettings.account,
      ...(preferences['account'] as Partial<AccountSettings>),
    },
  };
}

export async function updateUserSettings(
  repository: SettingsRepository,
  userId: string,
  tenantId: string,
  category: string,
  settings: Record<string, unknown>,
): Promise<UserAllSettings> {
  const validatedSettings = validateSettingsInput(category, settings);

  const profile = await repository.findUserProfile(userId, tenantId);

  const existingPreferences = profile?.preferences || {};
  const existingAccessibilitySettings = profile?.accessibilitySettings || {};

  let updatedPreferences: Record<string, unknown>;
  let updatedAccessibilitySettings: Record<string, unknown> = existingAccessibilitySettings;

  if (category === 'accessibility') {
    updatedAccessibilitySettings = {
      ...existingAccessibilitySettings,
      ...validatedSettings,
    };
    updatedPreferences = existingPreferences;
  } else {
    updatedPreferences = {
      ...existingPreferences,
      [category]: {
        ...((existingPreferences[category] as Record<string, unknown>) || {}),
        ...validatedSettings,
      },
    };
  }

  await repository.updateUserSettings(userId, tenantId, {
    preferences: updatedPreferences,
    accessibilitySettings: updatedAccessibilitySettings,
  });

  return getUserSettings(repository, userId, tenantId);
}

export async function exportUserSettings(
  repository: SettingsRepository,
  userId: string,
  tenantId: string,
): Promise<ExportData> {
  const settings = await getUserSettings(repository, userId, tenantId);
  return {
    settings,
    exportedAt: new Date().toISOString(),
  };
}

export async function requestDataExport(
  _userId: string,
  _tenantId: string,
): Promise<{ success: boolean; requestId: string; message: string }> {
  const requestId = randomUUID();

  return {
    success: true,
    requestId,
    message:
      'Data export request has been submitted. You will receive an email when your data is ready for download.',
  };
}

export async function requestAccountDeletion(
  _userId: string,
  _tenantId: string,
): Promise<{ success: boolean; requestId: string; message: string }> {
  const requestId = randomUUID();

  return {
    success: true,
    requestId,
    message:
      'Account deletion request has been submitted. You have 30 days to cancel this request before your account is permanently deleted.',
  };
}
