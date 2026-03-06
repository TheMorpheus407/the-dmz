import type { DomainEvent } from '../../../shared/events/event-types.js';

export const GAME_ENGINE_EVENTS = {
  SESSION_STARTED: 'game.session.started',
  SESSION_PAUSED: 'game.session.paused',
  SESSION_RESUMED: 'game.session.resumed',
  SESSION_COMPLETED: 'game.session.completed',
  SESSION_ABANDONED: 'game.session.abandoned',
  SESSION_BREACH_RECOVERY: 'game.session.breach_recovery',
  DAY_STARTED: 'game.day.started',
  DAY_PHASE_CHANGED: 'game.day.phase.changed',
  DAY_ENDED: 'game.day.ended',
  EMAIL_OPENED: 'game.email.opened',
  EMAIL_INDICATOR_MARKED: 'game.email.indicator_marked',
  EMAIL_VERIFICATION_REQUESTED: 'game.email.verification_requested',
  EMAIL_DECISION_SUBMITTED: 'game.email.decision_submitted',
  EMAIL_DECISION_RESOLVED: 'game.email.decision_resolved',
  CONSEQUENCES_APPLIED: 'game.consequences.applied',
  THREATS_GENERATED: 'game.threats.generated',
  INCIDENT_CREATED: 'game.incident.created',
  INCIDENT_RESOLVED: 'game.incident.resolved',
  BREACH_OCCURRED: 'game.breach.occurred',
  UPGRADE_PURCHASED: 'game.upgrade.purchased',
  RESOURCE_ADJUSTED: 'game.resource.adjusted',
  CREDITS_CHANGED: 'game.economy.credits_changed',
  TRUST_CHANGED: 'game.economy.trust_changed',
  INTEL_CHANGED: 'game.economy.intel_changed',
  LEVEL_UP: 'game.economy.level_up',
} as const;

export type GameEngineEventType = (typeof GAME_ENGINE_EVENTS)[keyof typeof GAME_ENGINE_EVENTS];

export interface SessionStartedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  day: number;
  seed: number;
}

export interface SessionPausedPayload {
  sessionId: string;
  userId: string;
}

export interface SessionResumedPayload {
  sessionId: string;
  userId: string;
}

export interface SessionCompletedPayload {
  sessionId: string;
  userId: string;
  reason: string;
}

export interface SessionAbandonedPayload {
  sessionId: string;
  userId: string;
  reason?: string;
}

export interface SessionBreachRecoveryPayload {
  sessionId: string;
  userId: string;
  recoveryDays: number;
}

export interface DayStartedPayload {
  sessionId: string;
  day: number;
}

export interface DayPhaseChangedPayload {
  sessionId: string;
  day: number;
  oldPhase: string;
  newPhase: string;
}

export interface DayEndedPayload {
  sessionId: string;
  day: number;
}

export interface EmailOpenedPayload {
  sessionId: string;
  emailId: string;
  viewMode?: string;
}

export interface EmailIndicatorMarkedPayload {
  sessionId: string;
  emailId: string;
  indicatorType: string;
  location?: string;
}

export interface EmailVerificationRequestedPayload {
  sessionId: string;
  emailId: string;
}

export interface EmailDecisionSubmittedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeSpentMs: number;
}

export interface EmailDecisionResolvedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
}

export interface ConsequencesAppliedPayload {
  sessionId: string;
  day: number;
  fundsDelta: number;
  trustScoreDelta: number;
}

export interface ThreatsGeneratedPayload {
  sessionId: string;
  day: number;
  attacks: unknown[];
}

export interface IncidentCreatedPayload {
  sessionId: string;
  incidentId: string;
  severity: number;
  type: string;
}

export interface IncidentResolvedPayload {
  sessionId: string;
  incidentId: string;
  responseActions: string[];
}

export interface BreachOccurredPayload {
  sessionId: string;
  userId: string;
  severity: number;
  ransomCost?: number;
}

export interface UpgradePurchasedPayload {
  sessionId: string;
  upgradeId: string;
  cost: number;
}

export interface ResourceAdjustedPayload {
  sessionId: string;
  resourceId: string;
  delta: number;
}

export interface CreditsChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
  relatedEntityId?: string;
}

export interface TrustChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
}

export interface IntelChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
}

export interface LevelUpPayload {
  sessionId: string;
  previousLevel: number;
  newLevel: number;
  xpRequired: number;
  xpAwarded: number;
}

