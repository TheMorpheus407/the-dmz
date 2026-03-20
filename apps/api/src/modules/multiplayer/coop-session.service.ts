import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  coopSession,
  coopRoleAssignment,
  coopDecisionProposal,
  type CoopSession,
  type CoopSessionStatus,
  type CoopRole,
} from '../../db/schema/multiplayer/index.js';
import { party } from '../../db/schema/multiplayer/index.js';
import {
  getCachedCoopSession,
  setCachedCoopSession,
  deleteCachedCoopSession,
  type CachedCoopSession,
} from '../../shared/cache/index.js';
import { evaluateFlag } from '../feature-flags/feature-flags.service.js'; // eslint-disable-line import-x/no-restricted-paths
import { generateId } from '../../shared/utils/id.js';

import {
  createCoopSessionCreatedEvent,
  createCoopRoleAssignedEvent,
  createCoopAuthorityTransferredEvent,
  createCoopProposalSubmittedEvent,
  createCoopProposalConfirmedEvent,
  createCoopProposalOverriddenEvent,
  createCoopDayAdvancedEvent,
  createCoopSessionEndedEvent,
} from './coop-session.events.js';

import type { AppConfig } from '../../config.js';
import type { IEventBus } from '../../shared/events/event-types.js';

export interface CoopSessionResult {
  success: boolean;
  session?: CoopSessionWithRoles;
  error?: string;
}

export interface CoopSessionWithRoles extends CoopSession {
  roles: CoopRoleAssignmentResult[];
}

export interface CoopRoleAssignmentResult {
  assignmentId: string;
  playerId: string;
  role: CoopRole;
  isAuthority: boolean;
  assignedAt: Date;
}

export interface CreateCoopSessionInput {
  partyId: string;
  seed: string;
}

export interface AssignRolesInput {
  player1Id: string;
  player2Id: string;
}

export interface SubmitProposalInput {
  playerId: string;
  role: CoopRole;
  emailId: string;
  action: string;
}

export interface AuthorityActionInput {
  proposalId: string;
  action: 'confirm' | 'override';
  rationale?: string | undefined;
  conflictReason?: string | undefined;
}

async function getSessionWithRoles(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
): Promise<CoopSessionWithRoles | null> {
  const db = getDatabaseClient(config);

  const sessionRow = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!sessionRow) {
    return null;
  }

  const roleRows = await db.query.coopRoleAssignment.findMany({
    where: eq(coopRoleAssignment.sessionId, sessionId),
  });

  const roles: CoopRoleAssignmentResult[] = roleRows.map((r) => ({
    assignmentId: r.assignmentId,
    playerId: r.playerId,
    role: r.role as CoopRole,
    isAuthority: r.isAuthority,
    assignedAt: r.assignedAt,
  }));

  return { ...sessionRow, roles };
}

async function cacheSession(
  config: AppConfig,
  tenantId: string,
  sessionData: CoopSessionWithRoles,
): Promise<void> {
  const cached: CachedCoopSession = {
    sessionId: sessionData.sessionId,
    tenantId: sessionData.tenantId,
    partyId: sessionData.partyId,
    seed: sessionData.seed,
    status: sessionData.status as CoopSessionStatus,
    authorityPlayerId: sessionData.authorityPlayerId,
    dayNumber: sessionData.dayNumber,
    roles: sessionData.roles.map((r) => ({
      assignmentId: r.assignmentId,
      playerId: r.playerId,
      role: r.role,
      isAuthority: r.isAuthority,
    })),
    updatedAt: Date.now(),
  };

  await setCachedCoopSession(config, tenantId, sessionData.sessionId, cached);
}

function emitSessionCreated(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  session: CoopSessionWithRoles,
): void {
  const event = createCoopSessionCreatedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId: session.sessionId,
      partyId: session.partyId,
      authorityPlayerId: session.authorityPlayerId!,
      seed: session.seed,
      dayNumber: session.dayNumber,
    },
  });
  eventBus.publish(event);
}

function emitRoleAssigned(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  session: CoopSessionWithRoles,
): void {
  const event = createCoopRoleAssignedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId: session.sessionId,
      roles: session.roles.map((r) => ({
        playerId: r.playerId,
        role: r.role,
        isAuthority: r.isAuthority,
      })),
    },
  });
  eventBus.publish(event);
}

function emitAuthorityTransferred(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  session: CoopSessionWithRoles,
  previousAuthorityId: string,
): void {
  const event = createCoopAuthorityTransferredEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId: session.sessionId,
      previousAuthorityPlayerId: previousAuthorityId,
      newAuthorityPlayerId: session.authorityPlayerId!,
      transferredBy: userId,
    },
  });
  eventBus.publish(event);
}

