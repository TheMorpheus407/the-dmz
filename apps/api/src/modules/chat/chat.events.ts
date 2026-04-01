import { createDomainEvent } from '../../shared/events/event-bus.js';

import type { DomainEvent } from '../../shared/events/event-types.js';
import type { ModerationStatus } from '../../db/schema/social/index.js';

export interface ChatMessageSentPayload {
  messageId: string;
  channelId: string;
  senderPlayerId: string;
  content: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  tenantId: string;
}

export interface ChatMessageDeletedPayload {
  messageId: string;
  channelId: string;
}

export interface ChatChannelCreatedPayload {
  channelId: string;
  channelType: string;
  tenantId: string;
}

export function createChatMessageSentEvent(
  source: string,
  correlationId: string,
  payload: ChatMessageSentPayload,
  metadata: { tenantId: string; userId: string },
): DomainEvent<ChatMessageSentPayload> {
  return createDomainEvent({
    eventType: 'chat.message.sent',
    source,
    correlationId,
    tenantId: metadata.tenantId,
    userId: metadata.userId,
    payload,
    version: 1,
  });
}

export function createChatMessageDeletedEvent(
  source: string,
  correlationId: string,
  payload: ChatMessageDeletedPayload,
  metadata: { tenantId: string; userId: string },
): DomainEvent<ChatMessageDeletedPayload> {
  return createDomainEvent({
    eventType: 'chat.message.deleted',
    source,
    correlationId,
    tenantId: metadata.tenantId,
    userId: metadata.userId,
    payload,
    version: 1,
  });
}

export function createChatChannelCreatedEvent(
  source: string,
  correlationId: string,
  payload: ChatChannelCreatedPayload,
  metadata: { tenantId: string; userId: string },
): DomainEvent<ChatChannelCreatedPayload> {
  return createDomainEvent({
    eventType: 'chat.channel.created',
    source,
    correlationId,
    tenantId: metadata.tenantId,
    userId: metadata.userId,
    payload,
    version: 1,
  });
}
