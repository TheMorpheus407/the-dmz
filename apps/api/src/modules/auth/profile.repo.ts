import { eq, and, sql } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import { userProfiles } from '../../db/schema/auth/user-profiles.js';
import { assertCreated } from '../../shared/utils/db-utils.js';

export type ProfileData = {
  tenantId: string;
  userId: string;
  locale?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
};

export type UpdateProfileData = {
  locale?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
  accessibilitySettings?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
};

export const createProfile = async (
  db: DB,
  data: ProfileData,
): Promise<{
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
}> => {
  const [created] = await db
    .insert(userProfiles)
    .values({
      tenantId: data.tenantId,
      userId: data.userId,
      locale: data.locale ?? 'en',
      timezone: data.timezone ?? 'UTC',
      accessibilitySettings: {
        ...(data.preferences?.['themePreferences'] ?? {}),
        ...(data.preferences?.['accessibilityPreferences'] ?? {}),
        ...(data.accessibilitySettings ?? {}),
      },
      notificationSettings: data.notificationSettings ?? {},
    })
    .returning({
      profileId: userProfiles.profileId,
      tenantId: userProfiles.tenantId,
      userId: userProfiles.userId,
      locale: userProfiles.locale,
      timezone: userProfiles.timezone,
      accessibilitySettings: userProfiles.accessibilitySettings,
      notificationSettings: userProfiles.notificationSettings,
    });

  const createdProfile = assertCreated(created, 'user profile');

  return {
    profileId: createdProfile.profileId,
    tenantId: createdProfile.tenantId,
    userId: createdProfile.userId,
    locale: createdProfile.locale,
    timezone: createdProfile.timezone,
    preferences: data.preferences,
    policyLockedPreferences: data.policyLockedPreferences,
    accessibilitySettings: createdProfile.accessibilitySettings as Record<string, unknown>,
    notificationSettings: createdProfile.notificationSettings as Record<string, unknown>,
  } as unknown as {
    profileId: string;
    tenantId: string;
    userId: string;
    locale: string;
    timezone: string;
    preferences?: Record<string, unknown>;
    policyLockedPreferences?: Record<string, unknown>;
    accessibilitySettings: Record<string, unknown>;
    notificationSettings: Record<string, unknown>;
  };
};

export const findProfileByUserId = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<{
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
} | null> => {
  const profile = await db.query.userProfiles.findFirst({
    where: and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return null;
  }

  const accSettings = profile.accessibilitySettings as Record<string, unknown>;

  return {
    profileId: profile.profileId,
    tenantId: profile.tenantId,
    userId: profile.userId,
    locale: profile.locale,
    timezone: profile.timezone,
    preferences: {
      themePreferences: {
        theme: accSettings['theme'] as
          | 'green'
          | 'amber'
          | 'high-contrast'
          | 'enterprise'
          | undefined,
        enableTerminalEffects: accSettings['enableTerminalEffects'] as boolean | undefined,
        fontSize: accSettings['fontSize'] as number | undefined,
      },
      accessibilityPreferences: {
        reducedMotion: accSettings['reducedMotion'] as boolean | undefined,
        highContrast: accSettings['highContrast'] as boolean | undefined,
        fontSize: accSettings['fontSize'] as number | undefined,
      },
    },
    policyLockedPreferences: undefined as unknown as Record<string, unknown>,
    accessibilitySettings: accSettings,
    notificationSettings: profile.notificationSettings as Record<string, unknown>,
  };
};

export const updateProfile = async (
  db: DB,
  userId: string,
  tenantId: string,
  data: UpdateProfileData,
): Promise<{
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
} | null> => {
  const updates: Record<string, unknown> = {};

  if (data.locale !== undefined) {
    updates['locale'] = data.locale;
  }
  if (data.timezone !== undefined) {
    updates['timezone'] = data.timezone;
  }

  const existingProfile = await findProfileByUserId(db, userId, tenantId);

  if (data.preferences !== undefined) {
    const mergedSettings = {
      ...(existingProfile?.accessibilitySettings ?? {}),
      ...((data.preferences['themePreferences'] as Record<string, unknown>) ?? {}),
      ...((data.preferences['accessibilityPreferences'] as Record<string, unknown>) ?? {}),
    };
    updates['accessibilitySettings'] = mergedSettings;
  } else if (data.accessibilitySettings !== undefined) {
    const mergedSettings = {
      ...(existingProfile?.accessibilitySettings ?? {}),
      ...data.accessibilitySettings,
    };
    updates['accessibilitySettings'] = mergedSettings;
  }

  if (data.notificationSettings !== undefined) {
    updates['notificationSettings'] = data.notificationSettings;
  }

  if (Object.keys(updates).length === 0) {
    return findProfileByUserId(db, userId, tenantId);
  }

  const [updated] = await db
    .update(userProfiles)
    .set(updates)
    .where(and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)))
    .returning({
      profileId: userProfiles.profileId,
      tenantId: userProfiles.tenantId,
      userId: userProfiles.userId,
      locale: userProfiles.locale,
      timezone: userProfiles.timezone,
      accessibilitySettings: userProfiles.accessibilitySettings,
      notificationSettings: userProfiles.notificationSettings,
    });

  if (!updated) {
    return null;
  }

  return {
    profileId: updated.profileId,
    tenantId: updated.tenantId,
    userId: updated.userId,
    locale: updated.locale,
    timezone: updated.timezone,
    preferences: data.preferences,
    policyLockedPreferences: existingProfile?.policyLockedPreferences,
    accessibilitySettings: updated.accessibilitySettings as Record<string, unknown>,
    notificationSettings: updated.notificationSettings as Record<string, unknown>,
  } as unknown as {
    profileId: string;
    tenantId: string;
    userId: string;
    locale: string;
    timezone: string;
    preferences?: Record<string, unknown>;
    policyLockedPreferences?: Record<string, unknown>;
    accessibilitySettings: Record<string, unknown>;
    notificationSettings: Record<string, unknown>;
  };
};

export const backfillProfiles = async (db: DB): Promise<number> => {
  const result = await db.execute(sql`
    INSERT INTO "auth"."user_profiles" ("tenant_id", "user_id", "locale", "timezone", "accessibility_settings", "notification_settings")
    SELECT "tenant_id", "user_id", 'en', 'UTC', '{}', '{}'
    FROM "public"."users"
    WHERE NOT EXISTS (
      SELECT 1 FROM "auth"."user_profiles"
      WHERE "auth"."user_profiles"."tenant_id" = "public"."users"."tenant_id"
        AND "auth"."user_profiles"."user_id" = "public"."users"."user_id"
    )
    ON CONFLICT (tenant_id, user_id) DO NOTHING
  `);
  const rowCount = (result as { rowCount?: number }).rowCount;
  return rowCount ?? 0;
};
