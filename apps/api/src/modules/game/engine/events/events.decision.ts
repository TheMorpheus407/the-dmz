import {
  GAME_ENGINE_EVENTS,
  type BaseGameEngineEventParams,
  type GameEngineDomainEvent,
  type DecisionApprovedPayload,
  type DecisionDeniedPayload,
  type DecisionFlaggedPayload,
  type DecisionVerificationRequestedPayload,
  type VerificationPacketOpenedPayload,
  type VerificationOutOfBandInitiatedPayload,
  type VerificationResultPayload,
} from './shared-types.js';

export type {
  DecisionApprovedPayload,
  DecisionDeniedPayload,
  DecisionFlaggedPayload,
  DecisionVerificationRequestedPayload,
  VerificationPacketOpenedPayload,
  VerificationOutOfBandInitiatedPayload,
  VerificationResultPayload,
} from './shared-types.js';

export const createDecisionApprovedEvent = (
  params: BaseGameEngineEventParams & { payload: DecisionApprovedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_APPROVED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DECISION_APPROVED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createDecisionDeniedEvent = (
  params: BaseGameEngineEventParams & { payload: DecisionDeniedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_DENIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DECISION_DENIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createDecisionFlaggedEvent = (
  params: BaseGameEngineEventParams & { payload: DecisionFlaggedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_FLAGGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DECISION_FLAGGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createDecisionVerificationRequestedEvent = (
  params: BaseGameEngineEventParams & { payload: DecisionVerificationRequestedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createVerificationPacketOpenedEvent = (
  params: BaseGameEngineEventParams & { payload: VerificationPacketOpenedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createVerificationOutOfBandInitiatedEvent = (
  params: BaseGameEngineEventParams & { payload: VerificationOutOfBandInitiatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createVerificationResultEvent = (
  params: BaseGameEngineEventParams & { payload: VerificationResultPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_RESULT> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.VERIFICATION_RESULT,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
