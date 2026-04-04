import { randomUUID } from 'crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildChannelName } from '../../notification/websocket/index.js';

const mockWsGateway = {
  createMessage: vi.fn(),
  broadcastToChannel: vi.fn(),
};

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
      createChatBroadcastHandler(mockEventBus, mockWsGateway as any);

      expect(subscribeMock).toHaveBeenCalledTimes(3);
      expect(subscribeMock).toHaveBeenCalledWith('chat.message.sent', expect.any(Function));
      expect(subscribeMock).toHaveBeenCalledWith('chat.message.deleted', expect.any(Function));
      expect(subscribeMock).toHaveBeenCalledWith('chat.channel.created', expect.any(Function));
    });

    it('works without gateway parameter', () => {
      createChatBroadcastHandler(mockEventBus);

      expect(subscribeMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('removeChatBroadcastHandler', () => {
    it('unsubscribes from all three event types', () => {
      removeChatBroadcastHandler(mockEventBus, mockWsGateway as any);

      expect(unsubscribeMock).toHaveBeenCalledTimes(3);
      expect(unsubscribeMock).toHaveBeenCalledWith('chat.message.sent', expect.any(Function));
      expect(unsubscribeMock).toHaveBeenCalledWith('chat.message.deleted', expect.any(Function));
      expect(unsubscribeMock).toHaveBeenCalledWith('chat.channel.created', expect.any(Function));
    });

    it('works without gateway parameter', () => {
      removeChatBroadcastHandler(mockEventBus);

      expect(unsubscribeMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleMessageSent', () => {
    it('broadcasts to correct wsChannel', async () => {
      createChatBroadcastHandler(mockEventBus, mockWsGateway as any);

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

      const channelName = buildChannelName('chat', 'channel-1');
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
      expect(mockWsGateway.broadcastToChannel).toHaveBeenCalledWith(channelName, expect.anything());
    });

    it('does not broadcast when gateway is not provided', async () => {
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

      await sentHandler(mockEvent);

      expect(mockWsGateway.createMessage).not.toHaveBeenCalled();
      expect(mockWsGateway.broadcastToChannel).not.toHaveBeenCalled();
    });
  });

  describe('handleMessageDeleted', () => {
    it('broadcasts to correct wsChannel with deleted:true', async () => {
      createChatBroadcastHandler(mockEventBus, mockWsGateway as any);

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

      const channelName = buildChannelName('chat', 'channel-1');
      expect(mockWsGateway.createMessage).toHaveBeenCalledWith('CHAT_MESSAGE', {
        messageId: 'msg-1',
        channelId: 'channel-1',
        deleted: true,
      });
      expect(mockWsGateway.broadcastToChannel).toHaveBeenCalledWith(channelName, expect.anything());
    });
  });

  describe('handleChannelCreated', () => {
    it('does not throw when called', async () => {
      createChatBroadcastHandler(mockEventBus, mockWsGateway as any);

      const createdHandler = subscribeMock.mock.calls.find(
        (call) => call[0] === 'chat.channel.created',
      )?.[1] as (event: DomainEvent<ChatChannelCreatedPayload>) => Promise<void>;

      const mockEvent: DomainEvent<ChatChannelCreatedPayload> = {
        eventType: 'chat.channel.created',
        eventId: randomUUID(),
        source: 'test',
        correlationId: randomUUID(),
        tenantId: 'tenant-1',
        userId: 'user-1',
        version: 1,
        payload: {
          channelId: 'channel-1',
          name: 'Test Channel',
          createdBy: 'user-1',
          tenantId: 'tenant-1',
        },
        metadata: {},
        timestamp: Date.now(),
      };

      await expect(createdHandler(mockEvent)).resolves.not.toThrow();
      expect(mockWsGateway.createMessage).not.toHaveBeenCalled();
      expect(mockWsGateway.broadcastToChannel).not.toHaveBeenCalled();
    });
  });
});
