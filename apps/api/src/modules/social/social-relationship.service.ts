import { getDatabaseClient } from '../../shared/database/connection.js';
import { MAX_FRIENDS, MAX_BLOCKED, MAX_MUTED } from '../../db/schema/social/index.js';
import {
  getCachedRelationships,
  setCachedRelationships,
  invalidateRelationshipCache,
  invalidateBothPlayersRelationshipCache,
  type CachedRelationship,
} from '../../shared/cache/index.js';

import { SocialRelationshipRepository } from './social-relationship.repository.js';

import type {
  RelationshipType,
  RelationshipStatus,
  SocialRelationship,
} from '../../db/schema/social/index.js';
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
  repository?: SocialRelationshipRepository,
): Promise<Record<string, CachedRelationship>> {
  const cached = await getCachedRelationships(config, tenantId, playerId);
  if (cached) {
    return cached.relationships;
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const relationships = await repo.findRelationshipsForPlayer({ tenantId, playerId });

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
  repository?: SocialRelationshipRepository,
): Promise<number> {
  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));
  return repo.countByType({ tenantId, playerId, type });
}

export async function sendFriendRequest(
  config: AppConfig,
  tenantId: string,
  input: FriendRequestInput,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (input.requesterId === input.addresseeId) {
    return { success: false, error: 'Cannot send friend request to yourself' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const existingRequest = await repo.findFriendRequestBetweenPlayers({
    tenantId,
    playerId1: input.requesterId,
    playerId2: input.addresseeId,
  });

  if (existingRequest) {
    if (existingRequest.status === 'accepted') {
      return { success: false, error: 'Already friends' };
    }
    if (existingRequest.status === 'pending') {
      return { success: false, error: 'Friend request already pending' };
    }
  }

  const blockExists = await repo.findBlockBetweenPlayers({
    tenantId,
    playerId1: input.requesterId,
    playerId2: input.addresseeId,
  });

  if (blockExists) {
    return { success: false, error: 'Cannot send friend request to blocked player' };
  }

  const friendCount = await countRelationshipsByType(
    config,
    tenantId,
    input.requesterId,
    'friend',
    repo,
  );
  if (friendCount >= MAX_FRIENDS) {
    return { success: false, error: `Maximum friends limit (${MAX_FRIENDS}) reached` };
  }

  const relationship = await repo.createRelationship({
    tenantId,
    requesterId: input.requesterId,
    addresseeId: input.addresseeId,
    relationshipType: 'friend',
    status: 'pending',
  });

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
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (addresseeId === requesterId) {
    return { success: false, error: 'Cannot accept friend request from yourself' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const existingRequest = await repo.findPendingFriendRequest({
    tenantId,
    requesterId,
    addresseeId,
  });

  if (!existingRequest) {
    return { success: false, error: 'Friend request not found' };
  }

  const updatedRelationship = await repo.updateRelationship({
    relationshipId: existingRequest.relationshipId,
    status: 'accepted',
  });

  const reverseRelationship = await repo.findFriendRequestBetweenPlayers({
    tenantId,
    playerId1: addresseeId,
    playerId2: requesterId,
  });

  if (!reverseRelationship) {
    await repo.createRelationship({
      tenantId,
      requesterId: addresseeId,
      addresseeId: requesterId,
      relationshipType: 'friend',
      status: 'accepted',
    });
  } else if (reverseRelationship.status === 'pending') {
    await repo.updateRelationship({
      relationshipId: reverseRelationship.relationshipId,
      status: 'accepted',
    });
  }

  await invalidateBothPlayersRelationshipCache(config, tenantId, requesterId, addresseeId);

  return { success: true, relationship: updatedRelationship };
}

export async function rejectFriendRequest(
  config: AppConfig,
  tenantId: string,
  addresseeId: string,
  requesterId: string,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (addresseeId === requesterId) {
    return { success: false, error: 'Cannot reject friend request from yourself' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const existingRequest = await repo.findPendingFriendRequest({
    tenantId,
    requesterId,
    addresseeId,
  });

  if (!existingRequest) {
    return { success: false, error: 'Friend request not found' };
  }

  const updated = await repo.updateRelationship({
    relationshipId: existingRequest.relationshipId,
    status: 'rejected',
  });

  await invalidateBothPlayersRelationshipCache(config, tenantId, requesterId, addresseeId);

  return { success: true, relationship: updated };
}

export async function removeFriend(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  friendId: string,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (playerId === friendId) {
    return { success: false, error: 'Cannot remove yourself as a friend' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const relationships = await repo.findFriendship({ tenantId, playerId, friendId });

  if (relationships.length === 0) {
    return { success: false, error: 'Friendship not found' };
  }

  const ids = relationships.map((rel) => rel.relationshipId);
  await repo.deleteRelationships({ relationshipIds: ids });

  await invalidateBothPlayersRelationshipCache(config, tenantId, playerId, friendId);

  return { success: true };
}

export async function listFriends(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  repository?: SocialRelationshipRepository,
): Promise<SocialRelationship[]> {
  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const relationships = await repo.findFriendRequestsForPlayer({
    tenantId,
    playerId,
    status: 'accepted',
  });

  return relationships;
}

export async function listPendingFriendRequests(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  repository?: SocialRelationshipRepository,
): Promise<SocialRelationship[]> {
  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const relationships = await repo.findFriendRequestsForPlayer({
    tenantId,
    playerId,
    status: 'pending',
  });

  return relationships;
}

export async function blockPlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot block yourself' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const existingBlock = await repo.findExistingRelationship({
    tenantId,
    playerId,
    targetPlayerId,
    relationshipType: 'block',
  });

  if (existingBlock) {
    return { success: false, error: 'Player already blocked' };
  }

  const blockCount = await countRelationshipsByType(config, tenantId, playerId, 'block', repo);
  if (blockCount >= MAX_BLOCKED) {
    return { success: false, error: `Maximum blocked users limit (${MAX_BLOCKED}) reached` };
  }

  await repo.deleteFriendShipsBetweenPlayers({ tenantId, playerId, targetPlayerId });

  const relationship = await repo.createRelationship({
    tenantId,
    requesterId: playerId,
    addresseeId: targetPlayerId,
    relationshipType: 'block',
    status: 'accepted',
  });

  await invalidateBothPlayersRelationshipCache(config, tenantId, playerId, targetPlayerId);

  return { success: true, relationship };
}

export async function unblockPlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot unblock yourself' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const existingBlock = await repo.findExistingRelationship({
    tenantId,
    playerId,
    targetPlayerId,
    relationshipType: 'block',
  });

  if (!existingBlock) {
    return { success: false, error: 'Block relationship not found' };
  }

  await repo.deleteRelationship({ relationshipId: existingBlock.relationshipId });

  await invalidateBothPlayersRelationshipCache(config, tenantId, playerId, targetPlayerId);

  return { success: true };
}

export async function listBlockedPlayers(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  repository?: SocialRelationshipRepository,
): Promise<SocialRelationship[]> {
  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const relationships = await repo.findBlockedPlayers({ tenantId, playerId });

  return relationships;
}

export async function mutePlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot mute yourself' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const existingMute = await repo.findMuteRelationship({
    tenantId,
    playerId,
    targetPlayerId,
    relationshipType: 'mute',
  });

  if (existingMute) {
    return { success: false, error: 'Player already muted' };
  }

  const muteCount = await countRelationshipsByType(config, tenantId, playerId, 'mute', repo);
  if (muteCount >= MAX_MUTED) {
    return { success: false, error: `Maximum muted users limit (${MAX_MUTED}) reached` };
  }

  const relationship = await repo.createRelationship({
    tenantId,
    requesterId: playerId,
    addresseeId: targetPlayerId,
    relationshipType: 'mute',
    status: 'accepted',
  });

  await invalidateRelationshipCache(config, tenantId, playerId);

  return { success: true, relationship };
}

