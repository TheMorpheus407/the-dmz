import {
  GAME_ENGINE_EVENTS,
  type BaseGameEngineEventParams,
  type GameEngineDomainEvent,
  type UpgradePurchasedPayload,
  type ResourceAdjustedPayload,
  type CreditsChangedPayload,
  type TrustChangedPayload,
  type IntelChangedPayload,
  type LevelUpPayload,
  type ConsequencesAppliedPayload,
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
  params: BaseGameEngineEventParams & { payload: UpgradePurchasedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.UPGRADE_PURCHASED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.UPGRADE_PURCHASED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createResourceAdjustedEvent = (
  params: BaseGameEngineEventParams & { payload: ResourceAdjustedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.RESOURCE_ADJUSTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.RESOURCE_ADJUSTED,
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

export const createConsequencesAppliedEvent = (
  params: BaseGameEngineEventParams & { payload: ConsequencesAppliedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.CONSEQUENCES_APPLIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.CONSEQUENCES_APPLIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
