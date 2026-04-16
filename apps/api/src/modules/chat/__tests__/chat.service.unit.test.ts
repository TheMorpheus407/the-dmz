import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDatabaseClient = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockEvaluateFlag = vi.hoisted(() => vi.fn());
const mockModerateChat = vi.hoisted(() => vi.fn());

const mockChatRepositoryFindChannel = vi.hoisted(() => vi.fn());
const mockChatRepositoryFindChannels = vi.hoisted(() => vi.fn());
const mockChatRepositoryFindExistingChannel = vi.hoisted(() => vi.fn());
const mockChatRepositoryCreateChannel = vi.hoisted(() => vi.fn());
const mockChatRepositoryFindMessage = vi.hoisted(() => vi.fn());
const mockChatRepositoryFindMessages = vi.hoisted(() => vi.fn());
const mockChatRepositoryCreateMessage = vi.hoisted(() => vi.fn());
const mockChatRepositoryUpdateMessage = vi.hoisted(() => vi.fn());
const mockChatRepositoryCreateModerationReport = vi.hoisted(() => vi.fn());

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: (...args: unknown[]) => mockGetDatabaseClient(...args),
}));

vi.mock('../../feature-flags/feature-flags.service.js', () => ({
  evaluateFlag: (...args: unknown[]) => mockEvaluateFlag(...args),
}));

