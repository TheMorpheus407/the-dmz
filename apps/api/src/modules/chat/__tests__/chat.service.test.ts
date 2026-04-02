import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDatabaseClient = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockEvaluateFlag = vi.fn();

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: (...args: unknown[]) => mockGetDatabaseClient(...args),
}));

vi.mock('../../feature-flags/feature-flags.service.js', () => ({
  evaluateFlag: (...args: unknown[]) => mockEvaluateFlag(...args),
}));

vi.mock('../../social/rate-limit.service.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const mockModerateChat = vi.fn();

vi.mock('../chat-moderation.service.js', () => ({
  ChatModerationService: vi.fn().mockImplementation(() => ({
    moderateChat: mockModerateChat,
  })),
}));

const mockChatRepository = {
  findChannel: vi.fn(),
  findChannels: vi.fn(),
  findExistingChannel: vi.fn(),
  createChannel: vi.fn(),
  findMessage: vi.fn(),
  findMessages: vi.fn(),
  createMessage: vi.fn(),
  updateMessage: vi.fn(),
  createModerationReport: vi.fn(),
};

vi.mock('../chat.repository.js', () => ({
  ChatRepository: vi.fn().mockImplementation(() => mockChatRepository),
}));

const mockEventBus = {
  publish: vi.fn(),
};

import { ChatRepository } from '../chat.repository.js';
import { ChatModerationService } from '../chat-moderation.service.js';
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
import type {
  ChannelType,
  ChatMessage,
  ModerationStatus,
} from '../../../db/schema/social/index.js';

const mockConfig = {} as AppConfig;
const mockTenantId = 'test-tenant-id';
const mockPlayerId = 'test-player-id';

const CHANNEL_TYPES = ['party', 'guild', 'direct'] as const;
const MODERATION_STATUSES = ['approved', 'flagged', 'rejected'] as const;
const MAX_MESSAGE_LENGTH = 280;

describe('chat service - channel types', () => {
  it('should have three channel types', () => {
    expect(CHANNEL_TYPES).toHaveLength(3);
  });

  it('should include party channel type', () => {
    expect(CHANNEL_TYPES).toContain('party');
  });

  it('should include guild channel type', () => {
    expect(CHANNEL_TYPES).toContain('guild');
  });

  it('should include direct channel type', () => {
    expect(CHANNEL_TYPES).toContain('direct');
  });
});

describe('chat service - moderation statuses', () => {
  it('should have three moderation statuses', () => {
    expect(MODERATION_STATUSES).toHaveLength(3);
  });

  it('should include approved status', () => {
    expect(MODERATION_STATUSES).toContain('approved');
  });

  it('should include flagged status', () => {
    expect(MODERATION_STATUSES).toContain('flagged');
  });

  it('should include rejected status', () => {
    expect(MODERATION_STATUSES).toContain('rejected');
  });
});

describe('chat service - message length constant', () => {
  it('should have max message length of 280 characters', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(280);
  });
});

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockCheckRateLimit.mockResolvedValue({ allowed: true, current: 1, limit: 10 });
    mockEvaluateFlag.mockResolvedValue(true);
    mockModerateChat.mockResolvedValue({
      moderationStatus: 'approved' as ModerationStatus,
      contentCheckResult: { allowed: true, violations: [], highestSeverity: null },
    });

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

  it('rejects empty message content', async () => {
    const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
      channelId: 'channel-1',
      content: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Message cannot be empty');
  });

  it('rejects whitespace-only message content', async () => {
    const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
      channelId: 'channel-1',
      content: '   ',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Message cannot be empty');
  });

  it('rejects message exceeding max length', async () => {
    const longContent = 'a'.repeat(281);

    const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
      channelId: 'channel-1',
      content: longContent,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
  });

  it('accepts message at exactly max length', async () => {
    const maxContent = 'a'.repeat(280);
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

    const mockMsg = {
      messageId: 'msg-1',
      channelId: 'channel-1',
      senderPlayerId: mockPlayerId,
      content: maxContent,
      moderationStatus: 'approved' as ModerationStatus,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);
    mockChatRepository.createMessage.mockResolvedValue(mockMsg);

    const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
      channelId: 'channel-1',
      content: maxContent,
    });

    expect(result.success).toBe(true);
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
      channelId: 'channel-1',
      tenantId: mockTenantId,
    });
    expect(mockChatRepository.createMessage).toHaveBeenCalled();
  });

  it('returns error when channel not found', async () => {
    mockChatRepository.findChannel.mockResolvedValue(undefined);

    const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
      channelId: 'nonexistent',
      content: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Channel not found');
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
      channelId: 'nonexistent',
      tenantId: mockTenantId,
    });
  });

  it('returns rate limit error when limit exceeded', async () => {
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

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);
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
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
      channelId: 'channel-1',
      tenantId: mockTenantId,
    });
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

  it('returns error when message is rejected by moderation', async () => {
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

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);
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
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
      channelId: 'channel-1',
      tenantId: mockTenantId,
    });
  });

  it('returns success when message is flagged by moderation', async () => {
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

    const mockMsg = {
      messageId: 'msg-1',
      channelId: 'channel-1',
      senderPlayerId: mockPlayerId,
      content: 'Hello',
      moderationStatus: 'flagged' as ModerationStatus,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);
    mockModerateChat.mockResolvedValue({
      moderationStatus: 'flagged' as ModerationStatus,
      contentCheckResult: { allowed: true, violations: [], highestSeverity: null },
    });
    mockChatRepository.createMessage.mockResolvedValue(mockMsg);

    const result = await sendMessage(mockConfig, mockTenantId, mockPlayerId, {
      channelId: 'channel-1',
      content: 'Hello',
    });

    expect(result.success).toBe(true);
    expect(result.message).toEqual(mockMsg);
    expect(result.moderationStatus).toBe('flagged');
  });

  it('publishes ChatMessageSentEvent when eventBus is provided', async () => {
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

    const mockMsg = {
      messageId: 'msg-1',
      channelId: 'channel-1',
      senderPlayerId: mockPlayerId,
      content: 'Hello',
      moderationStatus: 'approved' as ModerationStatus,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);
    mockChatRepository.createMessage.mockResolvedValue(mockMsg);
    vi.clearAllMocks();
    mockEventBus.publish.mockReset();

    const result = await sendMessage(
      mockConfig,
      mockTenantId,
      mockPlayerId,
      {
        channelId: 'channel-1',
        content: 'Hello',
      },
      undefined,
      mockEventBus as never,
    );

    expect(result.success).toBe(true);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});

