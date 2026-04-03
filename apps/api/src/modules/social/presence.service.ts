import { eq, and, inArray, or } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  presence,
  type PresenceStatus,
  playerProfiles,
  type privacyModes,
  socialRelationships,
} from '../../db/schema/social/index.js';
import {
  getCachedPresence,
  setCachedPresence,
  deleteCachedPresence,
  type CachedPresence,
} from '../../shared/cache/index.js';
import { evaluateFlag } from '../feature-flags/index.js';

import { getRelationshipStatus } from './social-relationship.service.js';

import type { AppConfig } from '../../config.js';

export interface PresenceResult {
  success: boolean;
  presence?: typeof presence.$inferSelect | undefined;
  error?: string;
}

export interface PresenceUpdateInput {
  status: PresenceStatus;
  statusData?: Record<string, unknown>;
}

export interface FriendPresenceResult {
  playerId: string;
  displayName: string;
  status: PresenceStatus;
  statusData: Record<string, unknown>;
  lastHeartbeat: Date;
}

export async function setPresence(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  input: PresenceUpdateInput,
): Promise<PresenceResult> {
  const db = getDatabaseClient(config);

  const existingPresence = await db.query.presence.findFirst({
    where: and(eq(presence.playerId, playerId), eq(presence.tenantId, tenantId)),
  });

  const now = new Date();

  if (existingPresence) {
    const [updated] = await db
      .update(presence)
      .set({
        status: input.status,
        statusData: input.statusData ?? existingPresence.statusData,
        lastHeartbeat: now,
        updatedAt: now,
      })
      .where(eq(presence.playerId, playerId))
      .returning();

    await setCachedPresence(config, tenantId, playerId, {
      status: input.status,
      statusData: input.statusData ?? (existingPresence.statusData as Record<string, unknown>),
      lastHeartbeat: now.getTime(),
      tenantId,
    });

    return { success: true, presence: updated ?? undefined };
  }

  const [newPresence] = await db
    .insert(presence)
    .values({
      playerId,
      tenantId,
      status: input.status,
      statusData: input.statusData ?? {},
      lastHeartbeat: now,
    })
    .returning();

  await setCachedPresence(config, tenantId, playerId, {
    status: input.status,
    statusData: input.statusData ?? {},
    lastHeartbeat: now.getTime(),
    tenantId,
  });

  return { success: true, presence: newPresence ?? undefined };
}

