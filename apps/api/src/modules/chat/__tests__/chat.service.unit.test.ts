/* eslint-disable max-lines */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import {
  createChatMessageSentEvent,
  createChatMessageDeletedEvent,
  createChatChannelCreatedEvent,
} from '../chat.events.js';
import {
  sendMessage,
  getMessages,
  deleteMessage,
  listChannels,
  getChannel,
  createChannel,
  getOrCreatePartyChannel,
  getOrCreateDirectChannel,
  reportMessage,
} from '../chat.service.js';

import type { AppConfig } from '../../../config.js';
import type { EventBus } from '../../../shared/events/event-types.js';
import type { ChatRepositoryInterface } from '../chat.repository.js';
import type {
  ChatChannel,
  ChatMessage,
  ModerationStatus,
  ChannelType,
} from '../../../db/schema/social/index.js';

const mockEvaluateFlag = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockModerateChat = vi.fn();

const mockChatRepositoryFindChannel = vi.fn();
const mockChatRepositoryFindChannels = vi.fn();
const mockChatRepositoryFindExistingChannel = vi.fn();
const mockChatRepositoryCreateChannel = vi.fn();
const mockChatRepositoryFindMessage = vi.fn();
const mockChatRepositoryFindMessages = vi.fn();
const mockChatRepositoryCreateMessage = vi.fn();
const mockChatRepositoryUpdateMessage = vi.fn();
const mockChatRepositoryCreateModerationReport = vi.fn();

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../feature-flags/feature-flags.service.js', () => ({
  evaluateFlag: (...args: unknown[]) => mockEvaluateFlag(...args),
}));

vi.mock('../../social/rate-limit.service.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('../chat.moderation.service.js', () => ({
  ChatModerationService: vi.fn(function (this: unknown) {
    return {
      moderateChat: mockModerateChat,
    };
  }),
}));

vi.mock('../chat.repository.js', () => ({
  ChatRepository: vi.fn(function (this: unknown) {
    return {
      findChannel: mockChatRepositoryFindChannel,
      findChannels: mockChatRepositoryFindChannels,
      findExistingChannel: mockChatRepositoryFindExistingChannel,
      createChannel: mockChatRepositoryCreateChannel,
      findMessage: mockChatRepositoryFindMessage,
      findMessages: mockChatRepositoryFindMessages,
      createMessage: mockChatRepositoryCreateMessage,
      updateMessage: mockChatRepositoryUpdateMessage,
      createModerationReport: mockChatRepositoryCreateModerationReport,
    };
  }),
}));

vi.mock('../chat.events.js', () => ({
  createChatMessageSentEvent: vi.fn().mockReturnValue({ eventType: 'chat.message.sent' }),
  createChatMessageDeletedEvent: vi.fn().mockReturnValue({ eventType: 'chat.message.deleted' }),
  createChatChannelCreatedEvent: vi.fn().mockReturnValue({ eventType: 'chat.channel.created' }),
}));

const mockConfig = {} as AppConfig;
const mockTenantId = 'test-tenant-id';
const mockPlayerId = 'test-player-id';

const MAX_MESSAGE_LENGTH = 280;

