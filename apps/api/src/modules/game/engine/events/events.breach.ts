import {
  GAME_ENGINE_EVENTS,
  type GameEngineEventParams,
  type GameEngineDomainEvent,
  type BreachOccurredPayload,
  type IncidentCreatedPayload,
  type IncidentResolvedPayload,
  type IncidentResponseActionTakenPayload,
  createGameEngineEvent,
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
  return createGameEngineEvent(GAME_ENGINE_EVENTS.BREACH_OCCURRED, params, params.payload);
};

export const createIncidentCreatedEvent = (
  params: GameEngineEventParams & { payload: IncidentCreatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INCIDENT_CREATED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.INCIDENT_CREATED, params, params.payload);
};

export const createIncidentResolvedEvent = (
  params: GameEngineEventParams & { payload: IncidentResolvedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INCIDENT_RESOLVED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.INCIDENT_RESOLVED, params, params.payload);
};

export const createIncidentResponseActionTakenEvent = (
  params: GameEngineEventParams & { payload: IncidentResponseActionTakenPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN> => {
  return createGameEngineEvent(
    GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN,
    params,
    params.payload,
  );
};
