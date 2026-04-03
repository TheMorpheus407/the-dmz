import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  party,
  partyMember,
  type Party,
  type PartyStatus,
  type Difficulty,
  type DeclaredRole,
} from '../../db/schema/multiplayer/index.js';
import {
  getCachedParty,
  setCachedParty,
  deleteCachedParty,
  type CachedParty,
} from '../../shared/cache/index.js';
import { evaluateFlag } from '../feature-flags/index.js';
import { getOrCreatePartyChannel } from '../chat/index.js';

import { createInviteCode, isInviteCodeValid } from './invite-code.js';

import type { AppConfig } from '../../config.js';

export interface PartyMemberResult {
  partyMemberId: string;
  playerId: string;
  role: 'leader' | 'member';
  readyStatus: boolean;
  declaredRole: DeclaredRole | null;
  joinedAt: Date;
}

export interface PartyResult {
  success: boolean;
  party?: Party & { members: PartyMemberResult[] };
  error?: string;
}

export interface CreatePartyInput {
  difficulty?: Difficulty;
  preferredRole?: DeclaredRole;
}

export interface JoinPartyInput {
  inviteCode: string;
}

export interface SetRoleInput {
  declaredRole: DeclaredRole;
}

const MIN_PARTY_SIZE = 2;
const MAX_PARTY_SIZE = 2;

async function getPartyWithMembers(
  config: AppConfig,
  tenantId: string,
  partyId: string,
): Promise<(Party & { members: PartyMemberResult[] }) | null> {
  const db = getDatabaseClient(config);

  const partyRow = await db.query.party.findFirst({
    where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
  });

  if (!partyRow) {
    return null;
  }

  const memberRows = await db.query.partyMember.findMany({
    where: eq(partyMember.partyId, partyId),
  });

  const members: PartyMemberResult[] = memberRows.map((m) => ({
    partyMemberId: m.partyMemberId,
    playerId: m.playerId,
    role: m.role as 'leader' | 'member',
    readyStatus: m.readyStatus,
    declaredRole: m.declaredRole as DeclaredRole | null,
    joinedAt: m.joinedAt,
  }));

  return { ...partyRow, members };
}

async function cacheParty(
  config: AppConfig,
  tenantId: string,
  partyData: Party & { members: PartyMemberResult[] },
): Promise<void> {
  const cached: CachedParty = {
    partyId: partyData.partyId,
    tenantId: partyData.tenantId,
    leaderId: partyData.leaderId,
    status: partyData.status as PartyStatus,
    difficulty: partyData.difficulty as Difficulty,
    members: partyData.members.map((m) => ({
      partyMemberId: m.partyMemberId,
      playerId: m.playerId,
      role: m.role,
      readyStatus: m.readyStatus,
      declaredRole: m.declaredRole,
    })),
    inviteCodeExpiresAt: partyData.inviteCodeExpiresAt
      ? partyData.inviteCodeExpiresAt.getTime()
      : null,
    updatedAt: partyData.updatedAt.getTime(),
  };

  await setCachedParty(config, tenantId, partyData.partyId, cached);
}