export type GameEngineEventPayloadMap = {
  [GAME_ENGINE_EVENTS.SESSION_STARTED]: SessionStartedPayload;
  [GAME_ENGINE_EVENTS.SESSION_PAUSED]: SessionPausedPayload;
  [GAME_ENGINE_EVENTS.SESSION_RESUMED]: SessionResumedPayload;
  [GAME_ENGINE_EVENTS.SESSION_COMPLETED]: SessionCompletedPayload;
  [GAME_ENGINE_EVENTS.SESSION_ABANDONED]: SessionAbandonedPayload;
  [GAME_ENGINE_EVENTS.SESSION_BREACH_RECOVERY]: SessionBreachRecoveryPayload;
  [GAME_ENGINE_EVENTS.DAY_STARTED]: DayStartedPayload;
  [GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED]: DayPhaseChangedPayload;
  [GAME_ENGINE_EVENTS.DAY_ENDED]: DayEndedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_OPENED]: EmailOpenedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED]: EmailIndicatorMarkedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED]: EmailVerificationRequestedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED]: EmailDecisionSubmittedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED]: EmailDecisionResolvedPayload;
  [GAME_ENGINE_EVENTS.CONSEQUENCES_APPLIED]: ConsequencesAppliedPayload;
  [GAME_ENGINE_EVENTS.THREATS_GENERATED]: ThreatsGeneratedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_CREATED]: IncidentCreatedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_RESOLVED]: IncidentResolvedPayload;
  [GAME_ENGINE_EVENTS.BREACH_OCCURRED]: BreachOccurredPayload;
  [GAME_ENGINE_EVENTS.UPGRADE_PURCHASED]: UpgradePurchasedPayload;
  [GAME_ENGINE_EVENTS.RESOURCE_ADJUSTED]: ResourceAdjustedPayload;
  [GAME_ENGINE_EVENTS.CREDITS_CHANGED]: CreditsChangedPayload;
  [GAME_ENGINE_EVENTS.TRUST_CHANGED]: TrustChangedPayload;
  [GAME_ENGINE_EVENTS.INTEL_CHANGED]: IntelChangedPayload;
  [GAME_ENGINE_EVENTS.LEVEL_UP]: LevelUpPayload;
};

export type GameEngineDomainEvent<T extends GameEngineEventType = GameEngineEventType> =
  DomainEvent<GameEngineEventPayloadMap[T]>;

interface BaseGameEngineEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
}

export const createSessionStartedEvent = (
  params: BaseGameEngineEventParams & { payload: SessionStartedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_STARTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.SESSION_STARTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSessionPausedEvent = (
  params: BaseGameEngineEventParams & { payload: SessionPausedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_PAUSED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.SESSION_PAUSED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSessionResumedEvent = (
  params: BaseGameEngineEventParams & { payload: SessionResumedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_RESUMED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.SESSION_RESUMED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSessionCompletedEvent = (
  params: BaseGameEngineEventParams & { payload: SessionCompletedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_COMPLETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.SESSION_COMPLETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSessionAbandonedEvent = (
  params: BaseGameEngineEventParams & { payload: SessionAbandonedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_ABANDONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.SESSION_ABANDONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createDayStartedEvent = (
  params: BaseGameEngineEventParams & { payload: DayStartedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DAY_STARTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DAY_STARTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createDayPhaseChangedEvent = (
  params: BaseGameEngineEventParams & { payload: DayPhaseChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createDayEndedEvent = (
  params: BaseGameEngineEventParams & { payload: DayEndedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DAY_ENDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DAY_ENDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailOpenedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailOpenedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_OPENED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_OPENED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailDecisionSubmittedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailDecisionSubmittedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createIncidentCreatedEvent = (
  params: BaseGameEngineEventParams & { payload: IncidentCreatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INCIDENT_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.INCIDENT_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createIncidentResolvedEvent = (
  params: BaseGameEngineEventParams & { payload: IncidentResolvedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INCIDENT_RESOLVED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.INCIDENT_RESOLVED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createBreachOccurredEvent = (
  params: BaseGameEngineEventParams & { payload: BreachOccurredPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.BREACH_OCCURRED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.BREACH_OCCURRED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createCreditsChangedEvent = (
  params: BaseGameEngineEventParams & { payload: CreditsChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.CREDITS_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.CREDITS_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createTrustChangedEvent = (
  params: BaseGameEngineEventParams & { payload: TrustChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.TRUST_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.TRUST_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createIntelChangedEvent = (
  params: BaseGameEngineEventParams & { payload: IntelChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INTEL_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.INTEL_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createLevelUpEvent = (
  params: BaseGameEngineEventParams & { payload: LevelUpPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.LEVEL_UP> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.LEVEL_UP,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
