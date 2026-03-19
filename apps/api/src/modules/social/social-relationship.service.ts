import { eq, and, or, sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  socialRelationships,
  type RelationshipType,
  type RelationshipStatus,
  type SocialRelationship,
  MAX_FRIENDS,
  MAX_BLOCKED,
  MAX_MUTED,
} from '../../db/schema/social/index.js';
import {
  getCachedRelationships,
  setCachedRelationships,
  invalidateRelationshipCache,
  invalidateBothPlayersRelationshipCache,
  type CachedRelationship,
} from '../../shared/cache/index.js';

import type { AppConfig } from '../../config.js';

export type { RelationshipType, RelationshipStatus, SocialRelationship };

export interface FriendRequestInput {
  requesterId: string;
  addresseeId: string;
}

export interface RelationshipResult {
  success: boolean;
  relationship?: SocialRelationship | undefined;
  error?: string;
}

export interface RelationshipCount {
  friends: number;
  blocked: number;
  muted: number;
}

const RELATIONSHIP_PRECEDENCE: Record<RelationshipType, number> = {
  block: 4,
  friend: 3,
  mute: 2,
};

export function getRelationshipPrecedence(type: RelationshipType): number {
  return RELATIONSHIP_PRECEDENCE[type];
}

export function resolveRelationship(
  rel1?: { type: RelationshipType; status: RelationshipStatus },
  rel2?: { type: RelationshipType; status: RelationshipStatus },
): { type: RelationshipType; status: RelationshipStatus } | null {
  if (!rel1 && !rel2) {
    return null;
  }

  if (!rel1) {
    if (!rel2) {
      return null;
    }
    return rel2.status === 'accepted' ? rel2 : null;
  }

  if (!rel2) {
    return rel1.status === 'accepted' ? rel1 : null;
  }

  if (rel1.status !== 'accepted' && rel2.status !== 'accepted') {
    return null;
  }

  if (rel1.status !== 'accepted') {
    return rel2;
  }

  if (rel2.status !== 'accepted') {
    return rel1;
  }

  const prec1 = getRelationshipPrecedence(rel1.type);
  const prec2 = getRelationshipPrecedence(rel2.type);

  return prec1 >= prec2 ? rel1 : rel2;
}

async function getRelationshipsForPlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<Record<string, CachedRelationship>> {
  const cached = await getCachedRelationships(config, tenantId, playerId);
  if (cached) {
    return cached.relationships;
  }

  const db = getDatabaseClient(config);

  const relationships = await db.query.socialRelationships.findMany({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      or(
        eq(socialRelationships.requesterId, playerId),
        eq(socialRelationships.addresseeId, playerId),
      ),
    ),
  });

  const relationshipMap: Record<string, CachedRelationship> = {};

  for (const rel of relationships) {
    const otherPlayerId = rel.requesterId === playerId ? rel.addresseeId : rel.requesterId;

    const existing = relationshipMap[otherPlayerId];
    if (!existing) {
      relationshipMap[otherPlayerId] = {
        relationshipType: rel.relationshipType as RelationshipType,
        status: rel.status as RelationshipStatus,
        updatedAt: rel.updatedAt.getTime(),
      };
    } else {
      const resolved = resolveRelationship(
        { type: existing.relationshipType, status: existing.status },
        {
          type: rel.relationshipType as RelationshipType,
          status: rel.status as RelationshipStatus,
        },
      );
      if (resolved) {
        relationshipMap[otherPlayerId] = {
          relationshipType: resolved.type,
          status: resolved.status,
          updatedAt: Math.max(existing.updatedAt, rel.updatedAt.getTime()),
        };
      }
    }
  }

  await setCachedRelationships(config, tenantId, playerId, relationshipMap);

  return relationshipMap;
}

async function countRelationshipsByType(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  type: RelationshipType,
): Promise<number> {
  const db = getDatabaseClient(config);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(socialRelationships)
    .where(
      and(
        eq(socialRelationships.tenantId, tenantId),
        or(
          eq(socialRelationships.requesterId, playerId),
          eq(socialRelationships.addresseeId, playerId),
        ),
        eq(socialRelationships.relationshipType, type),
        eq(socialRelationships.status, 'accepted'),
      ),
    );

  return countResult[0]?.count ?? 0;
}

