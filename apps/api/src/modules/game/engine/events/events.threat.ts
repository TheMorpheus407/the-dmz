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
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.THREATS_GENERATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createThreatAttackLaunchedEvent = (
  params: GameEngineEventParams & { payload: ThreatAttackLaunchedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createThreatAttackMitigatedEvent = (
  params: GameEngineEventParams & { payload: ThreatAttackMitigatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createThreatAttackSucceededEvent = (
  params: GameEngineEventParams & { payload: ThreatAttackSucceededPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createThreatBreachOccurredEvent = (
  params: GameEngineEventParams & { payload: BreachOccurredPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_BREACH_OCCURRED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.THREAT_BREACH_OCCURRED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createThreatLevelChangedEvent = (
  params: GameEngineEventParams & { payload: ThreatLevelChangedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