function emitProposalSubmitted(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  sessionId: string,
  proposalId: string,
  playerId: string,
  role: CoopRole,
  emailId: string,
  action: string,
): void {
  const event = createCoopProposalSubmittedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId,
      proposalId,
      playerId,
      role,
      emailId,
      action,
    },
  });
  eventBus.publish(event);
}

function emitProposalConfirmed(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  sessionId: string,
  proposalId: string,
  playerId: string,
  authorityPlayerId: string,
  action: string,
): void {
  const event = createCoopProposalConfirmedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId,
      proposalId,
      playerId,
      authorityPlayerId,
      action,
    },
  });
  eventBus.publish(event);
}

function emitProposalOverridden(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  sessionId: string,
  proposalId: string,
  playerId: string,
  authorityPlayerId: string,
  conflictReason?: string,
): void {
  const event = createCoopProposalOverriddenEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId,
      proposalId,
      playerId,
      authorityPlayerId,
      ...(conflictReason !== undefined ? { conflictReason } : {}),
    },
  });
  eventBus.publish(event);
}

function emitDayAdvanced(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  session: CoopSessionWithRoles,
  previousAuthorityId: string,
): void {
  const event = createCoopDayAdvancedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId: session.sessionId,
      dayNumber: session.dayNumber,
      previousAuthorityPlayerId: previousAuthorityId,
      newAuthorityPlayerId: session.authorityPlayerId!,
      advancedBy: userId,
    },
  });
  eventBus.publish(event);
}

function emitSessionEnded(
  eventBus: IEventBus,
  tenantId: string,
  userId: string,
  session: CoopSessionWithRoles,
  status: 'completed' | 'abandoned',
): void {
  const event = createCoopSessionEndedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId: session.sessionId,
      partyId: session.partyId,
      endedBy: userId,
      status,
    },
  });
  eventBus.publish(event);
}

export async function createCoopSession(
  config: AppConfig,
  tenantId: string,
  leaderId: string,
  input: CreateCoopSessionInput,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const existingSession = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.partyId, input.partyId), eq(coopSession.tenantId, tenantId)),
  });

  if (existingSession) {
    return { success: false, error: 'Co-op session already exists for this party' };
  }

  const [newSession] = await db
    .insert(coopSession)
    .values({
      tenantId,
      partyId: input.partyId,
      seed: input.seed,
      status: 'lobby',
      authorityPlayerId: leaderId,
      dayNumber: 1,
    })
    .returning();

  if (!newSession) {
    return { success: false, error: 'Failed to create co-op session' };
  }

  await db
    .update(party)
    .set({ status: 'in_session', updatedAt: new Date() })
    .where(and(eq(party.partyId, input.partyId), eq(party.tenantId, tenantId)));

  const sessionWithRoles = await getSessionWithRoles(config, tenantId, newSession.sessionId);
  if (!sessionWithRoles) {
    return { success: false, error: 'Failed to retrieve co-op session' };
  }

  await cacheSession(config, tenantId, sessionWithRoles);

  emitSessionCreated(eventBus, tenantId, leaderId, sessionWithRoles);

  return { success: true, session: sessionWithRoles };
}

export async function getCoopSession(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  _eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const cached = await getCachedCoopSession(config, tenantId, sessionId);
  if (cached) {
    const db = getDatabaseClient(config);
    const sessionRow = await db.query.coopSession.findFirst({
      where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
    });

    if (!sessionRow) {
      return { success: false, error: 'Co-op session not found' };
    }

    const roleRows = await db.query.coopRoleAssignment.findMany({
      where: eq(coopRoleAssignment.sessionId, sessionId),
    });

    const roles: CoopRoleAssignmentResult[] = roleRows.map((r) => ({
      assignmentId: r.assignmentId,
      playerId: r.playerId,
      role: r.role as CoopRole,
      isAuthority: r.isAuthority,
      assignedAt: r.assignedAt,
    }));

    return { success: true, session: { ...sessionRow, roles } };
  }

  const sessionWithRoles = await getSessionWithRoles(config, tenantId, sessionId);
  if (!sessionWithRoles) {
    return { success: false, error: 'Co-op session not found' };
  }

  await cacheSession(config, tenantId, sessionWithRoles);

  return { success: true, session: sessionWithRoles };
}

