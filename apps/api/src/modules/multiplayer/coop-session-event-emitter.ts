import type { DayPhase } from '@the-dmz/shared/game';

import { generateId } from '../../shared/utils/id.js';
import { type CoopRole, type CoopSessionStatus } from '../../db/schema/multiplayer/index.js';

import { createPermissionDeniedEvent } from './permissions/index.js';
import {
  createCoopSessionCreatedEvent,
  createCoopSessionStartedEvent,
  createCoopRoleAssignedEvent,
  createCoopAuthorityTransferredEvent,
  createCoopProposalSubmittedEvent,
  createCoopProposalConfirmedEvent,
  createCoopProposalOverriddenEvent,
  createCoopDayAdvancedEvent,
  createCoopSessionEndedEvent,
} from './coop-session.events.js';

import type { CoopRoleAssignmentResult } from './coop-session.repository.js';
import type { EventBus, DomainEvent } from '../../shared/events/event-types.js';

export interface SessionData {
  sessionId: string;
  partyId: string;
  authorityPlayerId: string | null;
  seed: string;
  dayNumber: number;
  status: CoopSessionStatus;
  roles: CoopRoleAssignmentResult[];
}

export class CoopSessionEventEmitter {
  private readonly eventBus: EventBus | null;

  public constructor(eventBus: EventBus | null) {
    this.eventBus = eventBus;
  }

  private publish(event: DomainEvent<unknown>): void {
    if (this.eventBus) {
      this.eventBus.publish(event);
    }
  }

  public emitSessionCreated(tenantId: string, userId: string, session: SessionData): void {
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
    this.publish(event);
  }

  public emitSessionStarted(
    tenantId: string,
    userId: string,
    session: SessionData,
    scenarioId: string,
    difficultyTier: string,
  ): void {
    const event = createCoopSessionStartedEvent({
      correlationId: generateId(),
      tenantId,
      userId,
      payload: {
        sessionId: session.sessionId,
        partyId: session.partyId,
        scenarioId,
        difficultyTier,
        roleAssignments: session.roles.map((r) => ({
          playerId: r.playerId,
          role: r.role,
          isAuthority: r.isAuthority,
        })),
      },
    });
    this.publish(event);
  }

  public emitRoleAssigned(tenantId: string, userId: string, session: SessionData): void {
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
    this.publish(event);
  }

  public emitAuthorityTransferred(
    tenantId: string,
    userId: string,
    session: SessionData,
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
    this.publish(event);
  }

  public emitProposalSubmitted(
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
    this.publish(event);
  }

  public emitProposalConfirmed(
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
    this.publish(event);
  }

  public emitProposalOverridden(
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
    this.publish(event);
  }

  public emitDayAdvanced(
    tenantId: string,
    userId: string,
    session: SessionData,
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
    this.publish(event);
  }

  public emitSessionEnded(
    tenantId: string,
    userId: string,
    session: SessionData,
    status: CoopSessionStatus,
  ): void {
    const event = createCoopSessionEndedEvent({
      correlationId: generateId(),
      tenantId,
      userId,
      payload: {
        sessionId: session.sessionId,
        partyId: session.partyId,
        endedBy: userId,
        status: status as 'completed' | 'abandoned',
      },
    });
    this.publish(event);
  }

  public emitPermissionDenied(
    tenantId: string,
    playerId: string,
    role: CoopRole,
    attemptedAction: string,
    phase: DayPhase,
    reason: string,
    sessionId: string,
  ): void {
    if (this.eventBus) {
      const deniedEvent = createPermissionDeniedEvent({
        actorId: playerId,
        role,
        attemptedAction,
        phase,
        reason,
        sessionId,
        tenantId,
      });
      this.eventBus.publish({
        eventType: 'permission.denied',
        correlationId: generateId(),
        tenantId,
        userId: playerId,
        source: 'coop-session',
        version: 1,
        payload: deniedEvent,
        eventId: generateId(),
        timestamp: new Date().toISOString(),
      });
    }
  }
}