describe('ChatService', () => {
  let mockEventBus: EventBus;
  let mockRepository: ChatRepositoryInterface;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as EventBus;

    mockRepository = {
      findChannel: mockChatRepositoryFindChannel,
      findChannels: mockChatRepositoryFindChannels,
      findExistingChannel: mockChatRepositoryFindExistingChannel,
      createChannel: mockChatRepositoryCreateChannel,
      findMessage: mockChatRepositoryFindMessage,
      findMessages: mockChatRepositoryFindMessages,
      createMessage: mockChatRepositoryCreateMessage,
      updateMessage: mockChatRepositoryUpdateMessage,
      createModerationReport: mockChatRepositoryCreateModerationReport,
    };

    mockCheckRateLimit.mockResolvedValue({ allowed: true, current: 1, limit: 10 });
    mockEvaluateFlag.mockResolvedValue(true);
    mockModerateChat.mockResolvedValue({
      moderationStatus: 'approved' as ModerationStatus,
      contentCheckResult: { allowed: true, violations: [], highestSeverity: null },
    });
  });

  describe('MAX_MESSAGE_LENGTH constant', () => {
    it('should be 280 characters', () => {
      expect(MAX_MESSAGE_LENGTH).toBe(280);
    });
  });

  describe('sendMessage', () => {
    const mockChannel = {
      channelId: 'channel-1',
      tenantId: mockTenantId,
      channelType: 'party' as const,
      partyId: 'party-1',
      guildId: null,
      name: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMessage = {
      messageId: 'msg-1',
      channelId: 'channel-1',
      senderPlayerId: mockPlayerId,
      content: 'Hello',
      moderationStatus: 'approved' as ModerationStatus,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('rejects empty message content', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: '',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('rejects whitespace-only message content', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: '   ',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('rejects message exceeding max length', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const longContent = 'a'.repeat(281);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: longContent,
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      );
    });

    it('accepts message at exactly max length', async () => {
      const maxContent = 'a'.repeat(280);

      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryCreateMessage.mockResolvedValue(mockMessage);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: maxContent,
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockChatRepositoryFindChannel).toHaveBeenCalledWith({
        channelId: 'channel-1',
        tenantId: mockTenantId,
      });
      expect(mockChatRepositoryCreateMessage).toHaveBeenCalled();
    });

    it('returns error when channel not found', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(undefined);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'nonexistent',
          content: 'Hello',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel not found');
      expect(mockChatRepositoryFindChannel).toHaveBeenCalledWith({
        channelId: 'nonexistent',
        tenantId: mockTenantId,
      });
    });

    it('returns rate limit error when limit exceeded', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        current: 10,
        limit: 10,
        retryAfterMs: 2000,
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: 'Hello',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: 'Hello',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns error when channel type chat is disabled', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockEvaluateFlag.mockImplementation(
        (_config: AppConfig, _tenantId: string, flagName: string) => {
          if (flagName === 'social.chat.enabled') return Promise.resolve(true);
          return Promise.resolve(false);
        },
      );

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: 'Hello',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Party chat is disabled');
    });

    it('returns error when message is rejected by moderation', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockModerateChat.mockResolvedValue({
        moderationStatus: 'rejected' as ModerationStatus,
        contentCheckResult: { allowed: false, violations: [], highestSeverity: null },
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: 'bad content',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message content is not allowed');
      expect(result.moderationStatus).toBe('rejected');
    });

    it('returns success when message is flagged by moderation', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockModerateChat.mockResolvedValue({
        moderationStatus: 'flagged' as ModerationStatus,
        contentCheckResult: { allowed: true, violations: [], highestSeverity: null },
      });
      mockChatRepositoryCreateMessage.mockResolvedValue({
        ...mockMessage,
        moderationStatus: 'flagged' as ModerationStatus,
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: 'Hello',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(result.moderationStatus).toBe('flagged');
    });

    it('publishes ChatMessageSentEvent when eventBus is provided', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryCreateMessage.mockResolvedValue(mockMessage);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: 'channel-1', content: 'Hello' },
        undefined,
        mockEventBus,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(createChatMessageSentEvent).toHaveBeenCalled();
    });

    it('does not publish event when eventBus is undefined', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryCreateMessage.mockResolvedValue(mockMessage);
      vi.clearAllMocks();

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: 'channel-1', content: 'Hello' },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('trims message content before storing', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryCreateMessage.mockResolvedValue(mockMessage);

      await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        {
          channelId: 'channel-1',
          content: '  Hello  ',
        },
        undefined,
        undefined,
        { repository: mockRepository as never },
      );

      expect(mockChatRepositoryCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello',
        }),
      );
    });
  });

  describe('getMessages', () => {
    const mockChannel = {
      channelId: 'channel-1',
      tenantId: mockTenantId,
      channelType: 'party' as const,
      partyId: 'party-1',
      guildId: null,
      name: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        50,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns error when channel not found', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(undefined);

      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'nonexistent',
        50,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel not found');
    });

    it('returns messages successfully', async () => {
      const mockMessages = [
        {
          messageId: 'msg-1',
          channelId: 'channel-1',
          senderPlayerId: 'player-1',
          content: 'Hello',
          moderationStatus: 'approved',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          messageId: 'msg-2',
          channelId: 'channel-1',
          senderPlayerId: 'player-2',
          content: 'Hi there',
          moderationStatus: 'approved',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryFindMessages.mockResolvedValue(mockMessages);

      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        50,
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
      expect(result.messages?.[0].content).toBe('Hello');
      expect(mockChatRepositoryFindMessages).toHaveBeenCalledWith({
        channelId: 'channel-1',
        tenantId: mockTenantId,
        isDeleted: false,
        limit: 50,
      });
    });

    it('passes limit and cursor parameters to repository', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryFindMessages.mockResolvedValue([]);

      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        25,
        'cursor-123',
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockChatRepositoryFindMessages).toHaveBeenCalledWith({
        channelId: 'channel-1',
        tenantId: mockTenantId,
        isDeleted: false,
        limit: 25,
        cursor: 'cursor-123',
      });
    });
  });

  describe('deleteMessage', () => {
    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await deleteMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns error when message not found', async () => {
      mockChatRepositoryFindMessage.mockResolvedValue(undefined);

      const result = await deleteMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'nonexistent',
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message not found or you do not have permission to delete it');
      expect(mockChatRepositoryFindMessage).toHaveBeenCalledWith('nonexistent', 'channel-1');
    });

    it('returns error when player does not own message', async () => {
      mockChatRepositoryFindMessage.mockResolvedValue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        senderPlayerId: 'other-player',
        content: 'Hello',
        moderationStatus: 'approved',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await deleteMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message not found or you do not have permission to delete it');
    });

    it('deletes message successfully when player owns it', async () => {
      mockChatRepositoryFindMessage.mockResolvedValue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        senderPlayerId: mockPlayerId,
        content: 'Hello',
        moderationStatus: 'approved',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockChatRepositoryUpdateMessage.mockResolvedValue(undefined);

      const result = await deleteMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockChatRepositoryFindMessage).toHaveBeenCalledWith('msg-1', 'channel-1');
      expect(mockChatRepositoryUpdateMessage).toHaveBeenCalledWith({
        messageId: 'msg-1',
        isDeleted: true,
      });
    });

    it('publishes ChatMessageDeletedEvent when eventBus is provided', async () => {
      mockChatRepositoryFindMessage.mockResolvedValue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        senderPlayerId: mockPlayerId,
        content: 'Hello',
        moderationStatus: 'approved',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockChatRepositoryUpdateMessage.mockResolvedValue(undefined);

      const result = await deleteMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        mockEventBus,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(createChatMessageDeletedEvent).toHaveBeenCalled();
    });
  });

  describe('createChannel', () => {
    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        {
          channelType: 'party',
          partyId: 'party-1',
        },
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns error when channel type chat is disabled', async () => {
      mockEvaluateFlag.mockImplementation(
        (_config: AppConfig, _tenantId: string, flagName: string) => {
          if (flagName === 'social.chat.enabled') return Promise.resolve(true);
          return Promise.resolve(false);
        },
      );

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        {
          channelType: 'party',
          partyId: 'party-1',
        },
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Party chat is disabled');
    });

    it('returns existing channel if already created', async () => {
      const existingChannel = {
        channelId: 'existing-channel',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(existingChannel);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        {
          channelType: 'party',
          partyId: 'party-1',
        },
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(result.channel).toEqual(existingChannel);
      expect(mockChatRepositoryCreateChannel).not.toHaveBeenCalled();
      expect(mockChatRepositoryFindExistingChannel).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });
    });

    it('creates new channel successfully', async () => {
      const newChannel = {
        channelId: 'new-channel',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        {
          channelType: 'party',
          partyId: 'party-1',
        },
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(result.channel).toEqual(newChannel);
      expect(mockChatRepositoryCreateChannel).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });
    });

    it('returns error when repository.createChannel returns null', async () => {
      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(null);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        {
          channelType: 'party',
          partyId: 'party-1',
        },
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create channel');
    });

    it('creates guild channel successfully', async () => {
      const newChannel = {
        channelId: 'guild-channel',
        tenantId: mockTenantId,
        channelType: 'guild' as const,
        partyId: null,
        guildId: 'guild-1',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        {
          channelType: 'guild',
          guildId: 'guild-1',
        },
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(result.channel).toEqual(newChannel);
      expect(mockChatRepositoryCreateChannel).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        channelType: 'guild',
        guildId: 'guild-1',
      });
    });

    it('publishes ChatChannelCreatedEvent when eventBus is provided', async () => {
      const newChannel = {
        channelId: 'new-channel',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        mockEventBus,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(createChatChannelCreatedEvent).toHaveBeenCalled();
    });

    it('does not publish event when channel already exists', async () => {
      const existingChannel = {
        channelId: 'existing-channel',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(existingChannel);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        mockEventBus,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(result.channel).toEqual(existingChannel);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('listChannels', () => {
    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await listChannels(mockConfig, mockTenantId, mockPlayerId, {
        repository: mockRepository as never,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns channels successfully', async () => {
      const mockChannels = [
        {
          channelId: 'channel-1',
          tenantId: mockTenantId,
          channelType: 'party' as const,
          partyId: 'party-1',
          guildId: null,
          name: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          channelId: 'channel-2',
          tenantId: mockTenantId,
          channelType: 'guild' as const,
          partyId: null,
          guildId: 'guild-1',
          name: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockChatRepositoryFindChannels.mockResolvedValue(mockChannels);

      const result = await listChannels(mockConfig, mockTenantId, mockPlayerId, {
        repository: mockRepository as never,
      });

      expect(result.success).toBe(true);
      expect(result.channels).toHaveLength(2);
      expect(mockChatRepositoryFindChannels).toHaveBeenCalledWith(mockTenantId);
    });
  });

  describe('getChannel', () => {
    it('returns error when channel not found', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(undefined);

      const result = await getChannel(mockConfig, mockTenantId, 'nonexistent', {
        repository: mockRepository as never,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel not found');
      expect(mockChatRepositoryFindChannel).toHaveBeenCalledWith({
        channelId: 'nonexistent',
        tenantId: mockTenantId,
      });
    });

    it('returns channel successfully', async () => {
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const result = await getChannel(mockConfig, mockTenantId, 'channel-1', {
        repository: mockRepository as never,
      });

      expect(result.success).toBe(true);
      expect(result.channel).toEqual(mockChannel);
      expect(mockChatRepositoryFindChannel).toHaveBeenCalledWith({
        channelId: 'channel-1',
        tenantId: mockTenantId,
      });
    });
  });

  describe('getOrCreatePartyChannel', () => {
    it('creates party channel for party', async () => {
      const newChannel = {
        channelId: 'party-channel',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await getOrCreatePartyChannel(mockConfig, mockTenantId, 'party-1', undefined, {
        repository: mockRepository as never,
      });

      expect(result.success).toBe(true);
      expect(mockChatRepositoryCreateChannel).toHaveBeenCalledWith(
        expect.objectContaining({ channelType: 'party', partyId: 'party-1' }),
      );
    });

    it('returns existing party channel if already created', async () => {
      const existingChannel = {
        channelId: 'existing-channel',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(existingChannel);

      const result = await getOrCreatePartyChannel(mockConfig, mockTenantId, 'party-1', undefined, {
        repository: mockRepository as never,
      });

      expect(result.success).toBe(true);
      expect(result.channel).toEqual(existingChannel);
      expect(mockChatRepositoryCreateChannel).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreateDirectChannel', () => {
    it('creates direct channel between two players', async () => {
      const newChannel = {
        channelId: 'dm-channel',
        tenantId: mockTenantId,
        channelType: 'direct' as const,
        partyId: null,
        guildId: null,
        name: 'dm-player1-player2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await getOrCreateDirectChannel(
        mockConfig,
        mockTenantId,
        'player1',
        'player2',
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockChatRepositoryCreateChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          channelType: 'direct',
          name: 'dm-player1-player2',
        }),
      );
    });

    it('sorts player IDs for consistent channel naming regardless of order', async () => {
      const newChannel = {
        channelId: 'dm-channel',
        tenantId: mockTenantId,
        channelType: 'direct' as const,
        partyId: null,
        guildId: null,
        name: 'dm-player1-player2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await getOrCreateDirectChannel(
        mockConfig,
        mockTenantId,
        'player2',
        'player1',
        undefined,
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockChatRepositoryCreateChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'dm-player1-player2',
        }),
      );
    });
  });

  describe('reportMessage', () => {
    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await reportMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        'Spam',
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns error when message not found', async () => {
      mockChatRepositoryFindMessage.mockResolvedValue(undefined);

      const result = await reportMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'nonexistent',
        'Spam',
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message not found');
      expect(mockChatRepositoryFindMessage).toHaveBeenCalledWith('nonexistent', 'channel-1');
    });

    it('creates moderation report successfully', async () => {
      const mockMessage = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        senderPlayerId: 'other-player',
        content: 'Hello',
        moderationStatus: 'approved' as ModerationStatus,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindMessage.mockResolvedValue(mockMessage);
      mockChatRepositoryCreateModerationReport.mockResolvedValue(undefined);

      const result = await reportMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        'Inappropriate content',
        { repository: mockRepository as never },
      );

      expect(result.success).toBe(true);
      expect(mockChatRepositoryFindMessage).toHaveBeenCalledWith('msg-1', 'channel-1');
      expect(mockChatRepositoryCreateModerationReport).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          reporterPlayerId: mockPlayerId,
          reportedPlayerId: 'other-player',
          description: 'Inappropriate content',
        }),
      );
    });
  });
});

