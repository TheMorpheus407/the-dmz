import {
  GAME_ENGINE_EVENTS,
  type GameEngineEventParams,
  type GameEngineDomainEvent,
  type UpgradePurchasedPayload,
  type ResourceAdjustedPayload,
  type CreditsChangedPayload,
  type TrustChangedPayload,
  type IntelChangedPayload,
  type LevelUpPayload,
  type ConsequencesAppliedPayload,
  createGameEngineEvent,
} from './shared-types.js';

export type {
  UpgradePurchasedPayload,
  ResourceAdjustedPayload,
  CreditsChangedPayload,
  TrustChangedPayload,
  IntelChangedPayload,
  LevelUpPayload,
  ConsequencesAppliedPayload,
} from './shared-types.js';

export const createUpgradePurchasedEvent = (
  params: GameEngineEventParams & { payload: UpgradePurchasedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.UPGRADE_PURCHASED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.UPGRADE_PURCHASED, params, params.payload);
};

export const createResourceAdjustedEvent = (
  params: GameEngineEventParams & { payload: ResourceAdjustedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.RESOURCE_ADJUSTED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.RESOURCE_ADJUSTED, params, params.payload);
};

export const createCreditsChangedEvent = (
  params: GameEngineEventParams & { payload: CreditsChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.CREDITS_CHANGED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.CREDITS_CHANGED, params, params.payload);
};

export const createTrustChangedEvent = (
  params: GameEngineEventParams & { payload: TrustChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.TRUST_CHANGED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.TRUST_CHANGED, params, params.payload);
};

export const createIntelChangedEvent = (
  params: GameEngineEventParams & { payload: IntelChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INTEL_CHANGED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.INTEL_CHANGED, params, params.payload);
};

export const createLevelUpEvent = (
  params: GameEngineEventParams & { payload: LevelUpPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.LEVEL_UP> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.LEVEL_UP, params, params.payload);
};

export const createConsequencesAppliedEvent = (
  params: GameEngineEventParams & { payload: ConsequencesAppliedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.CONSEQUENCES_APPLIED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.CONSEQUENCES_APPLIED, params, params.payload);
};
