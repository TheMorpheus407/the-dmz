import { buildChannelName, type WebSocketGateway } from '../notification/websocket/index.js';

import type { IEventBus, DomainEvent } from '../../shared/events/event-types.js';
import type {
  ChatMessageSentPayload,
  ChatMessageDeletedPayload,
  ChatChannelCreatedPayload,
} from './chat.events.js';

export function createChatBroadcastHandler(eventBus: IEventBus, gateway?: WebSocketGateway): void {
  const wsGateway = gateway;
  eventBus.subscribe<ChatMessageSentPayload>('chat.message.sent', (event) =>
    handleMessageSent(event, wsGateway),
  );
  eventBus.subscribe<ChatMessageDeletedPayload>('chat.message.deleted', (event) =>
    handleMessageDeleted(event, wsGateway),
  );
  eventBus.subscribe<ChatChannelCreatedPayload>('chat.channel.created', (event) =>
    handleChannelCreated(event, wsGateway),
  );
}

export function removeChatBroadcastHandler(eventBus: IEventBus, gateway?: WebSocketGateway): void {
  const wsGateway = gateway;
  eventBus.unsubscribe<ChatMessageSentPayload>('chat.message.sent', (event) =>
    handleMessageSent(event, wsGateway),
  );
  eventBus.unsubscribe<ChatMessageDeletedPayload>('chat.message.deleted', (event) =>
    handleMessageDeleted(event, wsGateway),
  );
  eventBus.unsubscribe<ChatChannelCreatedPayload>('chat.channel.created', (event) =>
    handleChannelCreated(event, wsGateway),
  );
}

async function handleMessageSent(
  event: DomainEvent<ChatMessageSentPayload>,
  gateway?: WebSocketGateway,
): Promise<void> {
  const payload = event.payload;
  const wsChannel = buildChannelName('chat', payload.channelId);
  const wsMessage = gateway?.createMessage('CHAT_MESSAGE', {
    messageId: payload.messageId,
    channelId: payload.channelId,
    senderPlayerId: payload.senderPlayerId,
    content: payload.content,
    moderationStatus: payload.moderationStatus,
    createdAt: payload.createdAt,
  });
  if (wsMessage) {
    gateway?.broadcastToChannel(wsChannel, wsMessage);
  }
}

async function handleMessageDeleted(
  event: DomainEvent<ChatMessageDeletedPayload>,
  gateway?: WebSocketGateway,
): Promise<void> {
  const payload = event.payload;
  const wsChannel = buildChannelName('chat', payload.channelId);
  const wsMessage = gateway?.createMessage('CHAT_MESSAGE', {
    messageId: payload.messageId,
    channelId: payload.channelId,
    deleted: true,
  });
  if (wsMessage) {
    gateway?.broadcastToChannel(wsChannel, wsMessage);
  }
}

async function handleChannelCreated(
  _event: DomainEvent<ChatChannelCreatedPayload>,
  _gateway?: WebSocketGateway,
): Promise<void> {
  // Future: notify clients about new channel availability
}
