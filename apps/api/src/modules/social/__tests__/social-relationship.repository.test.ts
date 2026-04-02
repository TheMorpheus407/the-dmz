import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

import { getDatabaseClient } from '../../../shared/database/connection.js';
import { SocialRelationshipRepository } from '../social-relationship.repository.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';

describe('SocialRelationshipRepository', () => {
  let mockDb: DatabaseClient;
  let repository: SocialRelationshipRepository;

  const createMockDb = (): DatabaseClient => {
    const mockQueryResults: Record<string, unknown> = {};

    return {
      query: {
        socialRelationships: {
          findFirst: vi.fn().mockImplementation(() => Promise.resolve(mockQueryResults.findFirst)),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(mockQueryResults.findMany)),
        },
      },
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation(() => ({
          returning: vi.fn().mockImplementation(() => Promise.resolve([mockQueryResults.insert])),
        })),
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            returning: vi.fn().mockImplementation(() => Promise.resolve([mockQueryResults.update])),
          })),
        })),
      })),
      delete: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => Promise.resolve(mockQueryResults.delete)),
      })),
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => Promise.resolve(mockQueryResults.select)),
        })),
      })),
    } as unknown as DatabaseClient;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
    repository = new SocialRelationshipRepository(mockDb);
  });

  describe('findRelationshipsForPlayer', () => {
    it('returns relationships for player', async () => {
      const mockRelationships = [
        {
          relationshipId: 'rel-1',
          tenantId: 'tenant-1',
          requesterId: 'player-1',
          addresseeId: 'player-2',
          relationshipType: 'friend',
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.socialRelationships.findMany = vi.fn().mockResolvedValue(mockRelationships);

      const result = await repository.findRelationshipsForPlayer({
        tenantId: 'tenant-1',
        playerId: 'player-1',
      });

      expect(result).toEqual(mockRelationships);
      expect(mockDb.query.socialRelationships.findMany).toHaveBeenCalled();
    });

    it('returns empty array when no relationships found', async () => {
      mockDb.query.socialRelationships.findMany = vi.fn().mockResolvedValue([]);

      const result = await repository.findRelationshipsForPlayer({
        tenantId: 'tenant-1',
        playerId: 'player-1',
      });

      expect(result).toEqual([]);
    });
  });

  describe('findRelationshipBetweenPlayers', () => {
    it('returns relationship when found', async () => {
      const mockRelationship = {
        relationshipId: 'rel-1',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'friend',
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(mockRelationship);

      const result = await repository.findRelationshipBetweenPlayers({
        tenantId: 'tenant-1',
        playerId1: 'player-1',
        playerId2: 'player-2',
      });

      expect(result).toEqual(mockRelationship);
    });

    it('returns undefined when not found', async () => {
      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(undefined);

      const result = await repository.findRelationshipBetweenPlayers({
        tenantId: 'tenant-1',
        playerId1: 'player-1',
        playerId2: 'player-2',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('findPendingFriendRequest', () => {
    it('returns pending request when found', async () => {
      const mockRequest = {
        relationshipId: 'rel-1',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'friend',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(mockRequest);

      const result = await repository.findPendingFriendRequest({
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
      });

      expect(result).toEqual(mockRequest);
    });

    it('returns undefined when not found', async () => {
      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(undefined);

      const result = await repository.findPendingFriendRequest({
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('findFriendRequestBetweenPlayers', () => {
    it('returns friend request when found', async () => {
      const mockRequest = {
        relationshipId: 'rel-1',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'friend',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(mockRequest);

      const result = await repository.findFriendRequestBetweenPlayers({
        tenantId: 'tenant-1',
        playerId1: 'player-1',
        playerId2: 'player-2',
      });

      expect(result).toEqual(mockRequest);
    });
  });

  describe('findBlockBetweenPlayers', () => {
    it('returns block when found', async () => {
      const mockBlock = {
        relationshipId: 'rel-1',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'block',
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(mockBlock);

      const result = await repository.findBlockBetweenPlayers({
        tenantId: 'tenant-1',
        playerId1: 'player-1',
        playerId2: 'player-2',
      });

      expect(result).toEqual(mockBlock);
    });
  });

  describe('findExistingRelationship', () => {
    it('returns relationship when found', async () => {
      const mockRelationship = {
        relationshipId: 'rel-1',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'block',
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(mockRelationship);

      const result = await repository.findExistingRelationship({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        targetPlayerId: 'player-2',
        relationshipType: 'block',
      });

      expect(result).toEqual(mockRelationship);
    });
  });

  describe('findMuteRelationship', () => {
    it('returns mute relationship when found', async () => {
      const mockMute = {
        relationshipId: 'rel-1',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'mute',
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.socialRelationships.findFirst = vi.fn().mockResolvedValue(mockMute);

      const result = await repository.findMuteRelationship({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        targetPlayerId: 'player-2',
        relationshipType: 'mute',
      });

      expect(result).toEqual(mockMute);
    });
  });

  describe('findFriendship', () => {
    it('returns friendships when found', async () => {
      const mockRelationships = [
        {
          relationshipId: 'rel-1',
          tenantId: 'tenant-1',
          requesterId: 'player-1',
          addresseeId: 'player-2',
          relationshipType: 'friend',
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.socialRelationships.findMany = vi.fn().mockResolvedValue(mockRelationships);

      const result = await repository.findFriendship({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        friendId: 'player-2',
      });

      expect(result).toEqual(mockRelationships);
    });
  });

  describe('findFriendRequestsForPlayer', () => {
    it('returns accepted friend requests for player', async () => {
      const mockRequests = [
        {
          relationshipId: 'rel-1',
          tenantId: 'tenant-1',
          requesterId: 'player-1',
          addresseeId: 'player-2',
          relationshipType: 'friend',
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.socialRelationships.findMany = vi.fn().mockResolvedValue(mockRequests);

      const result = await repository.findFriendRequestsForPlayer({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        status: 'accepted',
      });

      expect(result).toEqual(mockRequests);
    });

    it('returns pending friend requests for player', async () => {
      const mockRequests = [
        {
          relationshipId: 'rel-1',
          tenantId: 'tenant-1',
          requesterId: 'player-2',
          addresseeId: 'player-1',
          relationshipType: 'friend',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.socialRelationships.findMany = vi.fn().mockResolvedValue(mockRequests);

      const result = await repository.findFriendRequestsForPlayer({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        status: 'pending',
      });

      expect(result).toEqual(mockRequests);
    });
  });

  describe('findBlockedPlayers', () => {
    it('returns blocked players', async () => {
      const mockBlocks = [
        {
          relationshipId: 'rel-1',
          tenantId: 'tenant-1',
          requesterId: 'player-1',
          addresseeId: 'player-2',
          relationshipType: 'block',
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.socialRelationships.findMany = vi.fn().mockResolvedValue(mockBlocks);

      const result = await repository.findBlockedPlayers({
        tenantId: 'tenant-1',
        playerId: 'player-1',
      });

      expect(result).toEqual(mockBlocks);
    });
  });

  describe('findMutedPlayers', () => {
    it('returns muted players', async () => {
      const mockMutes = [
        {
          relationshipId: 'rel-1',
          tenantId: 'tenant-1',
          requesterId: 'player-1',
          addresseeId: 'player-2',
          relationshipType: 'mute',
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.query.socialRelationships.findMany = vi.fn().mockResolvedValue(mockMutes);

      const result = await repository.findMutedPlayers({
        tenantId: 'tenant-1',
        playerId: 'player-1',
      });

      expect(result).toEqual(mockMutes);
    });
  });

  describe('countByType', () => {
    it('returns count of relationships by type', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 42 }]),
        }),
      });
      mockDb.select = mockSelect as never;

      const result = await repository.countByType({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        type: 'friend',
      });

      expect(result).toBe(42);
    });

    it('returns 0 when no count result', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select = mockSelect as never;

      const result = await repository.countByType({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        type: 'friend',
      });

      expect(result).toBe(0);
    });
  });

  describe('createRelationship', () => {
    it('creates and returns new relationship', async () => {
      const mockRelationship = {
        relationshipId: 'rel-new',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'friend',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([mockRelationship]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
      mockDb.insert = mockInsert as never;

      const result = await repository.createRelationship({
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'friend',
        status: 'pending',
      });

      expect(result).toEqual(mockRelationship);
    });

    it('returns undefined when insert fails', async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
      mockDb.insert = mockInsert as never;

      const result = await repository.createRelationship({
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'friend',
        status: 'pending',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('updateRelationship', () => {
    it('updates and returns relationship', async () => {
      const mockRelationship = {
        relationshipId: 'rel-1',
        tenantId: 'tenant-1',
        requesterId: 'player-1',
        addresseeId: 'player-2',
        relationshipType: 'friend',
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([mockRelationship]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
      mockDb.update = mockUpdate as never;

      const result = await repository.updateRelationship({
        relationshipId: 'rel-1',
        status: 'accepted',
      });

      expect(result).toEqual(mockRelationship);
    });
  });

  describe('deleteRelationship', () => {
    it('deletes relationship', async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.delete = mockDelete as never;

      await repository.deleteRelationship({ relationshipId: 'rel-1' });

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('deleteRelationships', () => {
    it('deletes multiple relationships', async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.delete = mockDelete as never;

      await repository.deleteRelationships({
        relationshipIds: ['rel-1', 'rel-2'],
      });

      expect(mockDelete).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteFriendShipsBetweenPlayers', () => {
    it('deletes friendships between players', async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.delete = mockDelete as never;

      await repository.deleteFriendShipsBetweenPlayers({
        tenantId: 'tenant-1',
        playerId: 'player-1',
        targetPlayerId: 'player-2',
      });

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
