import { createDomainEvent } from '../../shared/events/event-bus.js';

export const COOP_SESSION_EVENTS = {
  SESSION_CREATED: 'coop.session.created',
  ROLE_ASSIGNED: 'coop.session.role_assigned',
  AUTHORITY_TRANSFERRED: 'coop.session.authority_transferred',
  PROPOSAL_SUBMITTED: 'coop.session.proposal_submitted',
  PROPOSAL_CONFIRMED: 'coop.session.proposal_confirmed',
  PROPOSAL_OVERRIDDEN: 'coop.session.proposal_overridden',
  DAY_ADVANCED: 'coop.session.day_advanced',
  SESSION_ENDED: 'coop.session.ended',
} as const;

type CoopSessionEventInput<T> = {
  correlationId: string;
  tenantId: string;
  userId: string;
  payload: T;
};

export interface CoopSessionCreatedPayload {
  sessionId: string;
  partyId: string;
  authorityPlayerId: string;
  seed: string;
  dayNumber: number;
}

export interface CoopRoleAssignedPayload {
  sessionId: string;
  roles: Array<{
    playerId: string;
    role: string;
    isAuthority: boolean;
  }>;
}

export interface CoopAuthorityTransferredPayload {
  sessionId: string;
  previousAuthorityPlayerId: string;
  newAuthorityPlayerId: string;
  transferredBy: string;
}

export interface CoopProposalSubmittedPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  role: string;
  emailId: string;
  action: string;
}

export interface CoopProposalConfirmedPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  authorityPlayerId: string;
  action: string;
}

export interface CoopProposalOverriddenPayload {
  sessionId: string;
  proposalId: string;
  playerId: string;
  authorityPlayerId: string;
  conflictReason?: string;
}

export interface CoopDayAdvancedPayload {
  sessionId: string;
  dayNumber: number;
  previousAuthorityPlayerId: string;
  newAuthorityPlayerId: string;
  advancedBy: string;
}

export interface CoopSessionEndedPayload {
  sessionId: string;
  partyId: string;
  endedBy: string;
  status: 'completed' | 'abandoned';
}

export const createCoopSessionCreatedEvent = (
  input: CoopSessionEventInput<CoopSessionCreatedPayload>,
) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.SESSION_CREATED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });

export const createCoopRoleAssignedEvent = (
  input: CoopSessionEventInput<CoopRoleAssignedPayload>,
) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.ROLE_ASSIGNED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });

export const createCoopAuthorityTransferredEvent = (
  input: CoopSessionEventInput<CoopAuthorityTransferredPayload>,
) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.AUTHORITY_TRANSFERRED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });

export const createCoopProposalSubmittedEvent = (
  input: CoopSessionEventInput<CoopProposalSubmittedPayload>,
) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.PROPOSAL_SUBMITTED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });

export const createCoopProposalConfirmedEvent = (
  input: CoopSessionEventInput<CoopProposalConfirmedPayload>,
) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.PROPOSAL_CONFIRMED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });

export const createCoopProposalOverriddenEvent = (
  input: CoopSessionEventInput<CoopProposalOverriddenPayload>,
) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.PROPOSAL_OVERRIDDEN,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });

export const createCoopDayAdvancedEvent = (input: CoopSessionEventInput<CoopDayAdvancedPayload>) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.DAY_ADVANCED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });

export const createCoopSessionEndedEvent = (
  input: CoopSessionEventInput<CoopSessionEndedPayload>,
) =>
  createDomainEvent({
    eventType: COOP_SESSION_EVENTS.SESSION_ENDED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'coop-session',
    version: 1,
    payload: input.payload,
  });
