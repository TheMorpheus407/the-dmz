import {
  GAME_ENGINE_EVENTS,
  type GameEngineEventParams,
  type GameEngineDomainEvent,
  type EmailReceivedPayload,
  type EmailOpenedPayload,
  type EmailIndicatorMarkedPayload,
  type EmailHeaderViewedPayload,
  type EmailUrlHoveredPayload,
  type EmailAttachmentPreviewedPayload,
  type EmailVerificationRequestedPayload,
  type EmailDecisionSubmittedPayload,
  type EmailDecisionResolvedPayload,
  type EmailDecisionEvaluatedPayload,
  type VerificationPacketGeneratedPayload,
  type InboxLoadedPayload,
  createGameEngineEvent,
} from './shared-types.js';

export type {
  EmailReceivedPayload,
  EmailOpenedPayload,
  EmailIndicatorMarkedPayload,
  EmailHeaderViewedPayload,
  EmailUrlHoveredPayload,
  EmailAttachmentPreviewedPayload,
  EmailVerificationRequestedPayload,
  EmailDecisionSubmittedPayload,
  EmailDecisionResolvedPayload,
  EmailDecisionEvaluatedPayload,
  VerificationPacketGeneratedPayload,
  InboxLoadedPayload,
} from './shared-types.js';

export const createEmailReceivedEvent = (
  params: GameEngineEventParams & { payload: EmailReceivedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_RECEIVED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_RECEIVED, params, params.payload);
};

export const createEmailOpenedEvent = (
  params: GameEngineEventParams & { payload: EmailOpenedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_OPENED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_OPENED, params, params.payload);
};

export const createEmailIndicatorMarkedEvent = (
  params: GameEngineEventParams & { payload: EmailIndicatorMarkedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED, params, params.payload);
};

export const createEmailHeaderViewedEvent = (
  params: GameEngineEventParams & { payload: EmailHeaderViewedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED, params, params.payload);
};

export const createEmailUrlHoveredEvent = (
  params: GameEngineEventParams & { payload: EmailUrlHoveredPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED, params, params.payload);
};

export const createEmailAttachmentPreviewedEvent = (
  params: GameEngineEventParams & { payload: EmailAttachmentPreviewedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED> => {
  return createGameEngineEvent(
    GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED,
    params,
    params.payload,
  );
};

export const createEmailVerificationRequestedEvent = (
  params: GameEngineEventParams & { payload: EmailVerificationRequestedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED> => {
  return createGameEngineEvent(
    GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED,
    params,
    params.payload,
  );
};

export const createEmailDecisionSubmittedEvent = (
  params: GameEngineEventParams & { payload: EmailDecisionSubmittedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED, params, params.payload);
};

export const createEmailDecisionResolvedEvent = (
  params: GameEngineEventParams & { payload: EmailDecisionResolvedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED, params, params.payload);
};

export const createEmailDecisionEvaluatedEvent = (
  params: GameEngineEventParams & { payload: EmailDecisionEvaluatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED, params, params.payload);
};

export const createVerificationPacketGeneratedEvent = (
  params: GameEngineEventParams & { payload: VerificationPacketGeneratedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED> => {
  return createGameEngineEvent(
    GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED,
    params,
    params.payload,
  );
};

export const createInboxLoadedEvent = (
  params: GameEngineEventParams & { payload: InboxLoadedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INBOX_LOADED> => {
  return createGameEngineEvent(GAME_ENGINE_EVENTS.INBOX_LOADED, params, params.payload);
};
