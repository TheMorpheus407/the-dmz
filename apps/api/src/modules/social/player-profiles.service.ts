import { eq, and, sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  playerProfiles,
  avatars,
  type PlayerProfile,
  type PrivacyMode,
} from '../../db/schema/social/index.js';
import { tenants } from '../../shared/database/schema/tenants.js';
import {
  getCachedPlayerProfile,
  setCachedPlayerProfile,
  invalidatePlayerProfileCache,
} from '../../shared/cache/index.js';

import type { AppConfig } from '../../config.js';

export interface CreatePlayerProfileInput {
  userId: string;
  tenantId: string;
  displayName: string;
  avatarId?: string;
  privacyMode?: PrivacyMode;
  bio?: string;
}

export interface UpdatePlayerProfileInput {
  displayName?: string | undefined;
  avatarId?: string | undefined;
  bio?: string | undefined;
  seasonRank?: number | undefined;
  skillRatingBlue?: number | undefined;
  skillRatingRed?: number | undefined;
  skillRatingCoop?: number | undefined;
  totalSessionsPlayed?: number | undefined;
  currentStreak?: number | undefined;
}

export interface UpdatePrivacySettingsInput {
  privacyMode?: PrivacyMode | undefined;
  socialVisibility?: Record<string, unknown> | undefined;
}

export interface PlayerProfileWithVisibility extends PlayerProfile {
  isOwner?: boolean;
}

async function getDefaultPrivacyMode(
  config: AppConfig,
  tenantId: string,
): Promise<'public' | 'private'> {
  const db = getDatabaseClient(config);
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.tenantId, tenantId),
  });
  if (tenant?.tier === 'enterprise' || tenant?.tier === 'government') {
    return 'private';
  }
  return 'public';
}

export async function createPlayerProfile(
  config: AppConfig,
  input: CreatePlayerProfileInput,
): Promise<PlayerProfile> {
  const db = getDatabaseClient(config);

  const defaultPrivacyMode =
    input.privacyMode ?? (await getDefaultPrivacyMode(config, input.tenantId));

  const [profile] = await db
    .insert(playerProfiles)
    .values({
      userId: input.userId,
      tenantId: input.tenantId,
      displayName: input.displayName,
      avatarId: input.avatarId ?? null,
      privacyMode: defaultPrivacyMode,
      bio: input.bio ?? null,
    })
    .returning();

  return profile!;
}

export async function getPlayerProfileById(
  config: AppConfig,
  tenantId: string,
  profileId: string,
  requestorUserId?: string,
): Promise<PlayerProfileWithVisibility | null> {
  const cached = await getCachedPlayerProfile(config, tenantId, profileId);
  if (cached) {
    const profile = cached.profile as PlayerProfile;
    return applyPrivacyMode(profile, profile.userId === requestorUserId);
  }

  const db = getDatabaseClient(config);

  const profile = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.profileId, profileId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return null;
  }

  await setCachedPlayerProfile(
    config,
    tenantId,
    profileId,
    profile as unknown as Record<string, unknown>,
  );

  return applyPrivacyMode(profile, profile.userId === requestorUserId);
}

export async function getPlayerProfileByUserId(
  config: AppConfig,
  tenantId: string,
  userId: string,
  requestorUserId?: string,
): Promise<PlayerProfileWithVisibility | null> {
  const db = getDatabaseClient(config);

  const profile = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.userId, userId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return null;
  }

  return applyPrivacyMode(profile, profile.userId === requestorUserId);
}

