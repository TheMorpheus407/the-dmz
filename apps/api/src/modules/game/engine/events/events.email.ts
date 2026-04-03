import {
  GAME_ENGINE_EVENTS,
  type BaseGameEngineEventParams,
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
  params: BaseGameEngineEventParams & { payload: EmailReceivedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_RECEIVED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_RECEIVED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailOpenedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailOpenedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_OPENED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_OPENED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailIndicatorMarkedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailIndicatorMarkedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailHeaderViewedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailHeaderViewedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailUrlHoveredEvent = (
  params: BaseGameEngineEventParams & { payload: EmailUrlHoveredPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailAttachmentPreviewedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailAttachmentPreviewedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailVerificationRequestedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailVerificationRequestedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailDecisionSubmittedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailDecisionSubmittedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailDecisionResolvedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailDecisionResolvedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createEmailDecisionEvaluatedEvent = (
  params: BaseGameEngineEventParams & { payload: EmailDecisionEvaluatedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createVerificationPacketGeneratedEvent = (
  params: BaseGameEngineEventParams & { payload: VerificationPacketGeneratedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createInboxLoadedEvent = (
  params: BaseGameEngineEventParams & { payload: InboxLoadedPayload },
): GameEngineDomainEvent<typeof GAME_ENGINE_EVENTS.INBOX_LOADED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.INBOX_LOADED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