export async function unmutePlayer(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipResult> {
  if (playerId === targetPlayerId) {
    return { success: false, error: 'Cannot unmute yourself' };
  }

  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const existingMute = await repo.findMuteRelationship({
    tenantId,
    playerId,
    targetPlayerId,
    relationshipType: 'mute',
  });

  if (!existingMute) {
    return { success: false, error: 'Mute relationship not found' };
  }

  await repo.deleteRelationship({ relationshipId: existingMute.relationshipId });

  await invalidateRelationshipCache(config, tenantId, playerId);

  return { success: true };
}

export async function listMutedPlayers(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  repository?: SocialRelationshipRepository,
): Promise<SocialRelationship[]> {
  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const relationships = await repo.findMutedPlayers({ tenantId, playerId });

  return relationships;
}

export async function getRelationshipStatus(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  targetPlayerId: string,
  repository?: SocialRelationshipRepository,
): Promise<CachedRelationship | null> {
  const relationships = await getRelationshipsForPlayer(config, tenantId, playerId, repository);
  return relationships[targetPlayerId] ?? null;
}

export async function getRelationshipCounts(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  repository?: SocialRelationshipRepository,
): Promise<RelationshipCount> {
  const repo = repository ?? new SocialRelationshipRepository(getDatabaseClient(config));

  const [friends, blocked, muted] = await Promise.all([
    countRelationshipsByType(config, tenantId, playerId, 'friend', repo),
    countRelationshipsByType(config, tenantId, playerId, 'block', repo),
    countRelationshipsByType(config, tenantId, playerId, 'mute', repo),
  ]);

  return { friends, blocked, muted };
}