describe('getMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

  it('returns error when chat is disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);

    const result = await getMessages(mockConfig, mockTenantId, mockPlayerId, 'channel-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Chat is disabled');
  });

  it('returns error when channel not found', async () => {
    mockChatRepository.findChannel.mockResolvedValue(undefined);

    const result = await getMessages(mockConfig, mockTenantId, mockPlayerId, 'nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Channel not found');
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
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

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);
    mockChatRepository.findMessages.mockResolvedValue(mockMessages);

    const result = await getMessages(mockConfig, mockTenantId, mockPlayerId, 'channel-1');

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.messages?.[0].content).toBe('Hello');
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
      channelId: 'channel-1',
      tenantId: mockTenantId,
    });
    expect(mockChatRepository.findMessages).toHaveBeenCalledWith({
      channelId: 'channel-1',
      tenantId: mockTenantId,
      isDeleted: false,
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

    const mockMessages: ChatMessage[] = [];

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);
    mockChatRepository.findMessages.mockResolvedValue(mockMessages);

    const result = await getMessages(
      mockConfig,
      mockTenantId,
      mockPlayerId,
      'channel-1',
      25,
      'cursor-123',
    );

    expect(result.success).toBe(true);
    expect(mockChatRepository.findMessages).toHaveBeenCalledWith({
      channelId: 'channel-1',
      tenantId: mockTenantId,
      isDeleted: false,
      limit: 25,
      cursor: 'cursor-123',
    });
  });
});

