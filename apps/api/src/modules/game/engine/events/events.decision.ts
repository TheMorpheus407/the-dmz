import {
  GAME_ENGINE_EVENTS,
  type GameEngineEventParams,
  type GameEngineDomainEvent,
  type DecisionApprovedPayload,
  type DecisionDeniedPayload,
  type DecisionFlaggedPayload,
  type DecisionVerificationRequestedPayload,
  type VerificationPacketOpenedPayload,
  type VerificationOutOfBandInitiatedPayload,
  type VerificationResultPayload,
  createGameEngineEvent,
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
  params: GameEngineEventParams & { payload: DecisionApprovedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_APPROVED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.DECISION_APPROVED, params, params.payload);
};

export const createDecisionDeniedEvent = (
  params: GameEngineEventParams & { payload: DecisionDeniedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_DENIED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.DECISION_DENIED, params, params.payload);
};

export const createDecisionFlaggedEvent = (
  params: GameEngineEventParams & { payload: DecisionFlaggedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_FLAGGED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.DECISION_FLAGGED, params, params.payload);
};

export const createDecisionVerificationRequestedEvent = (
  params: GameEngineEventParams & { payload: DecisionVerificationRequestedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED> => {
  return createGameEngineEvent(
    GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED,
    params,
    params.payload,
  );
};

export const createVerificationPacketOpenedEvent = (
  params: GameEngineEventParams & { payload: VerificationPacketOpenedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED> => {
  return createGameEngineEvent(
    GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED,
    params,
    params.payload,
  );
};

export const createVerificationOutOfBandInitiatedEvent = (
  params: GameEngineEventParams & { payload: VerificationOutOfBandInitiatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED> => {
  return createGameEngineEvent(
    GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED,
    params,
    params.payload,
  );
};

export const createVerificationResultEvent = (
  params: GameEngineEventParams & { payload: VerificationResultPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_RESULT> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.VERIFICATION_RESULT, params, params.payload);
};
