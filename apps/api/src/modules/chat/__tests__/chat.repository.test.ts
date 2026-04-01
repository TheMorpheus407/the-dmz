import { randomUUID } from 'crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

import { getDatabaseClient } from '../../shared/database/connection.js';

import { ChatRepository } from './chat.repository.js';

import type { DatabaseClient } from '../../shared/database/connection.js';

const mockDb = {
  query: {
    chatChannel: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    chatMessage: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as DatabaseClient;

describe('ChatRepository', () => {
  let repository: ChatRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
    repository = new ChatRepository(mockDb);
  });

  describe('findChannel', () => {
    it('returns channel when found by channelId and tenantId', async () => {
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: 'tenant-1',
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.query.chatChannel.findFirst).mockResolvedValue(mockChannel);

      const result = await repository.findChannel({ channelId: 'channel-1', tenantId: 'tenant-1' });

      expect(result).toEqual(mockChannel);
      expect(mockDb.query.chatChannel.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('returns undefined when channel not found', async () => {
      vi.mocked(mockDb.query.chatChannel.findFirst).mockResolvedValue(undefined);

      const result = await repository.findChannel({
        channelId: 'nonexistent',
        tenantId: 'tenant-1',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('findChannels', () => {
    it('returns channels ordered by createdAt desc', async () => {
      const mockChannels = [
        {
          channelId: 'channel-1',
          tenantId: 'tenant-1',
          channelType: 'party' as const,
          createdAt: new Date('2026-01-02'),
        },
        {
          channelId: 'channel-2',
          tenantId: 'tenant-1',
          channelType: 'guild' as const,
          createdAt: new Date('2026-01-01'),
        },
      ];

      vi.mocked(mockDb.query.chatChannel.findMany).mockResolvedValue(mockChannels);

      const result = await repository.findChannels('tenant-1');

      expect(result).toEqual(mockChannels);
      expect(mockDb.query.chatChannel.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
        orderBy: expect.anything(),
      });
    });
  });

  describe('findExistingChannel', () => {
    it('finds existing channel with matching partyId', async () => {
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: 'tenant-1',
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.query.chatChannel.findFirst).mockResolvedValue(mockChannel);

      const result = await repository.findExistingChannel({
        tenantId: 'tenant-1',
        channelType: 'party',
        partyId: 'party-1',
      });

      expect(result).toEqual(mockChannel);
    });

    it('finds existing channel with matching guildId', async () => {
      const mockChannel = {
        channelId: 'channel-1',
        tenantId: 'tenant-1',
        channelType: 'guild' as const,
        partyId: null,
        guildId: 'guild-1',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.query.chatChannel.findFirst).mockResolvedValue(mockChannel);

      const result = await repository.findExistingChannel({
        tenantId: 'tenant-1',
        channelType: 'guild',
        guildId: 'guild-1',
      });

      expect(result).toEqual(mockChannel);
    });

    it('returns undefined when no channel found', async () => {
      vi.mocked(mockDb.query.chatChannel.findFirst).mockResolvedValue(undefined);

      const result = await repository.findExistingChannel({
        tenantId: 'tenant-1',
        channelType: 'party',
        partyId: 'nonexistent',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('createChannel', () => {
    it('inserts and returns new channel', async () => {
      const mockChannel = {
        channelId: 'channel-new',
        tenantId: 'tenant-1',
        channelType: 'party' as const,
        partyId: 'party-1',
        guildId: null,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockChannel]),
      });
      vi.mocked(mockDb.insert).mockReturnValue(mockInsert as never);

      const result = await repository.createChannel({
        tenantId: 'tenant-1',
        channelType: 'party',
        partyId: 'party-1',
      });

      expect(result).toEqual(mockChannel);
    });

    it('returns undefined when insert fails', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });
      vi.mocked(mockDb.insert).mockReturnValue(mockInsert as never);

      const result = await repository.createChannel({
        tenantId: 'tenant-1',
        channelType: 'party',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('findMessage', () => {
    it('returns message when found', async () => {
      const mockMessage = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        senderPlayerId: 'player-1',
        content: 'Hello',
        moderationStatus: 'approved' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockDb.query.chatMessage.findFirst).mockResolvedValue(mockMessage);

      const result = await repository.findMessage('msg-1', 'channel-1');

      expect(result).toEqual(mockMessage);
    });

    it('returns undefined when message not found', async () => {
      vi.mocked(mockDb.query.chatMessage.findFirst).mockResolvedValue(undefined);

      const result = await repository.findMessage('nonexistent', 'channel-1');

      expect(result).toBeUndefined();
    });
  });

  describe('createMessage', () => {
    it('inserts and returns new message', async () => {
      const mockMessage = {
        messageId: 'msg-new',
        channelId: 'channel-1',
        senderPlayerId: 'player-1',
        content: 'Hello',
        moderationStatus: 'approved' as const,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockMessage]),
      });
      vi.mocked(mockDb.insert).mockReturnValue(mockInsert as never);

      const result = await repository.createMessage({
        channelId: 'channel-1',
        senderPlayerId: 'player-1',
        content: 'Hello',
        moderationStatus: 'approved',
      });

      expect(result).toEqual(mockMessage);
    });

    it('returns undefined when insert fails', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });
      vi.mocked(mockDb.insert).mockReturnValue(mockInsert as never);

      const result = await repository.createMessage({
        channelId: 'channel-1',
        senderPlayerId: 'player-1',
        content: 'Hello',
        moderationStatus: 'approved',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('updateMessage', () => {
    it('sets isDeleted flag', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(mockDb.update).mockReturnValue(mockUpdate as never);

      await repository.updateMessage({ messageId: 'msg-1', isDeleted: true });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('createModerationReport', () => {
    it('inserts report with status pending', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'report-1' }]),
        }),
      });
      vi.mocked(mockDb.insert).mockReturnValue(mockInsert as never);

      await repository.createModerationReport({
        tenantId: 'tenant-1',
        reporterPlayerId: 'player-1',
        reportedPlayerId: 'player-2',
        reportType: 'content',
        contentReference: { type: 'chat_message', id: 'msg-1' },
        description: 'Test report',
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