export async function sendFriendRequest(
  config: AppConfig,
  tenantId: string,
  input: FriendRequestInput,
): Promise<RelationshipResult> {
  if (input.requesterId === input.addresseeId) {
    return { success: false, error: 'Cannot send friend request to yourself' };
  }

  const db = getDatabaseClient(config);

  const existingRequest = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      or(
        and(
          eq(socialRelationships.requesterId, input.requesterId),
          eq(socialRelationships.addresseeId, input.addresseeId),
        ),
        and(
          eq(socialRelationships.requesterId, input.addresseeId),
          eq(socialRelationships.addresseeId, input.requesterId),
        ),
      ),
      eq(socialRelationships.relationshipType, 'friend'),
    ),
  });

  if (existingRequest) {
    if (existingRequest.status === 'accepted') {
      return { success: false, error: 'Already friends' };
    }
    if (existingRequest.status === 'pending') {
      return { success: false, error: 'Friend request already pending' };
    }
  }

  const blockExists = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      or(
        and(
          eq(socialRelationships.requesterId, input.requesterId),
          eq(socialRelationships.addresseeId, input.addresseeId),
        ),
        and(
          eq(socialRelationships.requesterId, input.addresseeId),
          eq(socialRelationships.addresseeId, input.requesterId),
        ),
      ),
      eq(socialRelationships.relationshipType, 'block'),
      eq(socialRelationships.status, 'accepted'),
    ),
  });

  if (blockExists) {
    return { success: false, error: 'Cannot send friend request to blocked player' };
  }

  const friendCount = await countRelationshipsByType(config, tenantId, input.requesterId, 'friend');
  if (friendCount >= MAX_FRIENDS) {
    return { success: false, error: `Maximum friends limit (${MAX_FRIENDS}) reached` };
  }

  const [relationship] = await db
    .insert(socialRelationships)
    .values({
      tenantId,
      requesterId: input.requesterId,
      addresseeId: input.addresseeId,
      relationshipType: 'friend',
      status: 'pending',
    })
    .returning();

  await invalidateBothPlayersRelationshipCache(
    config,
    tenantId,
    input.requesterId,
    input.addresseeId,
  );

  return { success: true, relationship };
}

export async function acceptFriendRequest(
  config: AppConfig,
  tenantId: string,
  addresseeId: string,
  requesterId: string,
): Promise<RelationshipResult> {
  if (addresseeId === requesterId) {
    return { success: false, error: 'Cannot accept friend request from yourself' };
  }

  const db = getDatabaseClient(config);

  const existingRequest = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.requesterId, requesterId),
      eq(socialRelationships.addresseeId, addresseeId),
      eq(socialRelationships.relationshipType, 'friend'),
      eq(socialRelationships.status, 'pending'),
    ),
  });

  if (!existingRequest) {
    return { success: false, error: 'Friend request not found' };
  }

  const [updatedRelationship] = await db
    .update(socialRelationships)
    .set({
      status: 'accepted',
      updatedAt: new Date(),
    })
    .where(eq(socialRelationships.relationshipId, existingRequest.relationshipId))
    .returning();

  const reverseRelationship = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.requesterId, addresseeId),
      eq(socialRelationships.addresseeId, requesterId),
      eq(socialRelationships.relationshipType, 'friend'),
    ),
  });

  if (!reverseRelationship) {
    await db.insert(socialRelationships).values({
      tenantId,
      requesterId: addresseeId,
      addresseeId: requesterId,
      relationshipType: 'friend',
      status: 'accepted',
    });
  } else if (reverseRelationship.status === 'pending') {
    await db
      .update(socialRelationships)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
      })
      .where(eq(socialRelationships.relationshipId, reverseRelationship.relationshipId));
  }

  await invalidateBothPlayersRelationshipCache(config, tenantId, requesterId, addresseeId);

  return { success: true, relationship: updatedRelationship };
}