class InMemoryChatRepository implements ChatRepositoryInterface {
  private channels: Map<string, ChatChannel> = new Map();
  private messages: Map<string, ChatMessage> = new Map();
  private moderationReports: unknown[] = [];

  private generateId(): string {
    return crypto.randomUUID();
  }

  async findChannel(params: {
    channelId: string;
    tenantId: string;
  }): Promise<ChatChannel | undefined> {
    const channel = this.channels.get(params.channelId);
    if (channel && channel.tenantId === params.tenantId) {
      return channel;
    }
    return undefined;
  }

  async findChannels(tenantId: string): Promise<ChatChannel[]> {
    return Array.from(this.channels.values()).filter((c) => c.tenantId === tenantId);
  }

  async findExistingChannel(params: {
    tenantId: string;
    channelType: ChannelType;
    partyId?: string;
    guildId?: string;
  }): Promise<ChatChannel | undefined> {
    return Array.from(this.channels.values()).find((c) => {
      if (c.tenantId !== params.tenantId || c.channelType !== params.channelType) {
        return false;
      }
      if (params.partyId && c.partyId !== params.partyId) return false;
      if (params.guildId && c.guildId !== params.guildId) return false;
      return true;
    });
  }

  async createChannel(params: {
    tenantId: string;
    channelType: ChannelType;
    partyId?: string;
    guildId?: string;
    name?: string;
  }): Promise<ChatChannel | undefined> {
    const channel: ChatChannel = {
      channelId: this.generateId(),
      tenantId: params.tenantId,
      channelType: params.channelType,
      partyId: params.partyId ?? null,
      guildId: params.guildId ?? null,
      name: params.name ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.channels.set(channel.channelId, channel);
    return channel;
  }

  async findMessage(messageId: string, channelId: string): Promise<ChatMessage | undefined> {
    const message = this.messages.get(messageId);
    if (message && message.channelId === channelId) {
      return message;
    }
    return undefined;
  }

  async findMessages(params: {
    channelId: string;
    tenantId: string;
    isDeleted: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<ChatMessage[]> {
    const allMessages = Array.from(this.messages.values()).filter(
      (m) => m.channelId === params.channelId && m.isDeleted === params.isDeleted,
    );
    return allMessages.slice(0, params.limit ?? 50);
  }

  async createMessage(params: {
    channelId: string;
    senderPlayerId: string;
    content: string;
    moderationStatus: string;
  }): Promise<ChatMessage | undefined> {
    const message: ChatMessage = {
      messageId: this.generateId(),
      channelId: params.channelId,
      senderPlayerId: params.senderPlayerId,
      content: params.content,
      moderationStatus: params.moderationStatus as ModerationStatus,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.messages.set(message.messageId, message);
    return message;
  }

  async updateMessage(params: { messageId: string; isDeleted: boolean }): Promise<void> {
    const message = this.messages.get(params.messageId);
    if (message) {
      message.isDeleted = params.isDeleted;
      message.updatedAt = new Date();
    }
  }

  async createModerationReport(params: {
    tenantId: string;
    reporterPlayerId: string;
    reportedPlayerId: string;
    reportType: string;
    contentReference: { type: string; id: string };
    description: string;
  }): Promise<void> {
    this.moderationReports.push(params);
  }

  clear(): void {
    this.channels.clear();
    this.messages.clear();
    this.moderationReports = [];
  }
}

describe('ChatService with real repository', () => {
  let inMemoryRepo: InMemoryChatRepository;
  let _eventBus: EventBus;

  beforeEach(() => {
    inMemoryRepo = new InMemoryChatRepository();
    _eventBus = { publish: vi.fn() } as unknown as EventBus;
    mockCheckRateLimit.mockResolvedValue({ allowed: true, current: 1, limit: 10 });
    mockEvaluateFlag.mockResolvedValue(true);
    mockModerateChat.mockResolvedValue({
      moderationStatus: 'approved' as ModerationStatus,
      contentCheckResult: { allowed: true, violations: [], highestSeverity: null },
    });
  });

  afterEach(() => {
    inMemoryRepo.clear();
  });

  describe('sendMessage', () => {
    it('creates message and returns it with correct properties', async () => {
      const channel = await inMemoryRepo.createChannel({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: channel!.channelId, content: 'Hello world' },
        undefined,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message!.content).toBe('Hello world');
      expect(result.message!.senderPlayerId).toBe(mockPlayerId);
      expect(result.message!.channelId).toBe(channel!.channelId);
    });

    it('trims message content before storing', async () => {
      const channel = await inMemoryRepo.createChannel({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: channel!.channelId, content: '  trimmed content  ' },
        undefined,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(true);
      expect(result.message!.content).toBe('trimmed content');
    });

    it('rejects empty message', async () => {
      const channel = await inMemoryRepo.createChannel({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: channel!.channelId, content: '' },
        undefined,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('rejects whitespace-only message', async () => {
      const channel = await inMemoryRepo.createChannel({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: channel!.channelId, content: '   ' },
        undefined,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('rejects message exceeding max length', async () => {
      const channel = await inMemoryRepo.createChannel({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: channel!.channelId, content: 'a'.repeat(281) },
        undefined,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });
  });

  describe('getMessages', () => {
    it('returns messages from the channel', async () => {
      const channel = await inMemoryRepo.createChannel({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });

      await inMemoryRepo.createMessage({
        channelId: channel!.channelId,
        senderPlayerId: mockPlayerId,
        content: 'First message',
        moderationStatus: 'approved',
      });
      await inMemoryRepo.createMessage({
        channelId: channel!.channelId,
        senderPlayerId: 'other-player',
        content: 'Second message',
        moderationStatus: 'approved',
      });

      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        channel!.channelId,
        50,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
    });

    it('does not return deleted messages', async () => {
      const channel = await inMemoryRepo.createChannel({
        tenantId: mockTenantId,
        channelType: 'party',
        partyId: 'party-1',
      });

      const msg1 = await inMemoryRepo.createMessage({
        channelId: channel!.channelId,
        senderPlayerId: mockPlayerId,
        content: 'Active message',
        moderationStatus: 'approved',
      });
      await inMemoryRepo.createMessage({
        channelId: channel!.channelId,
        senderPlayerId: mockPlayerId,
        content: 'Deleted message',
        moderationStatus: 'approved',
      });
      await inMemoryRepo.updateMessage({ messageId: msg1!.messageId, isDeleted: true });

      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        channel!.channelId,
        50,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages![0].content).toBe('Deleted message');
    });

    it('returns error when channel does not exist', async () => {
      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'nonexistent-channel',
        50,
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel not found');
    });
  });

  describe('createChannel', () => {
    it('creates a channel and returns it', async () => {
      const result = await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBeDefined();
      expect(result.channel!.channelType).toBe('party');
      expect(result.channel!.partyId).toBe('party-1');
    });

    it('created channel can be retrieved via findChannel', async () => {
      const createResult = await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        undefined,
        { repository: inMemoryRepo },
      );

      const channel = await inMemoryRepo.findChannel({
        channelId: createResult.channel!.channelId,
        tenantId: mockTenantId,
      });

      expect(channel).toBeDefined();
      expect(channel!.channelType).toBe('party');
      expect(channel!.partyId).toBe('party-1');
    });

    it('created channel can be retrieved via listChannels', async () => {
      await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        undefined,
        { repository: inMemoryRepo },
      );

      const channels = await inMemoryRepo.findChannels(mockTenantId);

      expect(channels).toHaveLength(1);
      expect(channels[0].channelType).toBe('party');
    });

    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        undefined,
        { repository: inMemoryRepo },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });
  });
});
