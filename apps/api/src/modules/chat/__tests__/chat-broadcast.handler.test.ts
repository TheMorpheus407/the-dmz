import { randomUUID } from 'crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWsGateway = {
  createMessage: vi.fn(),
  broadcastToChannel: vi.fn(),
};

const mockBuildChannelName = vi.fn((prefix: string, id: string) => `${prefix}:${id}`);

vi.mock('../../notification/websocket/websocket.gateway.js', () => ({
  wsGateway: mockWsGateway,
  buildChannelName: mockBuildChannelName,
}));

import {
  createChatBroadcastHandler,
  removeChatBroadcastHandler,
} from '../chat-broadcast.handler.js';

import type { IEventBus, DomainEvent } from '../../../shared/events/event-types.js';
import type { ChatMessageSentPayload, ChatMessageDeletedPayload } from '../chat.events.js';

describe('chat-broadcast.handler', () => {
  let mockEventBus: IEventBus;
  let subscribeMock: ReturnType<typeof vi.fn>;
  let unsubscribeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeMock = vi.fn();
    unsubscribeMock = vi.fn();
    mockEventBus = {
      publish: vi.fn(),
      subscribe: subscribeMock,
      unsubscribe: unsubscribeMock,
    } as unknown as IEventBus;
  });

  describe('createChatBroadcastHandler', () => {
    it('subscribes to all three event types', () => {
      createChatBroadcastHandler(mockEventBus);

      expect(subscribeMock).toHaveBeenCalledTimes(3);
      expect(subscribeMock).toHaveBeenCalledWith('chat.message.sent', expect.any(Function));
      expect(subscribeMock).toHaveBeenCalledWith('chat.message.deleted', expect.any(Function));
      expect(subscribeMock).toHaveBeenCalledWith('chat.channel.created', expect.any(Function));
    });
  });

  describe('removeChatBroadcastHandler', () => {
    it('unsubscribes from all three event types', () => {
      removeChatBroadcastHandler(mockEventBus);

      expect(unsubscribeMock).toHaveBeenCalledTimes(3);
      expect(unsubscribeMock).toHaveBeenCalledWith('chat.message.sent', expect.any(Function));
      expect(unsubscribeMock).toHaveBeenCalledWith('chat.message.deleted', expect.any(Function));
      expect(unsubscribeMock).toHaveBeenCalledWith('chat.channel.created', expect.any(Function));
    });
  });

  describe('handleMessageSent', () => {
    it('broadcasts to correct wsChannel', async () => {
      createChatBroadcastHandler(mockEventBus);

      const sentHandler = subscribeMock.mock.calls.find(
        (call) => call[0] === 'chat.message.sent',
      )?.[1] as (event: DomainEvent<ChatMessageSentPayload>) => Promise<void>;

      const mockEvent: DomainEvent<ChatMessageSentPayload> = {
        eventType: 'chat.message.sent',
        eventId: randomUUID(),
        source: 'test',
        correlationId: randomUUID(),
        tenantId: 'tenant-1',
        userId: 'user-1',
        version: 1,
        payload: {
          messageId: 'msg-1',
          channelId: 'channel-1',
          senderPlayerId: 'player-1',
          content: 'Hello',
          moderationStatus: 'approved',
          createdAt: '2026-03-01T00:00:00.000Z',
          tenantId: 'tenant-1',
        },
        metadata: {},
        timestamp: Date.now(),
      };

      mockWsGateway.createMessage.mockReturnValue({
        type: 'CHAT_MESSAGE',
        payload: {},
        timestamp: 1234567890,
        sequence: 1,
      });
      mockWsGateway.broadcastToChannel.mockReturnValue(undefined);

      await sentHandler(mockEvent);

      expect(mockBuildChannelName).toHaveBeenCalledWith('chat', 'channel-1');
      expect(mockWsGateway.createMessage).toHaveBeenCalledWith(
        'CHAT_MESSAGE',
        expect.objectContaining({
          messageId: 'msg-1',
          channelId: 'channel-1',
          senderPlayerId: 'player-1',
          content: 'Hello',
          moderationStatus: 'approved',
          createdAt: '2026-03-01T00:00:00.000Z',
        }),
      );
      expect(mockWsGateway.broadcastToChannel).toHaveBeenCalledWith(
        'chat:channel-1',
        expect.anything(),
      );
    });
  });

  describe('handleMessageDeleted', () => {
    it('broadcasts to correct wsChannel with deleted:true', async () => {
      createChatBroadcastHandler(mockEventBus);

      const deletedHandler = subscribeMock.mock.calls.find(
        (call) => call[0] === 'chat.message.deleted',
      )?.[1] as (event: DomainEvent<ChatMessageDeletedPayload>) => Promise<void>;

      const mockEvent: DomainEvent<ChatMessageDeletedPayload> = {
        eventType: 'chat.message.deleted',
        eventId: randomUUID(),
        source: 'test',
        correlationId: randomUUID(),
        tenantId: 'tenant-1',
        userId: 'user-1',
        version: 1,
        payload: {
          messageId: 'msg-1',
          channelId: 'channel-1',
        },
        metadata: {},
        timestamp: Date.now(),
      };

      mockWsGateway.createMessage.mockReturnValue({
        type: 'CHAT_MESSAGE',
        payload: {},
        timestamp: 1234567890,
        sequence: 1,
      });
      mockWsGateway.broadcastToChannel.mockReturnValue(undefined);

      await deletedHandler(mockEvent);

      expect(mockBuildChannelName).toHaveBeenCalledWith('chat', 'channel-1');
      expect(mockWsGateway.createMessage).toHaveBeenCalledWith('CHAT_MESSAGE', {
        messageId: 'msg-1',
        channelId: 'channel-1',
        deleted: true,
      });
      expect(mockWsGateway.broadcastToChannel).toHaveBeenCalledWith(
        'chat:channel-1',
        expect.anything(),
      );
    });
  });
});
