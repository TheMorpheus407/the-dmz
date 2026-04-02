import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/cache/index.js', () => ({
  getCachedRelationships: vi.fn(),
  setCachedRelationships: vi.fn(),
  invalidateRelationshipCache: vi.fn(),
  invalidateBothPlayersRelationshipCache: vi.fn(),
}));

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockPlayer,
  unblockPlayer,
  mutePlayer,
  unmutePlayer,
  getRelationshipStatus,
  getRelationshipCounts,
  listFriends,
  listPendingFriendRequests,
  listBlockedPlayers,
  listMutedPlayers,
  getRelationshipPrecedence,
  resolveRelationship,
} from '../social-relationship.service.js';
import {
  getCachedRelationships,
  invalidateRelationshipCache,
  invalidateBothPlayersRelationshipCache,
} from '../../../shared/cache/index.js';

import type { SocialRelationshipRepository } from '../social-relationship.repository.js';
import type { AppConfig } from '../../../config.js';
import type { SocialRelationship } from '../../../db/schema/social/index.js';

const mockRepository = {
  findRelationshipsForPlayer: vi.fn(),
  findRelationshipBetweenPlayers: vi.fn(),
  findPendingFriendRequest: vi.fn(),
  findFriendRequestBetweenPlayers: vi.fn(),
  findBlockBetweenPlayers: vi.fn(),
  findExistingRelationship: vi.fn(),
  findMuteRelationship: vi.fn(),
  findFriendship: vi.fn(),
  findFriendRequestsForPlayer: vi.fn(),
  findBlockedPlayers: vi.fn(),
  findMutedPlayers: vi.fn(),
  countByType: vi.fn(),
  createRelationship: vi.fn(),
  updateRelationship: vi.fn(),
  deleteRelationship: vi.fn(),
  deleteRelationships: vi.fn(),
  deleteFriendShipsBetweenPlayers: vi.fn(),
} as unknown as SocialRelationshipRepository;

const mockConfig = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
} as unknown as AppConfig;

const TENANT_ID = 'tenant-1';
const PLAYER_ID = 'player-1';
const OTHER_PLAYER_ID = 'player-2';