export async function getPresence(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<CachedPresence | null> {
  const cached = await getCachedPresence(config, tenantId, playerId);
  if (cached) {
    return cached;
  }

  const db = getDatabaseClient(config);

  const dbPresence = await db.query.presence.findFirst({
    where: and(eq(presence.playerId, playerId), eq(presence.tenantId, tenantId)),
  });

  if (!dbPresence) {
    return null;
  }

  const cachedPresence: CachedPresence = {
    status: dbPresence.status as PresenceStatus,
    statusData: dbPresence.statusData as Record<string, unknown>,
    lastHeartbeat: dbPresence.lastHeartbeat.getTime(),
    tenantId: dbPresence.tenantId,
  };

  await setCachedPresence(config, tenantId, playerId, cachedPresence);

  return cachedPresence;
}

export async function refreshHeartbeat(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const existingPresence = await db.query.presence.findFirst({
    where: and(eq(presence.playerId, playerId), eq(presence.tenantId, tenantId)),
  });

  if (!existingPresence) {
    return false;
  }

  const now = new Date();

  await db
    .update(presence)
    .set({
      lastHeartbeat: now,
      updatedAt: now,
    })
    .where(eq(presence.playerId, playerId));

  await setCachedPresence(config, tenantId, playerId, {
    status: existingPresence.status as PresenceStatus,
    statusData: existingPresence.statusData as Record<string, unknown>,
    lastHeartbeat: now.getTime(),
    tenantId,
  });

  return true;
}

export async function expirePresence(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const existingPresence = await db.query.presence.findFirst({
    where: and(eq(presence.playerId, playerId), eq(presence.tenantId, tenantId)),
  });

  if (!existingPresence) {
    return false;
  }

  const now = new Date();

  await db
    .update(presence)
    .set({
      status: 'offline',
      statusData: {},
      lastHeartbeat: now,
      updatedAt: now,
    })
    .where(eq(presence.playerId, playerId));

  await deleteCachedPresence(config, tenantId, playerId);

  return true;
}

export async function getFriendsPresence(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<FriendPresenceResult[]> {
  const presenceEnabled = await evaluateFlag(config, tenantId, 'social.presence_enabled');
  if (!presenceEnabled) {
    return [];
  }

  const db = getDatabaseClient(config);

  const friends = await db.query.socialRelationships.findMany({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.relationshipType, 'friend'),
      eq(socialRelationships.status, 'accepted'),
      or(
        eq(socialRelationships.requesterId, playerId),
        eq(socialRelationships.addresseeId, playerId),
      ),
    ),
  });

  const friendIds = friends
    .map((f) => (f.requesterId === playerId ? f.addresseeId : f.requesterId))
    .filter((id) => id !== playerId);

  if (friendIds.length === 0) {
    return [];
  }

  const profiles = await db.query.playerProfiles.findMany({
    where: and(eq(playerProfiles.tenantId, tenantId), inArray(playerProfiles.profileId, friendIds)),
  });

  const profileMap = new Map(profiles.map((p) => [p.profileId, p]));

  const results: FriendPresenceResult[] = [];

  for (const friendId of friendIds) {
    const presenceData = await getPresence(config, tenantId, friendId);
    const profile = profileMap.get(friendId);

    if (!profile) {
      continue;
    }

    const relationship = await getRelationshipStatus(config, tenantId, friendId, playerId);
    if (relationship?.relationshipType === 'block') {
      continue;
    }

    const playerPrivacy = profile.privacyMode as (typeof privacyModes)[number];
    if (playerPrivacy === 'private') {
      continue;
    }

    if (playerPrivacy === 'friends_only' && relationship?.relationshipType !== 'friend') {
      continue;
    }

    results.push({
      playerId: friendId,
      displayName: profile.displayName,
      status: presenceData?.status ?? 'offline',
      statusData: presenceData?.statusData ?? {},
      lastHeartbeat: presenceData?.lastHeartbeat
        ? new Date(presenceData.lastHeartbeat)
        : new Date(0),
    });
  }

  return results;
}

export async function getPlayerPresence(
  config: AppConfig,
  tenantId: string,
  requesterId: string,
  targetPlayerId: string,
): Promise<CachedPresence | null> {
  const presenceEnabled = await evaluateFlag(config, tenantId, 'social.presence_enabled');
  if (!presenceEnabled) {
    return null;
  }

  const db = getDatabaseClient(config);

  const targetProfile = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.profileId, targetPlayerId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!targetProfile) {
    return null;
  }

  const relationship = await getRelationshipStatus(config, tenantId, targetPlayerId, requesterId);
  if (relationship?.relationshipType === 'block') {
    return null;
  }

  const requesterProfile = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.profileId, requesterId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!requesterProfile) {
    return null;
  }

  const targetPrivacy = targetProfile.privacyMode as (typeof privacyModes)[number];

  if (targetPrivacy === 'private') {
    return null;
  }

  if (targetPrivacy === 'friends_only' && relationship?.relationshipType !== 'friend') {
    return null;
  }

  return getPresence(config, tenantId, targetPlayerId);
}

export async function updatePresenceStatus(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  input: PresenceUpdateInput,
): Promise<PresenceResult> {
  const presenceEnabled = await evaluateFlag(config, tenantId, 'social.presence_enabled');
  if (!presenceEnabled) {
    return { success: false, error: 'Presence system is disabled' };
  }

  return setPresence(config, tenantId, playerId, input);
}

export async function getPresencePrivacySettings(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<{ privacyMode: (typeof privacyModes)[number] } | null> {
  const db = getDatabaseClient(config);

  const profile = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.profileId, playerId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return null;
  }

  return {
    privacyMode: profile.privacyMode as (typeof privacyModes)[number],
  };
}

export async function updatePresencePrivacy(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  privacyMode: (typeof privacyModes)[number],
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const profile = await db.query.playerProfiles.findFirst({
    where: and(eq(playerProfiles.profileId, playerId), eq(playerProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return false;
  }

  await db
    .update(playerProfiles)
    .set({
      privacyMode,
      updatedAt: new Date(),
    })
    .where(eq(playerProfiles.profileId, playerId));

  return true;
}
