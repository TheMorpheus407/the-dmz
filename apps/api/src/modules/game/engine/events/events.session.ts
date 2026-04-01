import {
  GAME_ENGINE_EVENTS,
  type BaseGameEngineEventParams,
  type GameEngineDomainEvent,
  type SessionStartedPayload,
  type SessionEndedPayload,
  type SessionPausedPayload,
  type SessionResumedPayload,
  type SessionCompletedPayload,
  type SessionAbandonedPayload,
  type SessionBreachRecoveryPayload,
  type DayStartedPayload,
  type DayPhaseChangedPayload,
  type DayEndedPayload,
} from './shared-types.js';

export type {
  SessionStartedPayload,
  SessionEndedPayload,
  SessionPausedPayload,
  SessionResumedPayload,
  SessionCompletedPayload,
  SessionAbandonedPayload,
  SessionBreachRecoveryPayload,
  DayStartedPayload,
  DayPhaseChangedPayload,
  DayEndedPayload,
} from './shared-types.js';

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

export const createSessionEndedEvent = (
  params: BaseGameEngineEventParams & { payload: SessionEndedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_ENDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.SESSION_ENDED,
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

export const createSessionBreachRecoveryEvent = (
  params: BaseGameEngineEventParams & { payload: SessionBreachRecoveryPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_BREACH_RECOVERY> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.SESSION_BREACH_RECOVERY,
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