export async function rejectFriendRequest(
  config: AppConfig,
  tenantId: string,
  addresseeId: string,
  requesterId: string,
): Promise<RelationshipResult> {
  if (addresseeId === requesterId) {
    return { success: false, error: 'Cannot reject friend request from yourself' };
  }

  const db = getDatabaseClient(config);

  const existingRequest = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.requesterId, requesterId),
      eq(socialRelationships.addresseeId, addresseeId),
      eq(socialRelationships.relationshipType, 'friend'),
      eq(socialRelationships.status, 'pending'),
    ),
  });

  if (!existingRequest) {
    return { success: false, error: 'Friend request not found' };
  }

  const [updated] = await db
    .update(socialRelationships)
    .set({
      status: 'rejected',
      updatedAt: new Date(),
    })
    .where(eq(socialRelationships.relationshipId, existingRequest.relationshipId))
    .returning();

  await invalidateBothPlayersRelationshipCache(config, tenantId, requesterId, addresseeId);

  return { success: true, relationship: updated };
}

export async function removeFriend(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  friendId: string,
): Promise<RelationshipResult> {
  if (playerId === friendId) {
    return { success: false, error: 'Cannot remove yourself as a friend' };
  }

  const db = getDatabaseClient(config);

  const relationships = await db.query.socialRelationships.findMany({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.relationshipType, 'friend'),
      eq(socialRelationships.status, 'accepted'),
      or(
        and(
          eq(socialRelationships.requesterId, playerId),
          eq(socialRelationships.addresseeId, friendId),
        ),
        and(
          eq(socialRelationships.requesterId, friendId),
          eq(socialRelationships.addresseeId, playerId),
        ),
      ),
    ),
  });

  if (relationships.length === 0) {
    return { success: false, error: 'Friendship not found' };
  }

  for (const rel of relationships) {
    await db
      .delete(socialRelationships)
      .where(eq(socialRelationships.relationshipId, rel.relationshipId));
  }

  await invalidateBothPlayersRelationshipCache(config, tenantId, playerId, friendId);

  return { success: true };
}

export async function listFriends(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<SocialRelationship[]> {
  const db = getDatabaseClient(config);

  const relationships = await db.query.socialRelationships.findMany({
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

  return relationships;
}

export async function listPendingFriendRequests(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<SocialRelationship[]> {
  const db = getDatabaseClient(config);

  const relationships = await db.query.socialRelationships.findMany({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.relationshipType, 'friend'),
      eq(socialRelationships.status, 'pending'),
      eq(socialRelationships.addresseeId, playerId),
    ),
  });

  return relationships;
}

export async function blockPlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot block yourself' };
  }

  const db = getDatabaseClient(config);

  const existingBlock = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.requesterId, playerId),
      eq(socialRelationships.addresseeId, targetPlayerId),
      eq(socialRelationships.relationshipType, 'block'),
      eq(socialRelationships.status, 'accepted'),
    ),
  });

  if (existingBlock) {
    return { success: false, error: 'Player already blocked' };
  }

  const blockCount = await countRelationshipsByType(config, tenantId, playerId, 'block');
  if (blockCount >= MAX_BLOCKED) {
    return { success: false, error: `Maximum blocked users limit (${MAX_BLOCKED}) reached` };
  }

  await db
    .delete(socialRelationships)
    .where(
      and(
        eq(socialRelationships.tenantId, tenantId),
        or(
          and(
            eq(socialRelationships.requesterId, playerId),
            eq(socialRelationships.addresseeId, targetPlayerId),
          ),
          and(
            eq(socialRelationships.requesterId, targetPlayerId),
            eq(socialRelationships.addresseeId, playerId),
          ),
        ),
        eq(socialRelationships.relationshipType, 'friend'),
      ),
    );

  const [relationship] = await db
    .insert(socialRelationships)
    .values({
      tenantId,
      requesterId: playerId,
      addresseeId: targetPlayerId,
      relationshipType: 'block',
      status: 'accepted',
    })
    .returning();

  await invalidateBothPlayersRelationshipCache(config, tenantId, playerId, targetPlayerId);

  return { success: true, relationship };
}

