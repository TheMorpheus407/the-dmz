import {
  GAME_ENGINE_EVENTS,
  type GameEngineEventParams,
  type GameEngineDomainEvent,
  type ThreatsGeneratedPayload,
  type ThreatAttackLaunchedPayload,
  type ThreatAttackMitigatedPayload,
  type ThreatAttackSucceededPayload,
  type ThreatLevelChangedPayload,
  type BreachOccurredPayload,
  createGameEngineEvent,
} from './shared-types.js';

export type {
  ThreatsGeneratedPayload,
  ThreatAttackLaunchedPayload,
  ThreatAttackMitigatedPayload,
  ThreatAttackSucceededPayload,
  ThreatLevelChangedPayload,
  BreachOccurredPayload,
} from './shared-types.js';

export const createThreatsGeneratedEvent = (
  params: GameEngineEventParams & { payload: ThreatsGeneratedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREATS_GENERATED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.THREATS_GENERATED, params, params.payload);
};

export const createThreatAttackLaunchedEvent = (
  params: GameEngineEventParams & { payload: ThreatAttackLaunchedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED, params, params.payload);
};

export const createThreatAttackMitigatedEvent = (
  params: GameEngineEventParams & { payload: ThreatAttackMitigatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED, params, params.payload);
};

export const createThreatAttackSucceededEvent = (
  params: GameEngineEventParams & { payload: ThreatAttackSucceededPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED, params, params.payload);
};

export const createThreatBreachOccurredEvent = (
  params: GameEngineEventParams & { payload: BreachOccurredPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_BREACH_OCCURRED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.THREAT_BREACH_OCCURRED, params, params.payload);
};

export const createThreatLevelChangedEvent = (
  params: GameEngineEventParams & { payload: ThreatLevelChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED, params, params.payload);
};
