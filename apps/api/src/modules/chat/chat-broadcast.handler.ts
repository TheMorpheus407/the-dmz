import { wsGateway, buildChannelName } from '../notification/websocket/index.js';

import type { IEventBus, DomainEvent } from '../../shared/events/event-types.js';
import type {
  ChatMessageSentPayload,
  ChatMessageDeletedPayload,
  ChatChannelCreatedPayload,
} from './chat.events.js';

export function createChatBroadcastHandler(eventBus: IEventBus): void {
  eventBus.subscribe<ChatMessageSentPayload>('chat.message.sent', handleMessageSent);
  eventBus.subscribe<ChatMessageDeletedPayload>('chat.message.deleted', handleMessageDeleted);
  eventBus.subscribe<ChatChannelCreatedPayload>('chat.channel.created', handleChannelCreated);
}

export function removeChatBroadcastHandler(eventBus: IEventBus): void {
  eventBus.unsubscribe<ChatMessageSentPayload>('chat.message.sent', handleMessageSent);
  eventBus.unsubscribe<ChatMessageDeletedPayload>('chat.message.deleted', handleMessageDeleted);
  eventBus.unsubscribe<ChatChannelCreatedPayload>('chat.channel.created', handleChannelCreated);
}

async function handleMessageSent(event: DomainEvent<ChatMessageSentPayload>): Promise<void> {
  const payload = event.payload;
  const wsChannel = buildChannelName('chat', payload.channelId);
  const wsMessage = wsGateway.createMessage('CHAT_MESSAGE', {
    messageId: payload.messageId,
    channelId: payload.channelId,
    senderPlayerId: payload.senderPlayerId,
    content: payload.content,
    moderationStatus: payload.moderationStatus,
    createdAt: payload.createdAt,
  });
  wsGateway.broadcastToChannel(wsChannel, wsMessage);
}

async function handleMessageDeleted(event: DomainEvent<ChatMessageDeletedPayload>): Promise<void> {
  const payload = event.payload;
  const wsChannel = buildChannelName('chat', payload.channelId);
  const wsMessage = wsGateway.createMessage('CHAT_MESSAGE', {
    messageId: payload.messageId,
    channelId: payload.channelId,
    deleted: true,
  });
  wsGateway.broadcastToChannel(wsChannel, wsMessage);
}

async function handleChannelCreated(_event: DomainEvent<ChatChannelCreatedPayload>): Promise<void> {
  // Future: notify clients about new channel availability
}
