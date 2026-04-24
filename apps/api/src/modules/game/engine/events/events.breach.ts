import {
  GAME_ENGINE_EVENTS,
  type GameEngineEventParams,
  type GameEngineDomainEvent,
  type BreachOccurredPayload,
  type IncidentCreatedPayload,
  type IncidentResolvedPayload,
  type IncidentResponseActionTakenPayload,
} from './shared-types.js';

export type {
  BreachOccurredPayload,
  IncidentCreatedPayload,
  IncidentResolvedPayload,
  IncidentResponseActionTakenPayload,
} from './shared-types.js';

export const createBreachOccurredEvent = (
  params: GameEngineEventParams & { payload: BreachOccurredPayload },
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

export const createIncidentCreatedEvent = (
  params: GameEngineEventParams & { payload: IncidentCreatedPayload },
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
  params: GameEngineEventParams & { payload: IncidentResolvedPayload },
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

export const createIncidentResponseActionTakenEvent = (
  params: GameEngineEventParams & { payload: IncidentResponseActionTakenPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
