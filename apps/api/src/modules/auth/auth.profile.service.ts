import { getDatabaseClient } from '../../shared/database/connection.js';

import {
  findUserById,
  findProfileByUserId,
  updateProfile,
  type UpdateProfileData,
} from './auth.repo.js';
import {
  resolveEffectivePreferences,
  getLockedPreferenceKeys,
  type PreferenceResolutionOptions,
} from './preferences.js';
import { InvalidCredentialsError } from './auth.errors.js';

import type { AppConfig } from '../../config.js';
import type { AuthUser, UserProfile } from './auth.types.js';

export const getCurrentUser = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
): Promise<AuthUser> => {
  const db = getDatabaseClient(config);
  const user = await findUserById(db, userId, tenantId);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  return user;
};

export const getProfile = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
): Promise<UserProfile | null> => {
  const db = getDatabaseClient(config);
  return findProfileByUserId(db, userId, tenantId);
};

export const updateUserProfile = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
  data: UpdateProfileData,
): Promise<UserProfile | null> => {
  const db = getDatabaseClient(config);
  return updateProfile(db, userId, tenantId, data);
};

type UserPrefs = {
  themePreferences?: {
    theme?: 'green' | 'amber' | 'high-contrast' | 'enterprise';
    enableTerminalEffects?: boolean;
    effects?: Record<string, boolean>;
    effectIntensity?: Record<string, number>;
    fontSize?: number;
    terminalGlowIntensity?: number;
  };
  accessibilityPreferences?: {
    reducedMotion?: boolean;
    highContrast?: boolean;
    fontSize?: number;
  };
};

type LockedPrefs = {
  theme?: boolean;
  enableTerminalEffects?: boolean;
  effects?: Record<string, boolean>;
  effectIntensity?: Record<string, boolean>;
  fontSize?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  terminalGlowIntensity?: boolean;
};

export const getEffectivePreferences = async (
  config: AppConfig,
  userId: string,
  tenantId: string,
  _surface?: string,
): Promise<{
  profile: UserProfile | null;
  effectivePreferences: ReturnType<typeof resolveEffectivePreferences>;
  lockedPreferenceKeys: string[];
}> => {
  const profile = await getProfile(config, userId, tenantId);

  if (!profile) {
    return {
      profile: null,
      effectivePreferences: resolveEffectivePreferences({}),
      lockedPreferenceKeys: [],
    };
  }

  const userPrefs = profile.preferences as UserPrefs | undefined;
  const lockedPrefs = profile.policyLockedPreferences as LockedPrefs | undefined;

  const resolutionOptions: {
    userPreferences?: UserPrefs;
    policyLockedPreferences?: LockedPrefs;
    surface?: string;
    osPreferences?: { prefersReducedMotion: boolean; prefersContrast: boolean };
  } = {};

  if (userPrefs) {
    resolutionOptions.userPreferences = userPrefs;
  }

  if (lockedPrefs) {
    resolutionOptions.policyLockedPreferences = lockedPrefs;
  }

  const effectivePreferences = resolveEffectivePreferences(
    resolutionOptions as PreferenceResolutionOptions,
  );
  const lockedPreferenceKeys = getLockedPreferenceKeys(resolutionOptions.policyLockedPreferences);

  return {
    profile,
    effectivePreferences,
    lockedPreferenceKeys,
  };
};
