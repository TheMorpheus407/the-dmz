import {
  GAME_ENGINE_EVENTS,
  type BaseGameEngineEventParams,
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

export const createIncidentResponseActionTakenEvent = (
  params: BaseGameEngineEventParams & { payload: IncidentResponseActionTakenPayload },
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