const createMockRelationship = (
  overrides: Partial<SocialRelationship> = {},
): SocialRelationship => ({
  relationshipId: 'rel-1',
  tenantId: TENANT_ID,
  requesterId: PLAYER_ID,
  addresseeId: OTHER_PLAYER_ID,
  relationshipType: 'friend',
  status: 'accepted',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('social relationship service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRelationshipPrecedence', () => {
    it('should return correct precedence for block', () => {
      expect(getRelationshipPrecedence('block')).toBe(4);
    });

    it('should return correct precedence for friend', () => {
      expect(getRelationshipPrecedence('friend')).toBe(3);
    });

    it('should return correct precedence for mute', () => {
      expect(getRelationshipPrecedence('mute')).toBe(2);
    });
  });

  describe('resolveRelationship', () => {
    it('should return null when both relationships are undefined', () => {
      expect(resolveRelationship(undefined, undefined)).toBeNull();
    });

    it('should return first relationship when second is undefined and first is accepted', () => {
      const rel1 = { type: 'friend' as const, status: 'accepted' as const };
      expect(resolveRelationship(rel1, undefined)).toEqual(rel1);
    });

    it('should return null when first is undefined and second is pending', () => {
      const rel2 = { type: 'friend' as const, status: 'pending' as const };
      expect(resolveRelationship(undefined, rel2)).toBeNull();
    });

    it('should return accepted relationship when other is pending', () => {
      const rel1 = { type: 'friend' as const, status: 'accepted' as const };
      const rel2 = { type: 'block' as const, status: 'pending' as const };
      expect(resolveRelationship(rel1, rel2)).toEqual(rel1);
    });

    it('should return block when both are accepted and block takes precedence', () => {
      const rel1 = { type: 'friend' as const, status: 'accepted' as const };
      const rel2 = { type: 'block' as const, status: 'accepted' as const };
      expect(resolveRelationship(rel1, rel2)).toEqual(rel2);
    });

    it('should return null when both relationships are not accepted', () => {
      const rel1 = { type: 'friend' as const, status: 'pending' as const };
      const rel2 = { type: 'block' as const, status: 'pending' as const };
      expect(resolveRelationship(rel1, rel2)).toBeNull();
    });
  });

  describe('sendFriendRequest', () => {
    it('should reject self-friend requests', async () => {
      const result = await sendFriendRequest(
        mockConfig,
        TENANT_ID,
        {
          requesterId: PLAYER_ID,
          addresseeId: PLAYER_ID,
        },
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot send friend request to yourself');
    });

    it('should reject when already friends', async () => {
      mockRepository.findFriendRequestBetweenPlayers.mockResolvedValue(
        createMockRelationship({ status: 'accepted' }),
      );

      const result = await sendFriendRequest(
        mockConfig,
        TENANT_ID,
        {
          requesterId: PLAYER_ID,
          addresseeId: OTHER_PLAYER_ID,
        },
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already friends');
    });

    it('should reject when friend request is pending', async () => {
      mockRepository.findFriendRequestBetweenPlayers.mockResolvedValue(
        createMockRelationship({ status: 'pending' }),
      );

      const result = await sendFriendRequest(
        mockConfig,
        TENANT_ID,
        {
          requesterId: PLAYER_ID,
          addresseeId: OTHER_PLAYER_ID,
        },
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Friend request already pending');
    });

    it('should reject when player is blocked', async () => {
      mockRepository.findFriendRequestBetweenPlayers.mockResolvedValue(undefined);
      mockRepository.findBlockBetweenPlayers.mockResolvedValue(
        createMockRelationship({ relationshipType: 'block' }),
      );

      const result = await sendFriendRequest(
        mockConfig,
        TENANT_ID,
        {
          requesterId: PLAYER_ID,
          addresseeId: OTHER_PLAYER_ID,
        },
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot send friend request to blocked player');
    });

    it('should reject when max friends limit reached', async () => {
      mockRepository.findFriendRequestBetweenPlayers.mockResolvedValue(undefined);
      mockRepository.findBlockBetweenPlayers.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(500);

      const result = await sendFriendRequest(
        mockConfig,
        TENANT_ID,
        {
          requesterId: PLAYER_ID,
          addresseeId: OTHER_PLAYER_ID,
        },
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum friends limit');
    });

    it('should successfully send friend request', async () => {
      const mockRelationship = createMockRelationship({ status: 'pending' });
      mockRepository.findFriendRequestBetweenPlayers.mockResolvedValue(undefined);
      mockRepository.findBlockBetweenPlayers.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(0);
      mockRepository.createRelationship.mockResolvedValue(mockRelationship);

      const result = await sendFriendRequest(
        mockConfig,
        TENANT_ID,
        {
          requesterId: PLAYER_ID,
          addresseeId: OTHER_PLAYER_ID,
        },
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(result.relationship).toEqual(mockRelationship);
    });
  });

  describe('acceptFriendRequest', () => {
    it('should reject self-accept', async () => {
      const result = await acceptFriendRequest(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot accept friend request from yourself');
    });

    it('should reject when request not found', async () => {
      mockRepository.findPendingFriendRequest.mockResolvedValue(undefined);

      const result = await acceptFriendRequest(
        mockConfig,
        TENANT_ID,
        OTHER_PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Friend request not found');
    });

    it('should successfully accept friend request', async () => {
      const mockRequest = createMockRelationship({ status: 'pending' });
      const mockUpdated = createMockRelationship({ status: 'accepted' });

      mockRepository.findPendingFriendRequest.mockResolvedValue(mockRequest);
      mockRepository.updateRelationship.mockResolvedValue(mockUpdated);
      mockRepository.findFriendRequestBetweenPlayers.mockResolvedValue(undefined);

      const result = await acceptFriendRequest(
        mockConfig,
        TENANT_ID,
        OTHER_PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(result.relationship).toEqual(mockUpdated);
    });
  });

  describe('rejectFriendRequest', () => {
    it('should reject self-reject', async () => {
      const result = await rejectFriendRequest(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot reject friend request from yourself');
    });

    it('should reject when request not found', async () => {
      mockRepository.findPendingFriendRequest.mockResolvedValue(undefined);

      const result = await rejectFriendRequest(
        mockConfig,
        TENANT_ID,
        OTHER_PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Friend request not found');
    });

    it('should successfully reject friend request', async () => {
      const mockRequest = createMockRelationship({ status: 'pending' });
      const mockUpdated = createMockRelationship({ status: 'rejected' });

      mockRepository.findPendingFriendRequest.mockResolvedValue(mockRequest);
      mockRepository.updateRelationship.mockResolvedValue(mockUpdated);

      const result = await rejectFriendRequest(
        mockConfig,
        TENANT_ID,
        OTHER_PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('removeFriend', () => {
    it('should reject self-remove', async () => {
      const result = await removeFriend(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot remove yourself as a friend');
    });

    it('should reject when friendship not found', async () => {
      mockRepository.findFriendship.mockResolvedValue([]);

      const result = await removeFriend(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Friendship not found');
    });

    it('should successfully remove friend', async () => {
      const mockRelationships = [
        createMockRelationship(),
        createMockRelationship({ requesterId: OTHER_PLAYER_ID, addresseeId: PLAYER_ID }),
      ];

      mockRepository.findFriendship.mockResolvedValue(mockRelationships);
      mockRepository.deleteRelationships.mockResolvedValue(undefined);

      const result = await removeFriend(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(mockRepository.deleteRelationships).toHaveBeenCalledWith({
        relationshipIds: mockRelationships.map((r) => r.relationshipId),
      });
    });
  });

  describe('blockPlayer', () => {
    it('should reject self-block', async () => {
      const result = await blockPlayer(mockConfig, TENANT_ID, PLAYER_ID, PLAYER_ID, mockRepository);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot block yourself');
    });

    it('should reject when already blocked', async () => {
      mockRepository.findExistingRelationship.mockResolvedValue(
        createMockRelationship({ relationshipType: 'block' }),
      );

      const result = await blockPlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already blocked');
    });

    it('should reject when max blocked limit reached', async () => {
      mockRepository.findExistingRelationship.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(1000);

      const result = await blockPlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum blocked users limit');
    });

    it('should succeed when blocked count is at MAX_BLOCKED - 1 (999)', async () => {
      const mockRelationship = createMockRelationship({ relationshipType: 'block' });

      mockRepository.findExistingRelationship.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(999);
      mockRepository.createRelationship.mockResolvedValue(mockRelationship);

      const result = await blockPlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(mockRepository.createRelationship).toHaveBeenCalledWith(
        expect.objectContaining({
          relationshipType: 'block',
          status: 'accepted',
        }),
      );
    });

    it('should successfully block player', async () => {
      const mockRelationship = createMockRelationship({ relationshipType: 'block' });

      mockRepository.findExistingRelationship.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(0);
      mockRepository.createRelationship.mockResolvedValue(mockRelationship);

      const result = await blockPlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(mockRepository.deleteFriendShipsBetweenPlayers).toHaveBeenCalled();
    });
  });

  describe('unblockPlayer', () => {
    it('should reject self-unblock', async () => {
      const result = await unblockPlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot unblock yourself');
    });

    it('should reject when block not found', async () => {
      mockRepository.findExistingRelationship.mockResolvedValue(undefined);

      const result = await unblockPlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Block relationship not found');
    });

    it('should successfully unblock player', async () => {
      const mockBlock = createMockRelationship({ relationshipType: 'block' });

      mockRepository.findExistingRelationship.mockResolvedValue(mockBlock);
      mockRepository.deleteRelationship.mockResolvedValue(undefined);

      const result = await unblockPlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('mutePlayer', () => {
    it('should reject self-mute', async () => {
      const result = await mutePlayer(mockConfig, TENANT_ID, PLAYER_ID, PLAYER_ID, mockRepository);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot mute yourself');
    });

    it('should reject when already muted', async () => {
      mockRepository.findMuteRelationship.mockResolvedValue(
        createMockRelationship({ relationshipType: 'mute' }),
      );

      const result = await mutePlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already muted');
    });

    it('should reject when max muted limit reached', async () => {
      mockRepository.findMuteRelationship.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(1000);

      const result = await mutePlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum muted users limit');
    });

    it('should succeed when muted count is at MAX_MUTED - 1 (999)', async () => {
      const mockRelationship = createMockRelationship({ relationshipType: 'mute' });

      mockRepository.findMuteRelationship.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(999);
      mockRepository.createRelationship.mockResolvedValue(mockRelationship);

      const result = await mutePlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(mockRepository.createRelationship).toHaveBeenCalledWith(
        expect.objectContaining({
          relationshipType: 'mute',
          status: 'accepted',
        }),
      );
    });

    it('should successfully mute player and call invalidateRelationshipCache', async () => {
      const mockRelationship = createMockRelationship({ relationshipType: 'mute' });

      mockRepository.findMuteRelationship.mockResolvedValue(undefined);
      mockRepository.countByType.mockResolvedValue(0);
      mockRepository.createRelationship.mockResolvedValue(mockRelationship);

      const result = await mutePlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(invalidateRelationshipCache).toHaveBeenCalledWith(mockConfig, TENANT_ID, PLAYER_ID);
    });
  });

  describe('unmutePlayer', () => {
    it('should reject self-unmute', async () => {
      const result = await unmutePlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot unmute yourself');
    });

    it('should reject when mute not found', async () => {
      mockRepository.findMuteRelationship.mockResolvedValue(undefined);

      const result = await unmutePlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mute relationship not found');
    });

    it('should successfully unmute player and call invalidateRelationshipCache', async () => {
      const mockMute = createMockRelationship({ relationshipType: 'mute' });

      mockRepository.findMuteRelationship.mockResolvedValue(mockMute);
      mockRepository.deleteRelationship.mockResolvedValue(undefined);

      const result = await unmutePlayer(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result.success).toBe(true);
      expect(invalidateRelationshipCache).toHaveBeenCalledWith(mockConfig, TENANT_ID, PLAYER_ID);
    });
  });

  describe('getRelationshipCounts', () => {
    it('should return correct counts', async () => {
      mockRepository.countByType
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const result = await getRelationshipCounts(mockConfig, TENANT_ID, PLAYER_ID, mockRepository);

      expect(result).toEqual({
        friends: 10,
        blocked: 5,
        muted: 3,
      });
    });
  });

  describe('listFriends', () => {
    it('should return list of friends', async () => {
      const mockFriends = [
        createMockRelationship(),
        createMockRelationship({ relationshipId: 'rel-2' }),
      ];

      mockRepository.findFriendRequestsForPlayer.mockResolvedValue(mockFriends);

      const result = await listFriends(mockConfig, TENANT_ID, PLAYER_ID, mockRepository);

      expect(result).toEqual(mockFriends);
      expect(mockRepository.findFriendRequestsForPlayer).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        playerId: PLAYER_ID,
        status: 'accepted',
      });
    });
  });

  describe('listPendingFriendRequests', () => {
    it('should return pending friend requests', async () => {
      const mockRequests = [createMockRelationship({ status: 'pending' })];

      mockRepository.findFriendRequestsForPlayer.mockResolvedValue(mockRequests);

      const result = await listPendingFriendRequests(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        mockRepository,
      );

      expect(result).toEqual(mockRequests);
      expect(mockRepository.findFriendRequestsForPlayer).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        playerId: PLAYER_ID,
        status: 'pending',
      });
    });
  });

  describe('listBlockedPlayers', () => {
    it('should return list of blocked players', async () => {
      const mockBlocks = [createMockRelationship({ relationshipType: 'block' })];

      mockRepository.findBlockedPlayers.mockResolvedValue(mockBlocks);

      const result = await listBlockedPlayers(mockConfig, TENANT_ID, PLAYER_ID, mockRepository);

      expect(result).toEqual(mockBlocks);
    });
  });

  describe('listMutedPlayers', () => {
    it('should return list of muted players', async () => {
      const mockMutes = [createMockRelationship({ relationshipType: 'mute' })];

      mockRepository.findMutedPlayers.mockResolvedValue(mockMutes);

      const result = await listMutedPlayers(mockConfig, TENANT_ID, PLAYER_ID, mockRepository);

      expect(result).toEqual(mockMutes);
    });
  });

  describe('getRelationshipStatus', () => {
    it('should return relationship status when found in cache', async () => {
      const cachedRelationships = {
        [OTHER_PLAYER_ID]: {
          relationshipType: 'friend' as const,
          status: 'accepted' as const,
          updatedAt: Date.now(),
        },
      };

      vi.mocked(getCachedRelationships).mockResolvedValue({
        relationships: cachedRelationships,
        cachedAt: Date.now(),
      });

      const result = await getRelationshipStatus(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result).toEqual(cachedRelationships[OTHER_PLAYER_ID]);
      expect(mockRepository.findRelationshipsForPlayer).not.toHaveBeenCalled();
    });

    it('should fetch from repository when cache returns null', async () => {
      vi.mocked(getCachedRelationships).mockResolvedValue(null);

      mockRepository.findRelationshipsForPlayer.mockResolvedValue([
        createMockRelationship({ relationshipType: 'friend', status: 'accepted' }),
      ]);

      const result = await getRelationshipStatus(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result).toBeTruthy();
      expect(result?.relationshipType).toBe('friend');
      expect(result?.status).toBe('accepted');
      expect(mockRepository.findRelationshipsForPlayer).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        playerId: PLAYER_ID,
      });
    });

    it('should return null when relationship not found', async () => {
      vi.mocked(getCachedRelationships).mockResolvedValue(null);
      mockRepository.findRelationshipsForPlayer.mockResolvedValue([]);

      const result = await getRelationshipStatus(
        mockConfig,
        TENANT_ID,
        PLAYER_ID,
        OTHER_PLAYER_ID,
        mockRepository,
      );

      expect(result).toBeNull();
    });
  });
});