describe('deleteMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

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
    mockChatRepository.findMessage.mockResolvedValue(undefined);

    const result = await deleteMessage(
      mockConfig,
      mockTenantId,
      mockPlayerId,
      'channel-1',
      'nonexistent',
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Message not found or you do not have permission to delete it');
    expect(mockChatRepository.findMessage).toHaveBeenCalledWith('nonexistent', 'channel-1');
  });

  it('returns error when player does not own message', async () => {
    mockChatRepository.findMessage.mockResolvedValue({
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
    expect(mockChatRepository.findMessage).toHaveBeenCalledWith('msg-1', 'channel-1');
  });

  it('deletes message successfully when player owns it', async () => {
    mockChatRepository.findMessage.mockResolvedValue({
      messageId: 'msg-1',
      channelId: 'channel-1',
      senderPlayerId: mockPlayerId,
      content: 'Hello',
      moderationStatus: 'approved',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockChatRepository.updateMessage.mockResolvedValue(undefined);

    const result = await deleteMessage(
      mockConfig,
      mockTenantId,
      mockPlayerId,
      'channel-1',
      'msg-1',
    );

    expect(result.success).toBe(true);
    expect(mockChatRepository.findMessage).toHaveBeenCalledWith('msg-1', 'channel-1');
    expect(mockChatRepository.updateMessage).toHaveBeenCalledWith({
      messageId: 'msg-1',
      isDeleted: true,
    });
  });

  it('publishes ChatMessageDeletedEvent when eventBus is provided', async () => {
    mockChatRepository.findMessage.mockResolvedValue({
      messageId: 'msg-1',
      channelId: 'channel-1',
      senderPlayerId: mockPlayerId,
      content: 'Hello',
      moderationStatus: 'approved',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockChatRepository.updateMessage.mockResolvedValue(undefined);
    vi.clearAllMocks();
    mockEventBus.publish.mockReset();

    const result = await deleteMessage(
      mockConfig,
      mockTenantId,
      mockPlayerId,
      'channel-1',
      'msg-1',
      mockEventBus as never,
    );

    expect(result.success).toBe(true);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});

describe('createChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

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
    mockEvaluateFlag.mockImplementation((config, tenantId, flagName) => {
      if (flagName === 'social.chat.enabled') return Promise.resolve(true);
      return Promise.resolve(false);
    });

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

    mockChatRepository.findExistingChannel.mockResolvedValue(existingChannel);

    const result = await createChannel(mockConfig, mockTenantId, {
      channelType: 'party',
      partyId: 'party-1',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toEqual(existingChannel);
    expect(mockChatRepository.createChannel).not.toHaveBeenCalled();
    expect(mockChatRepository.findExistingChannel).toHaveBeenCalledWith({
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

    mockChatRepository.findExistingChannel.mockResolvedValue(undefined);
    mockChatRepository.createChannel.mockResolvedValue(newChannel);

    const result = await createChannel(mockConfig, mockTenantId, {
      channelType: 'party',
      partyId: 'party-1',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toEqual(newChannel);
    expect(mockChatRepository.findExistingChannel).toHaveBeenCalledWith({
      tenantId: mockTenantId,
      channelType: 'party',
      partyId: 'party-1',
    });
    expect(mockChatRepository.createChannel).toHaveBeenCalledWith({
      tenantId: mockTenantId,
      channelType: 'party',
      partyId: 'party-1',
    });
  });

  it('returns error when repository.createChannel returns null', async () => {
    mockChatRepository.findExistingChannel.mockResolvedValue(undefined);
    mockChatRepository.createChannel.mockResolvedValue(null);

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

    mockChatRepository.findExistingChannel.mockResolvedValue(undefined);
    mockChatRepository.createChannel.mockResolvedValue(newChannel);

    const result = await createChannel(mockConfig, mockTenantId, {
      channelType: 'guild',
      guildId: 'guild-1',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toEqual(newChannel);
    expect(mockChatRepository.createChannel).toHaveBeenCalledWith({
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

    mockChatRepository.findExistingChannel.mockResolvedValue(undefined);
    mockChatRepository.createChannel.mockResolvedValue(newChannel);
    vi.clearAllMocks();
    mockEventBus.publish.mockReset();

    const result = await createChannel(
      mockConfig,
      mockTenantId,
      {
        channelType: 'party',
        partyId: 'party-1',
      },
      mockEventBus as never,
    );

    expect(result.success).toBe(true);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});

describe('listChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

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

    mockChatRepository.findChannels.mockResolvedValue(mockChannels);

    const result = await listChannels(mockConfig, mockTenantId, mockPlayerId);

    expect(result.success).toBe(true);
    expect(result.channels).toHaveLength(2);
    expect(mockChatRepository.findChannels).toHaveBeenCalledWith(mockTenantId);
  });
});

describe('getChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

  it('returns error when channel not found', async () => {
    mockChatRepository.findChannel.mockResolvedValue(undefined);

    const result = await getChannel(mockConfig, mockTenantId, 'nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Channel not found');
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
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

    mockChatRepository.findChannel.mockResolvedValue(mockChannel);

    const result = await getChannel(mockConfig, mockTenantId, 'channel-1');

    expect(result.success).toBe(true);
    expect(result.channel).toEqual(mockChannel);
    expect(mockChatRepository.findChannel).toHaveBeenCalledWith({
      channelId: 'channel-1',
      tenantId: mockTenantId,
    });
  });
});

describe('getOrCreatePartyChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

  it('creates party channel with correct channelType', async () => {
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

    mockChatRepository.findExistingChannel.mockResolvedValue(undefined);
    mockChatRepository.createChannel.mockResolvedValue(newChannel);

    const result = await getOrCreatePartyChannel(mockConfig, mockTenantId, 'party-1');

    expect(result.success).toBe(true);
    expect(mockChatRepository.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ channelType: 'party', partyId: 'party-1' }),
    );
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

    mockChatRepository.findExistingChannel.mockResolvedValue(existingChannel);

    const result = await getOrCreatePartyChannel(mockConfig, mockTenantId, 'party-1');

    expect(result.success).toBe(true);
    expect(result.channel).toEqual(existingChannel);
    expect(mockChatRepository.createChannel).not.toHaveBeenCalled();
  });
});

describe('getOrCreateDirectChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

  it('creates direct channel with dm- prefix', async () => {
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

    mockChatRepository.findExistingChannel.mockResolvedValue(undefined);
    mockChatRepository.createChannel.mockResolvedValue(newChannel);

    const result = await getOrCreateDirectChannel(mockConfig, mockTenantId, 'player1', 'player2');

    expect(result.success).toBe(true);
    expect(mockChatRepository.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        channelType: 'direct',
        name: 'dm-player1-player2',
      }),
    );
  });

  it('sorts player IDs for consistent channel naming', async () => {
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

    mockChatRepository.findExistingChannel.mockResolvedValue(undefined);
    mockChatRepository.createChannel.mockResolvedValue(newChannel);

    const result = await getOrCreateDirectChannel(mockConfig, mockTenantId, 'player2', 'player1');

    expect(result.success).toBe(true);
    expect(mockChatRepository.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'dm-player1-player2',
      }),
    );
  });
});

describe('reportMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockEvaluateFlag.mockResolvedValue(true);

    mockChatRepository.findChannel.mockReset();
    mockChatRepository.findChannels.mockReset();
    mockChatRepository.findExistingChannel.mockReset();
    mockChatRepository.createChannel.mockReset();
    mockChatRepository.findMessage.mockReset();
    mockChatRepository.findMessages.mockReset();
    mockChatRepository.createMessage.mockReset();
    mockChatRepository.updateMessage.mockReset();
    mockChatRepository.createModerationReport.mockReset();
  });

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
    mockChatRepository.findMessage.mockResolvedValue(undefined);

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
    expect(mockChatRepository.findMessage).toHaveBeenCalledWith('nonexistent', 'channel-1');
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

    mockChatRepository.findMessage.mockResolvedValue(mockMessage);
    mockChatRepository.createModerationReport.mockResolvedValue(undefined);

    const result = await reportMessage(
      mockConfig,
      mockTenantId,
      mockPlayerId,
      'channel-1',
      'msg-1',
      'Inappropriate content',
    );

    expect(result.success).toBe(true);
    expect(mockChatRepository.findMessage).toHaveBeenCalledWith('msg-1', 'channel-1');
    expect(mockChatRepository.createModerationReport).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: mockTenantId,
        reporterPlayerId: mockPlayerId,
        reportedPlayerId: 'other-player',
        description: 'Inappropriate content',
      }),
    );
  });
});
