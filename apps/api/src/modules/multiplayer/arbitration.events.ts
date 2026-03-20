import { createDomainEvent } from '../../shared/events/event-bus.js';

export const ARBITRATION_EVENTS = {
  PROPOSAL_CREATED: 'arbitration.proposed',
  PROPOSAL_CONFIRMED: 'arbitration.confirmed',
  PROPOSAL_OVERRIDDEN: 'arbitration.overridden',
  PROPOSAL_EXPIRED: 'arbitration.expired',
  PROPOSAL_CONSENSUS: 'arbitration.consensus',
  AUTHORITY_TOKEN_RELINQUISHED: 'authority.token.relinquished',
} as const;

type ArbitrationEventInput<T> = {
  correlationId: string;
  tenantId: string;
  userId: string;
  payload: T;
};

export interface ArbitrationProposalCreatedPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  role: string;
  emailId: string;
  action: string;
  status: string;
  proposedAt: string;
}

export interface ArbitrationProposalConfirmedPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  authorityPlayerId: string;
  action: string;
  confirmedAt: string;
}

export interface ArbitrationProposalOverriddenPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  authorityPlayerId: string;
  rationale: string;
  conflictReason?: string;
  overriddenAt: string;
}

export interface ArbitrationProposalExpiredPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  emailId: string;
  action: string;
  expiredAt: string;
  reason: 'timeout' | 'session_ended';
}

export interface ArbitrationProposalConsensusPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  authorityPlayerId: string;
  action: string;
  consensusAt: string;
}

export interface AuthorityTokenRelinquishedPayload {
  sessionId: string;
  previousAuthorityPlayerId: string;
  newAuthorityPlayerId: string;
  reason: 'self_proposal' | 'timer_rotation' | 'manual';
  relinquishedAt: string;
}

export const createArbitrationProposalCreatedEvent = (
  input: ArbitrationEventInput<ArbitrationProposalCreatedPayload>,
) =>
  createDomainEvent({
    eventType: ARBITRATION_EVENTS.PROPOSAL_CREATED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'arbitration',
    version: 1,
    payload: input.payload,
  });

export const createArbitrationProposalConfirmedEvent = (
  input: ArbitrationEventInput<ArbitrationProposalConfirmedPayload>,
) =>
  createDomainEvent({
    eventType: ARBITRATION_EVENTS.PROPOSAL_CONFIRMED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'arbitration',
    version: 1,
    payload: input.payload,
  });

export const createArbitrationProposalOverriddenEvent = (
  input: ArbitrationEventInput<ArbitrationProposalOverriddenPayload>,
) =>
  createDomainEvent({
    eventType: ARBITRATION_EVENTS.PROPOSAL_OVERRIDDEN,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'arbitration',
    version: 1,
    payload: input.payload,
  });

export const createArbitrationProposalExpiredEvent = (
  input: ArbitrationEventInput<ArbitrationProposalExpiredPayload>,
) =>
  createDomainEvent({
    eventType: ARBITRATION_EVENTS.PROPOSAL_EXPIRED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'arbitration',
    version: 1,
    payload: input.payload,
  });

export const createArbitrationProposalConsensusEvent = (
  input: ArbitrationEventInput<ArbitrationProposalConsensusPayload>,
) =>
  createDomainEvent({
    eventType: ARBITRATION_EVENTS.PROPOSAL_CONSENSUS,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'arbitration',
    version: 1,
    payload: input.payload,
  });

export const createAuthorityTokenRelinquishedEvent = (
  input: ArbitrationEventInput<AuthorityTokenRelinquishedPayload>,
) =>
  createDomainEvent({
    eventType: ARBITRATION_EVENTS.AUTHORITY_TOKEN_RELINQUISHED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'arbitration',
    version: 1,
    payload: input.payload,
  });
