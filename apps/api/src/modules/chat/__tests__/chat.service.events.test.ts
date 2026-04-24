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

vi.mock('../chat.moderation.service.js', () => ({
  ChatModerationService: vi.fn().mockImplementation(() => ({
    moderateChat: vi.fn().mockResolvedValue({
      moderationStatus: 'approved',
      contentCheckResult: { allowed: true, violations: [], highestSeverity: null },
    }),
  })),
}));

vi.mock('../chat.repository.js', () => ({
  ChatRepository: vi.fn().mockImplementation(() => ({
    findChannel: vi.fn(),
    findChannels: vi.fn(),
    findExistingChannel: vi.fn(),
    createChannel: vi.fn(),
    findMessage: vi.fn(),
    findMessages: vi.fn(),
    createMessage: vi.fn(),
    updateMessage: vi.fn(),
    createModerationReport: vi.fn(),
  })),
}));

vi.mock('../chat.events.js', () => ({
  createChatMessageSentEvent: vi.fn().mockReturnValue({ eventType: 'chat.message.sent' }),
  createChatMessageDeletedEvent: vi.fn().mockReturnValue({ eventType: 'chat.message.deleted' }),
  createChatChannelCreatedEvent: vi.fn().mockReturnValue({ eventType: 'chat.channel.created' }),
}));

import { ChatModerationService } from '../chat.moderation.service.js';
import {
  createChatMessageSentEvent,
  createChatMessageDeletedEvent,
  createChatChannelCreatedEvent,
} from '../chat.events.js';
import { sendMessage, deleteMessage, createChannel } from '../chat.service.js';

import type { AppConfig } from '../../../config.js';
import type { IEventBus } from '../../../shared/events/event-types.js';

const mockConfig = {} as AppConfig;
const mockTenantId = 'test-tenant-id';
const mockPlayerId = 'test-player-id';

describe('chat.service event bus integration', () => {
  let mockEventBus: IEventBus;
  let mockRepository: {
    findChannel: ReturnType<typeof vi.fn>;
    findChannels: ReturnType<typeof vi.fn>;
    findExistingChannel: ReturnType<typeof vi.fn>;
    createChannel: ReturnType<typeof vi.fn>;
    findMessage: ReturnType<typeof vi.fn>;
    findMessages: ReturnType<typeof vi.fn>;
    createMessage: ReturnType<typeof vi.fn>;
    updateMessage: ReturnType<typeof vi.fn>;
    createModerationReport: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockRepository = {
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

    mockGetDatabaseClient.mockReturnValue({} as never);
    mockCheckRateLimit.mockResolvedValue({ allowed: true, current: 1, limit: 10 });
    mockEvaluateFlag.mockResolvedValue(true);
  });

  describe('sendMessage', () => {
    it('publishes chat.message.sent event when eventBus provided', async () => {
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
        moderationStatus: 'approved' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findChannel).mockResolvedValue(mockChannel);
      vi.mocked(mockRepository.createMessage).mockResolvedValue(mockMessage);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: 'channel-1', content: 'Hello' },
        undefined,
        mockEventBus,
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith({ eventType: 'chat.message.sent' });
      expect(createChatMessageSentEvent).toHaveBeenCalledWith(
        'chat.service',
        'msg-1',
        expect.objectContaining({
          messageId: 'msg-1',
          channelId: 'channel-1',
          senderPlayerId: mockPlayerId,
        }),
        expect.objectContaining({ tenantId: mockTenantId }),
      );
    });

    it('does NOT fail when eventBus is undefined (backward compatible)', async () => {
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
        moderationStatus: 'approved' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findChannel).mockResolvedValue(mockChannel);
      vi.mocked(mockRepository.createMessage).mockResolvedValue(mockMessage);

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

    it('does NOT publish event when moderation rejects message', async () => {
      vi.mocked(ChatModerationService).mockImplementation(() => ({
        moderateChat: vi.fn().mockResolvedValue({
          moderationStatus: 'rejected',
          contentCheckResult: { allowed: false, violations: [], highestSeverity: 'block' },
        }),
      }));

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

      vi.mocked(mockRepository.findChannel).mockResolvedValue(mockChannel);

      const result = await sendMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        { channelId: 'channel-1', content: 'bad content' },
        undefined,
        mockEventBus,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message content is not allowed');
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('publishes chat.message.deleted event', async () => {
      const mockMessage = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        senderPlayerId: mockPlayerId,
        content: 'Hello',
        moderationStatus: 'approved' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findMessage).mockResolvedValue(mockMessage);
      vi.mocked(mockRepository.updateMessage).mockResolvedValue(undefined);

      const result = await deleteMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        mockEventBus,
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith({ eventType: 'chat.message.deleted' });
      expect(createChatMessageDeletedEvent).toHaveBeenCalledWith(
        'chat.service',
        'msg-1',
        expect.objectContaining({ messageId: 'msg-1', channelId: 'channel-1' }),
        expect.objectContaining({ tenantId: mockTenantId }),
      );
    });

    it('does NOT publish event when eventBus is undefined', async () => {
      const mockMessage = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        senderPlayerId: mockPlayerId,
        content: 'Hello',
        moderationStatus: 'approved' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findMessage).mockResolvedValue(mockMessage);
      vi.mocked(mockRepository.updateMessage).mockResolvedValue(undefined);

      const result = await deleteMessage(
        mockConfig,
        mockTenantId,
        mockPlayerId,
        'channel-1',
        'msg-1',
        undefined,
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('createChannel', () => {
    it('publishes chat.channel.created event', async () => {
      const mockChannel = {
        channelId: 'channel-new',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findExistingChannel).mockResolvedValue(undefined);
      vi.mocked(mockRepository.createChannel).mockResolvedValue(mockChannel);

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        mockEventBus,
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith({ eventType: 'chat.channel.created' });
      expect(createChatChannelCreatedEvent).toHaveBeenCalledWith(
        'chat.service',
        'channel-new',
        expect.objectContaining({ channelId: 'channel-new', channelType: 'party' }),
        expect.objectContaining({ tenantId: mockTenantId }),
      );
    });

    it('does NOT publish event when channel already exists', async () => {
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

      vi.mocked(mockRepository.findExistingChannel).mockResolvedValue(existingChannel);

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

    it('does NOT publish event when eventBus is undefined', async () => {
      vi.mocked(mockRepository.findExistingChannel).mockResolvedValue(undefined);
      vi.mocked(mockRepository.createChannel).mockResolvedValue({
        channelId: 'channel-new',
        tenantId: mockTenantId,
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
      });

      const result = await createChannel(
        mockConfig,
        mockTenantId,
        { channelType: 'party', partyId: 'party-1' },
        undefined,
      );

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