vi.mock('../../social/rate-limit.service.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('../chat-moderation.service.js', () => ({
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
import type { IEventBus } from '../../../shared/events/event-types.js';
import type {
  ChannelType,
  ChatMessage,
  ModerationStatus,
} from '../../../db/schema/social/index.js';

const mockConfig = {} as AppConfig;
const mockTenantId = 'test-tenant-id';
const mockPlayerId = 'test-player-id';

const MAX_MESSAGE_LENGTH = 280;

describe('ChatService', () => {
  let mockEventBus: IEventBus;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockCheckRateLimit.mockResolvedValue({ allowed: true, current: 1, limit: 10 });
    mockEvaluateFlag.mockResolvedValue(true);
    mockModerateChat.mockResolvedValue({
      moderationStatus: 'approved' as ModerationStatus,
      contentCheckResult: { allowed: true, violations: [], highestSeverity: null },
    });

    mockChatRepositoryFindChannel.mockReset();
    mockChatRepositoryFindChannels.mockReset();
    mockChatRepositoryFindExistingChannel.mockReset();
    mockChatRepositoryCreateChannel.mockReset();
    mockChatRepositoryFindMessage.mockReset();
    mockChatRepositoryFindMessages.mockReset();
    mockChatRepositoryCreateMessage.mockReset();
    mockChatRepositoryUpdateMessage.mockReset();
    mockChatRepositoryCreateModerationReport.mockReset();
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
      channelType: 'party' as ChannelType,
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
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('rejects whitespace-only message content', async () => {
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('rejects message exceeding max length', async () => {
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const longContent = 'a'.repeat(281);

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: longContent,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      );
    });

    it('accepts message at exactly max length', async () => {
      const maxContent = 'a'.repeat(280);

      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryCreateMessage.mockResolvedValue(mockMessage);

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: maxContent,
      });

      expect(result.success).toBe(true);
      expect(mockChatRepositoryFindChannel).toHaveBeenCalledWith({
        channelId: 'channel-1',
        tenantId: mockTenantId,
      });
      expect(mockChatRepositoryCreateMessage).toHaveBeenCalled();
    });

    it('returns error when channel not found', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(undefined);

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'nonexistent',
        content: 'Hello',
      });

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

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: 'Hello',
      });

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

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Party chat is disabled');
    });

    it('returns error when message is rejected by moderation', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockModerateChat.mockResolvedValue({
        moderationStatus: 'rejected' as ModerationStatus,
        contentCheckResult: { allowed: false, violations: [], highestSeverity: null },
      });

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: 'bad content',
      });

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

      const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: 'Hello',
      });

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
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('trims message content before storing', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryCreateMessage.mockResolvedValue(mockMessage);

      await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
        channelId: 'channel-1',
        content: '  Hello  ',
      });

      expect(mockChatRepositoryCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello',
        }),
      );
    });
  });

  describe('getMessages', () => {
    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await getMessages(mockConfig, mockTenantId, mockPlayerId, 'channel-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns error when channel not found', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(undefined);

      const result = await getMessages(mockConfig, mockTenantId, mockPlayerId, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel not found');
      expect(mockChatRepositoryFindChannel).toHaveBeenCalledWith({
        channelId: 'nonexistent',
        tenantId: mockTenantId,
      });
    });

    it('returns messages successfully', async () => {
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMessages: ChatMessage[] = [
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

      const result = await getMessages(mockConfig, mockTenantId, mockPlayerId, 'channel-1');

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
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);
      mockChatRepositoryFindMessages.mockResolvedValue([]);

      const result = await getMessages(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        25,
        'cursor-123',
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
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(createChatMessageDeletedEvent).toHaveBeenCalled();
    });
  });

  describe('createChannel', () => {
    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await createChannel(mockConfig, mockTenantId, {
        channelType: 'party',
        partyId: 'party-1',
      });

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

      const result = await createChannel(mockConfig, mockTenantId, {
        channelType: 'party',
        partyId: 'party-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Party chat is disabled');
    });

    it('returns existing channel if already created', async () => {
      const existingChannel = {
        channelId: 'existing-channel',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(existingChannel);

      const result = await createChannel(mockConfig, mockTenantId, {
        channelType: 'party',
        partyId: 'party-1',
      });

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
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await createChannel(mockConfig, mockTenantId, {
        channelType: 'party',
        partyId: 'party-1',
      });

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

      const result = await createChannel(mockConfig, mockTenantId, {
        channelType: 'party',
        partyId: 'party-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create channel');
    });

    it('creates guild channel successfully', async () => {
      const newChannel = {
        channelId: 'guild-channel',
        tenantId: mockTenantId,
        channelType: 'guild' as ChannelType,
        partyId: null,
        guildId: 'guild-1',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await createChannel(mockConfig, mockTenantId, {
        channelType: 'guild',
        guildId: 'guild-1',
      });

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
        channelType: 'party' as ChannelType,
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
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(createChatChannelCreatedEvent).toHaveBeenCalled();
    });

    it('does not publish event when channel already exists', async () => {
      const existingChannel = {
        channelId: 'existing-channel',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
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
      );

      expect(result.success).toBe(true);
      expect(result.channel).toEqual(existingChannel);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('listChannels', () => {
    it('returns error when chat is disabled', async () => {
      mockEvaluateFlag.mockResolvedValue(false);

      const result = await listChannels(mockConfig, mockTenantId, mockPlayerId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat is disabled');
    });

    it('returns channels successfully', async () => {
      const mockChannels = [
        {
          channelId: 'channel-1',
          tenantId: mockTenantId,
          channelType: 'party' as ChannelType,
          partyId: 'party-1',
          guildId: null,
          name: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          channelId: 'channel-2',
          tenantId: mockTenantId,
          channelType: 'guild' as ChannelType,
          partyId: null,
          guildId: 'guild-1',
          name: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockChatRepositoryFindChannels.mockResolvedValue(mockChannels);

      const result = await listChannels(mockConfig, mockTenantId, mockPlayerId);

      expect(result.success).toBe(true);
      expect(result.channels).toHaveLength(2);
      expect(mockChatRepositoryFindChannels).toHaveBeenCalledWith(mockTenantId);
    });
  });

  describe('getChannel', () => {
    it('returns error when channel not found', async () => {
      mockChatRepositoryFindChannel.mockResolvedValue(undefined);

      const result = await getChannel(mockConfig, mockTenantId, 'nonexistent');

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
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindChannel.mockResolvedValue(mockChannel);

      const result = await getChannel(mockConfig, mockTenantId, 'channel-1');

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
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await getOrCreatePartyChannel(mockConfig, mockTenantId, 'party-1');

      expect(result.success).toBe(true);
      expect(mockChatRepositoryCreateChannel).toHaveBeenCalledWith(
        expect.objectContaining({ channelType: 'party', partyId: 'party-1' }),
      );
    });

    it('returns existing party channel if already created', async () => {
      const existingChannel = {
        channelId: 'existing-channel',
        tenantId: mockTenantId,
        channelType: 'party' as ChannelType,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(existingChannel);

      const result = await getOrCreatePartyChannel(mockConfig, mockTenantId, 'party-1');

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
        channelType: 'direct' as ChannelType,
        partyId: null,
        guildId: null,
        name: 'dm-player1-player2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await getOrCreateDirectChannel(mockConfig, mockTenantId, 'player1', 'player2');

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
        channelType: 'direct' as ChannelType,
        partyId: null,
        guildId: null,
        name: 'dm-player1-player2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatRepositoryFindExistingChannel.mockResolvedValue(undefined);
      mockChatRepositoryCreateChannel.mockResolvedValue(newChannel);

      const result = await getOrCreateDirectChannel(mockConfig, mockTenantId, 'player2', 'player1');

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