export async function unblockPlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot unblock yourself' };
  }

  const db = getDatabaseClient(config);

  const existingBlock = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.requesterId, playerId),
      eq(socialRelationships.addresseeId, targetPlayerId),
      eq(socialRelationships.relationshipType, 'block'),
      eq(socialRelationships.status, 'accepted'),
    ),
  });

  if (!existingBlock) {
    return { success: false, error: 'Block relationship not found' };
  }

  await db
    .delete(socialRelationships)
    .where(eq(socialRelationships.relationshipId, existingBlock.relationshipId));

  await invalidateBothPlayersRelationshipCache(config, tenantId, playerId, targetPlayerId);

  return { success: true };
}

export async function listBlockedPlayers(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<SocialRelationship[]> {
  const db = getDatabaseClient(config);

  const relationships = await db.query.socialRelationships.findMany({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.relationshipType, 'block'),
      eq(socialRelationships.status, 'accepted'),
      eq(socialRelationships.requesterId, playerId),
    ),
  });

  return relationships;
}

export async function mutePlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot mute yourself' };
  }

  const db = getDatabaseClient(config);

  const existingMute = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.requesterId, playerId),
      eq(socialRelationships.addresseeId, targetPlayerId),
      eq(socialRelationships.relationshipType, 'mute'),
      eq(socialRelationships.status, 'accepted'),
    ),
  });

  if (existingMute) {
    return { success: false, error: 'Player already muted' };
  }

  const muteCount = await countRelationshipsByType(config, tenantId, playerId, 'mute');
  if (muteCount >= MAX_MUTED) {
    return { success: false, error: `Maximum muted users limit (${MAX_MUTED}) reached` };
  }

  const [relationship] = await db
    .insert(socialRelationships)
    .values({
      tenantId,
      requesterId: playerId,
      addresseeId: targetPlayerId,
      relationshipType: 'mute',
      status: 'accepted',
    })
    .returning();

  await invalidateRelationshipCache(config, tenantId, playerId);

  return { success: true, relationship };
}

export async function unmutePlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot unmute yourself' };
  }

  const db = getDatabaseClient(config);

  const existingMute = await db.query.socialRelationships.findFirst({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.requesterId, playerId),
      eq(socialRelationships.addresseeId, targetPlayerId),
      eq(socialRelationships.relationshipType, 'mute'),
      eq(socialRelationships.status, 'accepted'),
    ),
  });

  if (!existingMute) {
    return { success: false, error: 'Mute relationship not found' };
  }

  await db
    .delete(socialRelationships)
    .where(eq(socialRelationships.relationshipId, existingMute.relationshipId));

  await invalidateRelationshipCache(config, tenantId, playerId);

  return { success: true };
}

export async function listMutedPlayers(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<SocialRelationship[]> {
  const db = getDatabaseClient(config);

  const relationships = await db.query.socialRelationships.findMany({
    where: and(
      eq(socialRelationships.tenantId, tenantId),
      eq(socialRelationships.relationshipType, 'mute'),
      eq(socialRelationships.status, 'accepted'),
      eq(socialRelationships.requesterId, playerId),
    ),
  });

  return relationships;
}

export async function getRelationshipStatus(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
): Promise<CachedRelationship | null> {
  const relationships = await getRelationshipsForPlayer(config, tenantId, playerId);
  return relationships[targetPlayerId] ?? null;
}

export async function getRelationshipCounts(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<RelationshipCount> {
  const [friends, blocked, muted] = await Promise.all([
    countRelationshipsByType(config, tenantId, playerId, 'friend'),
    countRelationshipsByType(config, tenantId, playerId, 'block'),
    countRelationshipsByType(config, tenantId, playerId, 'mute'),
  ]);

  return { friends, blocked, muted };
}