export async function assignRoles(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  _playerId: string,
  input: AssignRolesInput,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.status !== 'lobby') {
    return { success: false, error: 'Can only assign roles in lobby status' };
  }

  await db.delete(coopRoleAssignment).where(eq(coopRoleAssignment.sessionId, sessionId));

  const isPlayer1Authority = session.authorityPlayerId === input.player1Id;

  await db.insert(coopRoleAssignment).values([
    {
      sessionId,
      playerId: input.player1Id,
      role: 'triage_lead',
      isAuthority: isPlayer1Authority,
    },
    {
      sessionId,
      playerId: input.player2Id,
      role: 'verification_lead',
      isAuthority: !isPlayer1Authority,
    },
  ]);

  await db
    .update(coopSession)
    .set({ status: 'active' })
    .where(eq(coopSession.sessionId, sessionId));

  const sessionWithRoles = await getSessionWithRoles(config, tenantId, sessionId);
  if (!sessionWithRoles) {
    return { success: false, error: 'Failed to retrieve co-op session' };
  }

  await cacheSession(config, tenantId, sessionWithRoles);

  emitRoleAssigned(eventBus, tenantId, input.player1Id, sessionWithRoles);

  return { success: true, session: sessionWithRoles };
}

export async function rotateAuthority(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.authorityPlayerId !== playerId) {
    return { success: false, error: 'Only the current authority can transfer authority' };
  }

  const roles = await db.query.coopRoleAssignment.findMany({
    where: eq(coopRoleAssignment.sessionId, sessionId),
  });

  const otherRole = roles.find((r) => r.playerId !== playerId);
  if (!otherRole) {
    return { success: false, error: 'No other player to transfer authority to' };
  }

  const previousAuthorityId = session.authorityPlayerId;

  await db
    .update(coopRoleAssignment)
    .set({ isAuthority: false })
    .where(
      and(eq(coopRoleAssignment.sessionId, sessionId), eq(coopRoleAssignment.isAuthority, true)),
    );

  await db
    .update(coopRoleAssignment)
    .set({ isAuthority: true })
    .where(eq(coopRoleAssignment.assignmentId, otherRole.assignmentId));

  await db
    .update(coopSession)
    .set({ authorityPlayerId: otherRole.playerId })
    .where(eq(coopSession.sessionId, sessionId));

  const sessionWithRoles = await getSessionWithRoles(config, tenantId, sessionId);
  if (!sessionWithRoles) {
    return { success: false, error: 'Failed to retrieve co-op session' };
  }

  await cacheSession(config, tenantId, sessionWithRoles);

  emitAuthorityTransferred(eventBus, tenantId, playerId, sessionWithRoles, previousAuthorityId);

  return { success: true, session: sessionWithRoles };
}

export async function submitProposal(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  input: SubmitProposalInput,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.status !== 'active') {
    return { success: false, error: 'Can only submit proposals in active session' };
  }

  const roleAssignment = await db.query.coopRoleAssignment.findFirst({
    where: and(
      eq(coopRoleAssignment.sessionId, sessionId),
      eq(coopRoleAssignment.playerId, playerId),
    ),
  });

  if (!roleAssignment) {
    return { success: false, error: 'Player is not part of this co-op session' };
  }

  const [proposal] = await db
    .insert(coopDecisionProposal)
    .values({
      sessionId,
      playerId,
      role: roleAssignment.role,
      emailId: input.emailId,
      action: input.action,
      status: 'proposed',
      conflictFlag: false,
    })
    .returning();

  if (!proposal) {
    return { success: false, error: 'Failed to submit proposal' };
  }

  await deleteCachedCoopSession(config, tenantId, sessionId);

  emitProposalSubmitted(
    eventBus,
    tenantId,
    playerId,
    sessionId,
    proposal.proposalId,
    playerId,
    roleAssignment.role as CoopRole,
    input.emailId,
    input.action,
  );

  return getCoopSession(config, tenantId, sessionId, eventBus);
}

export async function authorityConfirm(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  input: AuthorityActionInput,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.authorityPlayerId !== playerId) {
    return { success: false, error: 'Only the authority can confirm proposals' };
  }

  const proposal = await db.query.coopDecisionProposal.findFirst({
    where: and(
      eq(coopDecisionProposal.proposalId, input.proposalId),
      eq(coopDecisionProposal.sessionId, sessionId),
    ),
  });

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (proposal.playerId === playerId) {
    return { success: false, error: 'Authority cannot finalize own proposal' };
  }

  if (proposal.status !== 'proposed') {
    return { success: false, error: 'Proposal is not in proposed status' };
  }

  await db
    .update(coopDecisionProposal)
    .set({
      status: 'confirmed',
      authorityAction: 'confirm',
      resolvedAt: new Date(),
    })
    .where(eq(coopDecisionProposal.proposalId, input.proposalId));

  await deleteCachedCoopSession(config, tenantId, sessionId);

  emitProposalConfirmed(
    eventBus,
    tenantId,
    playerId,
    sessionId,
    input.proposalId,
    proposal.playerId,
    playerId,
    proposal.action,
  );

  return getCoopSession(config, tenantId, sessionId, eventBus);
}

