import {
  GAME_ENGINE_EVENTS,
  type GameEngineEventParams,
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
  createGameEngineEvent,
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
  params: GameEngineEventParams & { payload: SessionStartedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_STARTED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.SESSION_STARTED, params, params.payload);
};

export const createSessionEndedEvent = (
  params: GameEngineEventParams & { payload: SessionEndedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_ENDED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.SESSION_ENDED, params, params.payload);
};

export const createSessionPausedEvent = (
  params: GameEngineEventParams & { payload: SessionPausedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_PAUSED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.SESSION_PAUSED, params, params.payload);
};

export const createSessionResumedEvent = (
  params: GameEngineEventParams & { payload: SessionResumedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_RESUMED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.SESSION_RESUMED, params, params.payload);
};

export const createSessionCompletedEvent = (
  params: GameEngineEventParams & { payload: SessionCompletedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_COMPLETED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.SESSION_COMPLETED, params, params.payload);
};

export const createSessionAbandonedEvent = (
  params: GameEngineEventParams & { payload: SessionAbandonedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_ABANDONED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.SESSION_ABANDONED, params, params.payload);
};

export const createSessionBreachRecoveryEvent = (
  params: GameEngineEventParams & { payload: SessionBreachRecoveryPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.SESSION_BREACH_RECOVERY> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.SESSION_BREACH_RECOVERY, params, params.payload);
};

export const createDayStartedEvent = (
  params: GameEngineEventParams & { payload: DayStartedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DAY_STARTED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.DAY_STARTED, params, params.payload);
};

export const createDayPhaseChangedEvent = (
  params: GameEngineEventParams & { payload: DayPhaseChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED, params, params.payload);
};

export const createDayEndedEvent = (
  params: GameEngineEventParams & { payload: DayEndedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DAY_ENDED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.DAY_ENDED, params, params.payload);
};
