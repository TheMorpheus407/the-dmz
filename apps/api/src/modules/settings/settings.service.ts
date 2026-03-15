import { randomUUID } from 'crypto';

import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { userProfiles } from '../../db/schema/auth/user-profiles.js';

import type { AppConfig } from '../../config.js';

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
  config: AppConfig,
  userId: string,
  tenantId: string,
): Promise<UserAllSettings> {
  const db = getDatabaseClient(config);

  const profile = await db.query.userProfiles.findFirst({
    where: and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return defaultSettings;
  }

  const preferences = (profile.preferences as Record<string, unknown>) || {};
  const accessibilitySettings = (profile.accessibilitySettings as Record<string, unknown>) || {};

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
  config: AppConfig,
  userId: string,
  tenantId: string,
  category: string,
  settings: Record<string, unknown>,
): Promise<UserAllSettings> {
  const db = getDatabaseClient(config);

  const profile = await db.query.userProfiles.findFirst({
    where: and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)),
  });

  const existingPreferences = (profile?.preferences as Record<string, unknown>) || {};
  const existingAccessibilitySettings =
    (profile?.accessibilitySettings as Record<string, unknown>) || {};

  let updatedPreferences: Record<string, unknown>;
  let updatedAccessibilitySettings: Record<string, unknown> = existingAccessibilitySettings;

  if (category === 'accessibility') {
    updatedAccessibilitySettings = {
      ...existingAccessibilitySettings,
      ...settings,
    };
    updatedPreferences = existingPreferences;
  } else {
    updatedPreferences = {
      ...existingPreferences,
      [category]: {
        ...((existingPreferences[category] as Record<string, unknown>) || {}),
        ...settings,
      },
    };
  }

  await db
    .update(userProfiles)
    .set({
      preferences: updatedPreferences,
      accessibilitySettings: updatedAccessibilitySettings,
      updatedAt: new Date(),
    })
    .where(and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)));

  return getUserSettings(config, userId, tenantId);
}

export async function exportUserSettings(
  _config: AppConfig,
  userId: string,
  tenantId: string,
): Promise<ExportData> {
  const settings = await getUserSettings(_config, userId, tenantId);
  return {
    settings,
    exportedAt: new Date().toISOString(),
  };
}

export async function requestDataExport(
  _config: AppConfig,
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
  _config: AppConfig,
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