export async function authorityOverride(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  input: AuthorityActionInput,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.authorityPlayerId !== playerId) {
    return { success: false, error: 'Only the authority can override proposals' };
  }

  const proposal = await db.query.coopDecisionProposal.findFirst({
    where: and(
      eq(coopDecisionProposal.proposalId, input.proposalId),
      eq(coopDecisionProposal.sessionId, sessionId),
    ),
  });

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (proposal.playerId === playerId) {
    return { success: false, error: 'Authority cannot override own proposal' };
  }

  if (proposal.status !== 'proposed') {
    return { success: false, error: 'Proposal is not in proposed status' };
  }

  await db
    .update(coopDecisionProposal)
    .set({
      status: 'overridden',
      authorityAction: 'override',
      conflictFlag: true,
      conflictReason: input.conflictReason ?? null,
      rationale: input.rationale ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(coopDecisionProposal.proposalId, input.proposalId));

  await deleteCachedCoopSession(config, tenantId, sessionId);

  emitProposalOverridden(
    eventBus,
    tenantId,
    playerId,
    sessionId,
    input.proposalId,
    proposal.playerId,
    playerId,
    input.conflictReason,
  );

  return getCoopSession(config, tenantId, sessionId, eventBus);
}

export async function advanceDay(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.authorityPlayerId !== playerId) {
    return { success: false, error: 'Only the authority can advance the day' };
  }

  if (session.status !== 'active') {
    return { success: false, error: 'Can only advance day in active session' };
  }

  const roles = await db.query.coopRoleAssignment.findMany({
    where: eq(coopRoleAssignment.sessionId, sessionId),
  });

  const otherRole = roles.find((r) => r.playerId !== playerId);

  const previousAuthorityId = session.authorityPlayerId;

  await db
    .update(coopRoleAssignment)
    .set({ isAuthority: false })
    .where(
      and(eq(coopRoleAssignment.sessionId, sessionId), eq(coopRoleAssignment.isAuthority, true)),
    );

  if (otherRole) {
    await db
      .update(coopRoleAssignment)
      .set({ isAuthority: true })
      .where(eq(coopRoleAssignment.assignmentId, otherRole.assignmentId));
  }

  await db
    .update(coopSession)
    .set({
      dayNumber: session.dayNumber + 1,
      authorityPlayerId: otherRole?.playerId ?? session.authorityPlayerId,
    })
    .where(eq(coopSession.sessionId, sessionId));

  const sessionWithRoles = await getSessionWithRoles(config, tenantId, sessionId);
  if (!sessionWithRoles) {
    return { success: false, error: 'Failed to retrieve co-op session' };
  }

  await cacheSession(config, tenantId, sessionWithRoles);

  emitDayAdvanced(eventBus, tenantId, playerId, sessionWithRoles, previousAuthorityId);

  return { success: true, session: sessionWithRoles };
}

export async function endCoopSession(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.authorityPlayerId !== playerId) {
    return { success: false, error: 'Only the authority can end the session' };
  }

  if (session.status === 'completed' || session.status === 'abandoned') {
    return { success: false, error: 'Session is already terminated' };
  }

  await db
    .update(coopSession)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(coopSession.sessionId, sessionId));

  const sessionWithRoles = await getSessionWithRoles(config, tenantId, sessionId);
  if (!sessionWithRoles) {
    return { success: false, error: 'Failed to retrieve co-op session' };
  }

  await deleteCachedCoopSession(config, tenantId, sessionId);

  emitSessionEnded(eventBus, tenantId, playerId, sessionWithRoles, 'completed');

  return { success: true, session: sessionWithRoles };
}

export async function abandonCoopSession(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  eventBus: IEventBus,
): Promise<CoopSessionResult> {
  const coopEnabled = await evaluateFlag(config, tenantId, 'multiplayer.coop_enabled');
  if (!coopEnabled) {
    return { success: false, error: 'Co-op system is disabled' };
  }

  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  const roleAssignment = await db.query.coopRoleAssignment.findFirst({
    where: and(
      eq(coopRoleAssignment.sessionId, sessionId),
      eq(coopRoleAssignment.playerId, playerId),
    ),
  });

  if (!roleAssignment) {
    return { success: false, error: 'Player is not part of this co-op session' };
  }

  if (session.status === 'completed' || session.status === 'abandoned') {
    return { success: false, error: 'Session is already terminated' };
  }

  await db
    .update(coopSession)
    .set({ status: 'abandoned', completedAt: new Date() })
    .where(eq(coopSession.sessionId, sessionId));

  const sessionWithRoles = await getSessionWithRoles(config, tenantId, sessionId);
  if (!sessionWithRoles) {
    return { success: false, error: 'Failed to retrieve co-op session' };
  }

  await deleteCachedCoopSession(config, tenantId, sessionId);

  emitSessionEnded(eventBus, tenantId, playerId, sessionWithRoles, 'abandoned');

  return { success: true, session: sessionWithRoles };
}
