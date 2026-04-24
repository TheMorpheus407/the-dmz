import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  coopSession,
  coopRoleAssignment,
  coopDecisionProposal,
  type CoopDecisionProposal,
} from '../../db/schema/multiplayer/index.js';
import { deleteCachedCoopSession } from '../../shared/cache/index.js';
import { generateId } from '../../shared/utils/id.js';

import { validateRationale } from './authority-token.service.js';
import {
  createArbitrationProposalCreatedEvent,
  createArbitrationProposalConfirmedEvent,
  createArbitrationProposalOverriddenEvent,
  createArbitrationProposalExpiredEvent,
  createArbitrationProposalConsensusEvent,
} from './arbitration.events.js';

import type { AppConfig } from '../../config.js';
import type { EventBus } from '../../shared/events/event-types.js';

export type ProposalStatus =
  | 'proposed'
  | 'confirmed'
  | 'overridden'
  | 'withdrawn'
  | 'expired'
  | 'consensus';

export interface SubmitArbitrationProposalInput {
  playerId: string;
  role: string;
  emailId: string;
  action: string;
}

export interface AuthorityArbitrateInput {
  proposalId: string;
  action: 'confirm' | 'override';
  rationale?: string;
  conflictReason?: string;
}

export interface ArbitrationResult {
  success: boolean;
  proposal?: CoopDecisionProposal | undefined;
  error?: string;
}

export interface PendingProposalsResult {
  success: boolean;
  proposals: CoopDecisionProposal[];
  error?: string;
}

const VALID_STATUS_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  proposed: ['confirmed', 'overridden', 'expired', 'consensus'],
  confirmed: [],
  overridden: [],
  withdrawn: [],
  expired: [],
  consensus: [],
};

function isValidStatusTransition(current: ProposalStatus, next: ProposalStatus): boolean {
  return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export async function submitArbitrationProposal(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  input: SubmitArbitrationProposalInput,
  eventBus: EventBus,
): Promise<ArbitrationResult> {
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
      role: input.role,
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

  emitProposalCreated(eventBus, tenantId, playerId, sessionId, proposal);

  return { success: true, proposal };
}

export async function authorityConfirmProposal(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  input: AuthorityArbitrateInput,
  eventBus: EventBus,
): Promise<ArbitrationResult> {
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

  if (!isValidStatusTransition(proposal.status as ProposalStatus, 'confirmed')) {
    return { success: false, error: `Cannot confirm proposal in status: ${proposal.status}` };
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

  const updatedProposal = await db.query.coopDecisionProposal.findFirst({
    where: eq(coopDecisionProposal.proposalId, input.proposalId),
  });

  if (updatedProposal) {
    emitProposalConfirmed(eventBus, tenantId, playerId, sessionId, updatedProposal);
  }

  return { success: true, proposal: updatedProposal };
}

export async function authorityOverrideProposal(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  input: AuthorityArbitrateInput,
  eventBus: EventBus,
): Promise<ArbitrationResult> {
  const rationaleValidation = validateRationale(input.rationale);
  if (!rationaleValidation.valid) {
    return { success: false, error: rationaleValidation.error };
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

  if (!isValidStatusTransition(proposal.status as ProposalStatus, 'overridden')) {
    return { success: false, error: `Cannot override proposal in status: ${proposal.status}` };
  }

  await db
    .update(coopDecisionProposal)
    .set({
      status: 'overridden',
      authorityAction: 'override',
      conflictFlag: true,
      conflictReason: input.conflictReason ?? null,
      rationale: input.rationale?.trim() ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(coopDecisionProposal.proposalId, input.proposalId));

  await deleteCachedCoopSession(config, tenantId, sessionId);

  const updatedProposal = await db.query.coopDecisionProposal.findFirst({
    where: eq(coopDecisionProposal.proposalId, input.proposalId),
  });

  if (updatedProposal) {
    emitProposalOverridden(
      eventBus,
      tenantId,
      playerId,
      sessionId,
      updatedProposal,
      input.rationale?.trim() ?? '',
      input.conflictReason,
    );
  }

  return { success: true, proposal: updatedProposal };
}

export async function expireProposal(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  proposalId: string,
  reason: 'timeout' | 'session_ended',
  eventBus: EventBus,
): Promise<ArbitrationResult> {
  const db = getDatabaseClient(config);

  const proposal = await db.query.coopDecisionProposal.findFirst({
    where: and(
      eq(coopDecisionProposal.proposalId, proposalId),
      eq(coopDecisionProposal.sessionId, sessionId),
    ),
  });

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (!isValidStatusTransition(proposal.status as ProposalStatus, 'expired')) {
    return { success: false, error: `Cannot expire proposal in status: ${proposal.status}` };
  }

  await db
    .update(coopDecisionProposal)
    .set({
      status: 'expired',
      expiredAt: new Date(),
      resolvedAt: new Date(),
    })
    .where(eq(coopDecisionProposal.proposalId, proposalId));

  await deleteCachedCoopSession(config, tenantId, sessionId);

  const updatedProposal = await db.query.coopDecisionProposal.findFirst({
    where: eq(coopDecisionProposal.proposalId, proposalId),
  });

  if (updatedProposal) {
    emitProposalExpired(eventBus, tenantId, sessionId, updatedProposal, reason);
  }

  return { success: true, proposal: updatedProposal };
}

export async function markProposalConsensus(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  proposalId: string,
  eventBus: EventBus,
): Promise<ArbitrationResult> {
  const db = getDatabaseClient(config);

  const proposal = await db.query.coopDecisionProposal.findFirst({
    where: and(
      eq(coopDecisionProposal.proposalId, proposalId),
      eq(coopDecisionProposal.sessionId, sessionId),
    ),
  });

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (!isValidStatusTransition(proposal.status as ProposalStatus, 'consensus')) {
    return {
      success: false,
      error: `Cannot mark consensus for proposal in status: ${proposal.status}`,
    };
  }

  await db
    .update(coopDecisionProposal)
    .set({
      status: 'consensus',
      resolvedAt: new Date(),
    })
    .where(eq(coopDecisionProposal.proposalId, proposalId));

  await deleteCachedCoopSession(config, tenantId, sessionId);

  const updatedProposal = await db.query.coopDecisionProposal.findFirst({
    where: eq(coopDecisionProposal.proposalId, proposalId),
  });

  if (updatedProposal) {
    emitProposalConsensus(eventBus, tenantId, sessionId, updatedProposal);
  }

  return { success: true, proposal: updatedProposal };
}

export async function getPendingProposals(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
): Promise<PendingProposalsResult> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found', proposals: [] };
  }

  const proposals = await db.query.coopDecisionProposal.findMany({
    where: and(
      eq(coopDecisionProposal.sessionId, sessionId),
      eq(coopDecisionProposal.status, 'proposed'),
    ),
    orderBy: (proposals, { asc }) => [asc(proposals.proposedAt)],
  });

  return { success: true, proposals };
}

function emitProposalCreated(
  eventBus: EventBus,
  tenantId: string,
  userId: string,
  sessionId: string,
  proposal: CoopDecisionProposal,
): void {
  const event = createArbitrationProposalCreatedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId,
      proposalId: proposal.proposalId,
      playerId: proposal.playerId,
      role: proposal.role,
      emailId: proposal.emailId,
      action: proposal.action,
      status: proposal.status,
      proposedAt: proposal.proposedAt?.toISOString() ?? new Date().toISOString(),
    },
  });
  eventBus.publish(event);
}