export async function updatePlayerProfile(
  config: AppConfig,
  tenantId: string,
  profileId: string,
  input: UpdatePlayerProfileInput,
): Promise<PlayerProfile | null> {
  const db = getDatabaseClient(config);

  const existing = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.profileId, profileId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(playerProfiles)
    .set({
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.avatarId !== undefined && { avatarId: input.avatarId }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.seasonRank !== undefined && { seasonRank: input.seasonRank }),
      ...(input.skillRatingBlue !== undefined && { skillRatingBlue: input.skillRatingBlue }),
      ...(input.skillRatingRed !== undefined && { skillRatingRed: input.skillRatingRed }),
      ...(input.skillRatingCoop !== undefined && { skillRatingCoop: input.skillRatingCoop }),
      ...(input.totalSessionsPlayed !== undefined && {
        totalSessionsPlayed: input.totalSessionsPlayed,
      }),
      ...(input.currentStreak !== undefined && { currentStreak: input.currentStreak }),
      updatedAt: new Date(),
    })
    .where(and(eq(playerProfiles.profileId, profileId), eq(playerProfiles.tenantId, tenantId)))
    .returning();

  if (updated) {
    await invalidatePlayerProfileCache(config, tenantId, profileId);
  }

  return updated ?? null;
}

export async function getPrivacySettings(
  config: AppConfig,
  tenantId: string,
  userId: string,
): Promise<{ privacyMode: PrivacyMode; socialVisibility: Record<string, unknown> } | null> {
  const db = getDatabaseClient(config);

  const profile = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.userId, userId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return null;
  }

  return {
    privacyMode: profile.privacyMode as PrivacyMode,
    socialVisibility: profile.socialVisibility as Record<string, unknown>,
  };
}

export async function updatePrivacySettings(
  config: AppConfig,
  tenantId: string,
  userId: string,
  input: UpdatePrivacySettingsInput,
): Promise<PlayerProfile | null> {
  const db = getDatabaseClient(config);

  const existing = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.userId, userId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(playerProfiles)
    .set({
      ...(input.privacyMode !== undefined && { privacyMode: input.privacyMode }),
      ...(input.socialVisibility !== undefined && { socialVisibility: input.socialVisibility }),
      updatedAt: new Date(),
    })
    .where(and(eq(playerProfiles.userId, userId), eq(playerProfiles.tenantId, tenantId)))
    .returning();

  if (updated) {
    await invalidatePlayerProfileCache(config, tenantId, updated.profileId);
  }

  return updated ?? null;
}

export async function listAvatars(
  config: AppConfig,
  category?: string,
): Promise<(typeof avatars.$inferSelect)[]> {
  const db = getDatabaseClient(config);

  if (category) {
    return db
      .select()
      .from(avatars)
      .where(sql`${avatars.category} = ${category}`);
  }

  return db.select().from(avatars);
}

export async function getAvatarById(
  config: AppConfig,
  avatarId: string,
): Promise<typeof avatars.$inferSelect | null> {
  const db = getDatabaseClient(config);

  const result = await db
    .select()
    .from(avatars)
    .where(sql`${avatars.id} = ${avatarId}`);

  return result[0] ?? null;
}

export async function updateLastActive(
  config: AppConfig,
  tenantId: string,
  profileId: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  await db
    .update(playerProfiles)
    .set({
      lastActiveAt: new Date(),
    })
    .where(and(eq(playerProfiles.profileId, profileId), eq(playerProfiles.tenantId, tenantId)));
}

function applyPrivacyMode(profile: PlayerProfile, isOwner: boolean): PlayerProfileWithVisibility {
  if (isOwner) {
    return { ...profile, isOwner: true };
  }

  switch (profile.privacyMode) {
    case 'public':
      return { ...profile, isOwner: false };
    case 'friends_only':
      return {
        ...profile,
        bio: null,
        avatarId: null,
        isOwner: false,
      };
    case 'private':
      return {
        profileId: profile.profileId,
        userId: profile.userId,
        tenantId: profile.tenantId,
        displayName: profile.displayName,
        avatarId: null,
        privacyMode: profile.privacyMode,
        bio: null,
        socialVisibility: {},
        seasonRank: profile.seasonRank,
        skillRatingBlue: profile.skillRatingBlue,
        skillRatingRed: profile.skillRatingRed,
        skillRatingCoop: profile.skillRatingCoop,
        totalSessionsPlayed: profile.totalSessionsPlayed,
        currentStreak: profile.currentStreak,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        lastActiveAt: profile.lastActiveAt,
        isOwner: false,
      };
    default:
      return { ...profile, isOwner: false };
  }
}