async function getPartyByPlayerId(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<Party | null> {
  const db = getDatabaseClient(config);

  const membership = await db.query.partyMember.findFirst({
    where: and(eq(partyMember.playerId, playerId)),
  });

  if (!membership) {
    return null;
  }

  const partyRow = await db.query.party.findFirst({
    where: and(eq(party.partyId, membership.partyId), eq(party.tenantId, tenantId)),
  });

  return partyRow ?? null;
}

export async function createParty(
  config: AppConfig,
  tenantId: string,
  leaderId: string,
  input: CreatePartyInput = {},
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const existingParty = await getPartyByPlayerId(config, tenantId, leaderId);
  if (existingParty) {
    return { success: false, error: 'Already in a party' };
  }

  const db = getDatabaseClient(config);
  const invite = createInviteCode();

  const [newParty] = await db
    .insert(party)
    .values({
      tenantId,
      leaderId,
      status: 'forming',
      difficulty: input.difficulty ?? 'standard',
      ...(input.preferredRole !== undefined && { preferredRole: input.preferredRole }),
      inviteCode: invite.code,
      inviteCodeExpiresAt: invite.expiresAt,
    })
    .returning();

  if (!newParty) {
    return { success: false, error: 'Failed to create party' };
  }

  const [member] = await db
    .insert(partyMember)
    .values({
      partyId: newParty.partyId,
      playerId: leaderId,
      role: 'leader',
      readyStatus: false,
      ...(input.preferredRole !== undefined && { declaredRole: input.preferredRole }),
    })
    .returning();

  if (!member) {
    await db.delete(party).where(eq(party.partyId, newParty.partyId));
    return { success: false, error: 'Failed to create party membership' };
  }

  const partyWithMembers = await getPartyWithMembers(config, tenantId, newParty.partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  await getOrCreatePartyChannel(config, tenantId, newParty.partyId);

  return { success: true, party: partyWithMembers };
}

export async function joinPartyByInviteCode(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  input: JoinPartyInput,
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const existingParty = await getPartyByPlayerId(config, tenantId, playerId);
  if (existingParty) {
    return { success: false, error: 'Already in a party' };
  }

  const db = getDatabaseClient(config);

  const targetParty = await db.query.party.findFirst({
    where: and(
      eq(party.inviteCode, input.inviteCode),
      eq(party.tenantId, tenantId),
      eq(party.status, 'forming'),
    ),
  });

  if (!targetParty) {
    return { success: false, error: 'Invalid invite code' };
  }

  if (!isInviteCodeValid(targetParty.inviteCode, targetParty.inviteCodeExpiresAt)) {
    return { success: false, error: 'Invite code has expired' };
  }

  const memberCount = await db.query.partyMember.findMany({
    where: eq(partyMember.partyId, targetParty.partyId),
  });

  if (memberCount.length >= MAX_PARTY_SIZE) {
    return { success: false, error: 'Party is full' };
  }

  const [newMember] = await db
    .insert(partyMember)
    .values({
      partyId: targetParty.partyId,
      playerId,
      role: 'member',
      readyStatus: false,
    })
    .returning();

  if (!newMember) {
    return { success: false, error: 'Failed to join party' };
  }

  const partyWithMembers = await getPartyWithMembers(config, tenantId, targetParty.partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  return { success: true, party: partyWithMembers };
}

export async function leaveParty(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  partyId: string,
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const db = getDatabaseClient(config);

  const targetParty = await db.query.party.findFirst({
    where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
  });

  if (!targetParty) {
    return { success: false, error: 'Party not found' };
  }

  if (targetParty.status === 'in_session') {
    return { success: false, error: 'Cannot leave party in session' };
  }

  const membership = await db.query.partyMember.findFirst({
    where: and(eq(partyMember.partyId, partyId), eq(partyMember.playerId, playerId)),
  });

  if (!membership) {
    return { success: false, error: 'Not a member of this party' };
  }

  if (membership.role === 'leader') {
    await db.delete(party).where(eq(party.partyId, partyId));
    await deleteCachedParty(config, tenantId, partyId);
    const partyAfterDelete = await getPartyWithMembers(config, tenantId, partyId);
    if (!partyAfterDelete) {
      return { success: true, party: { ...targetParty, members: [] } };
    }
    return { success: true, party: partyAfterDelete };
  }

  await db.delete(partyMember).where(eq(partyMember.partyMemberId, membership.partyMemberId));

  const partyWithMembers = await getPartyWithMembers(config, tenantId, partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  return { success: true, party: partyWithMembers };
}

export async function toggleReadyStatus(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  partyId: string,
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const db = getDatabaseClient(config);

  const targetParty = await db.query.party.findFirst({
    where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
  });

  if (!targetParty) {
    return { success: false, error: 'Party not found' };
  }

  if (targetParty.status === 'disbanded') {
    return { success: false, error: 'Party has been disbanded' };
  }

  const membership = await db.query.partyMember.findFirst({
    where: and(eq(partyMember.partyId, partyId), eq(partyMember.playerId, playerId)),
  });

  if (!membership) {
    return { success: false, error: 'Not a member of this party' };
  }

  const newReadyStatus = !membership.readyStatus;

  await db
    .update(partyMember)
    .set({ readyStatus: newReadyStatus })
    .where(eq(partyMember.partyMemberId, membership.partyMemberId));

  const allMembers = await db.query.partyMember.findMany({
    where: eq(partyMember.partyId, partyId),
  });

  const allReady = allMembers.length >= MIN_PARTY_SIZE && allMembers.every((m) => m.readyStatus);

  if (allReady && targetParty.status === 'forming') {
    await db
      .update(party)
      .set({ status: 'ready', updatedAt: new Date() })
      .where(eq(party.partyId, partyId));
  } else if (!allReady && targetParty.status === 'ready') {
    await db
      .update(party)
      .set({ status: 'forming', updatedAt: new Date() })
      .where(eq(party.partyId, partyId));
  }

  const partyWithMembers = await getPartyWithMembers(config, tenantId, partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  return { success: true, party: partyWithMembers };
}

export async function setDeclaredRole(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  partyId: string,
  input: SetRoleInput,
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const db = getDatabaseClient(config);

  const targetParty = await db.query.party.findFirst({
    where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
  });

  if (!targetParty) {
    return { success: false, error: 'Party not found' };
  }

  const membership = await db.query.partyMember.findFirst({
    where: and(eq(partyMember.partyId, partyId), eq(partyMember.playerId, playerId)),
  });

  if (!membership) {
    return { success: false, error: 'Not a member of this party' };
  }

  await db
    .update(partyMember)
    .set({ declaredRole: input.declaredRole })
    .where(eq(partyMember.partyMemberId, membership.partyMemberId));

  const partyWithMembers = await getPartyWithMembers(config, tenantId, partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  return { success: true, party: partyWithMembers };
}

export async function launchParty(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  partyId: string,
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const db = getDatabaseClient(config);

  const targetParty = await db.query.party.findFirst({
    where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
  });

  if (!targetParty) {
    return { success: false, error: 'Party not found' };
  }

  if (targetParty.leaderId !== playerId) {
    return { success: false, error: 'Only the party leader can launch' };
  }

  if (targetParty.status === 'in_session') {
    return { success: false, error: 'Party is already in session' };
  }

  if (targetParty.status === 'disbanded') {
    return { success: false, error: 'Party has been disbanded' };
  }

  const allMembers = await db.query.partyMember.findMany({
    where: eq(partyMember.partyId, partyId),
  });

  if (allMembers.length < MIN_PARTY_SIZE) {
    return { success: false, error: 'Not enough party members to launch' };
  }

  const allReady = allMembers.every((m) => m.readyStatus);
  if (!allReady) {
    return { success: false, error: 'All party members must be ready to launch' };
  }

  await db
    .update(party)
    .set({ status: 'in_session', updatedAt: new Date() })
    .where(eq(party.partyId, partyId));

  const partyWithMembers = await getPartyWithMembers(config, tenantId, partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  return { success: true, party: partyWithMembers };
}

export async function getParty(
  config: AppConfig,
  tenantId: string,
  partyId: string,
): Promise<PartyResult> {
  const cached = await getCachedParty(config, tenantId, partyId);
  if (cached) {
    const db = getDatabaseClient(config);
    const partyRow = await db.query.party.findFirst({
      where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
    });
    if (!partyRow) {
      return { success: false, error: 'Party not found' };
    }

    const dbMembers = await db.query.partyMember.findMany({
      where: eq(partyMember.partyId, partyId),
    });

    const members: PartyMemberResult[] = dbMembers.map((m) => ({
      partyMemberId: m.partyMemberId,
      playerId: m.playerId,
      role: m.role as 'leader' | 'member',
      readyStatus: m.readyStatus,
      declaredRole: m.declaredRole as DeclaredRole | null,
      joinedAt: m.joinedAt,
    }));

    return { success: true, party: { ...partyRow, members } };
  }

  const partyWithMembers = await getPartyWithMembers(config, tenantId, partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Party not found' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  return { success: true, party: partyWithMembers };
}

export async function disbandParty(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  partyId: string,
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const db = getDatabaseClient(config);

  const targetParty = await db.query.party.findFirst({
    where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
  });

  if (!targetParty) {
    return { success: false, error: 'Party not found' };
  }

  if (targetParty.leaderId !== playerId) {
    return { success: false, error: 'Only the party leader can disband' };
  }

  if (targetParty.status === 'in_session') {
    return { success: false, error: 'Cannot disband party in session' };
  }

  await db
    .update(party)
    .set({ status: 'disbanded', updatedAt: new Date() })
    .where(eq(party.partyId, partyId));

  await deleteCachedParty(config, tenantId, partyId);

  const partyWithMembers = await getPartyWithMembers(config, tenantId, partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  return { success: true, party: partyWithMembers };
}

export async function regenerateInviteCode(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  partyId: string,
): Promise<PartyResult> {
  const partyEnabled = await evaluateFlag(config, tenantId, 'multiplayer.party_enabled');
  if (!partyEnabled) {
    return { success: false, error: 'Party system is disabled' };
  }

  const db = getDatabaseClient(config);

  const targetParty = await db.query.party.findFirst({
    where: and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)),
  });

  if (!targetParty) {
    return { success: false, error: 'Party not found' };
  }

  if (targetParty.leaderId !== playerId) {
    return { success: false, error: 'Only the party leader can regenerate invite code' };
  }

  if (targetParty.status !== 'forming') {
    return {
      success: false,
      error: 'Cannot regenerate invite code for party not in forming status',
    };
  }

  const invite = createInviteCode();

  await db
    .update(party)
    .set({ inviteCode: invite.code, inviteCodeExpiresAt: invite.expiresAt, updatedAt: new Date() })
    .where(eq(party.partyId, partyId));

  const partyWithMembers = await getPartyWithMembers(config, tenantId, partyId);
  if (!partyWithMembers) {
    return { success: false, error: 'Failed to retrieve party' };
  }

  await cacheParty(config, tenantId, partyWithMembers);

  return { success: true, party: partyWithMembers };
}