function emitProposalConfirmed(
  eventBus: EventBus,
  tenantId: string,
  userId: string,
  sessionId: string,
  proposal: CoopDecisionProposal,
): void {
  const event = createArbitrationProposalConfirmedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId,
      proposalId: proposal.proposalId,
      playerId: proposal.playerId,
      authorityPlayerId: userId,
      action: proposal.action,
      confirmedAt: proposal.resolvedAt?.toISOString() ?? new Date().toISOString(),
    },
  });
  eventBus.publish(event);
}

function emitProposalOverridden(
  eventBus: EventBus,
  tenantId: string,
  userId: string,
  sessionId: string,
  proposal: CoopDecisionProposal,
  rationale: string,
  conflictReason?: string,
): void {
  const event = createArbitrationProposalOverriddenEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId,
      proposalId: proposal.proposalId,
      playerId: proposal.playerId,
      authorityPlayerId: userId,
      rationale,
      ...(conflictReason !== undefined ? { conflictReason } : {}),
      overriddenAt: proposal.resolvedAt?.toISOString() ?? new Date().toISOString(),
    },
  });
  eventBus.publish(event);
}

function emitProposalExpired(
  eventBus: EventBus,
  tenantId: string,
  sessionId: string,
  proposal: CoopDecisionProposal,
  reason: 'timeout' | 'session_ended',
): void {
  const event = createArbitrationProposalExpiredEvent({
    correlationId: generateId(),
    tenantId,
    userId: proposal.playerId,
    payload: {
      sessionId,
      proposalId: proposal.proposalId,
      playerId: proposal.playerId,
      emailId: proposal.emailId,
      action: proposal.action,
      expiredAt: proposal.expiredAt?.toISOString() ?? new Date().toISOString(),
      reason,
    },
  });
  eventBus.publish(event);
}

function emitProposalConsensus(
  eventBus: EventBus,
  tenantId: string,
  sessionId: string,
  proposal: CoopDecisionProposal,
): void {
  const event = createArbitrationProposalConsensusEvent({
    correlationId: generateId(),
    tenantId,
    userId: proposal.playerId,
    payload: {
      sessionId,
      proposalId: proposal.proposalId,
      playerId: proposal.playerId,
      authorityPlayerId: '',
      action: proposal.action,
      consensusAt: proposal.resolvedAt?.toISOString() ?? new Date().toISOString(),
    },
  });
  eventBus.publish(event);
}
