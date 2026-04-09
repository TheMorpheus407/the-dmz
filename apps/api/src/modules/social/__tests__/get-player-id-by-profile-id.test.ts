import { describe, expect, it, vi, beforeEach } from 'vitest';

import { getPlayerIdByProfileId } from '../player-profiles.service.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';

describe('player-profiles service - getPlayerIdByProfileId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return profileId and userId when profile exists', async () => {
    const mockProfile = {
      profileId: 'profile-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      displayName: 'TestPlayer',
      avatarId: null,
      privacyMode: 'public' as const,
      bio: null,
      socialVisibility: {},
      seasonRank: null,
      skillRatingBlue: null,
      skillRatingRed: null,
      skillRatingCoop: null,
      totalSessionsPlayed: 0,
      currentStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: null,
    };

    const mockDb = {
      query: {
        playerProfiles: {
          findFirst: vi.fn().mockResolvedValue(mockProfile),
        },
      },
    } as unknown as DatabaseClient;

    const result = await getPlayerIdByProfileId(mockDb, 'tenant-789', 'profile-123');

    expect(result).toEqual({
      profileId: 'profile-123',
      userId: 'user-456',
    });
  });

  it('should return undefined when profile does not exist', async () => {
    const mockDb = {
      query: {
        playerProfiles: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as DatabaseClient;

    const result = await getPlayerIdByProfileId(mockDb, 'tenant-789', 'non-existent-profile');

    expect(result).toBeUndefined();
  });

  it('should query playerProfiles with correct conditions', async () => {
    const mockProfile = {
      profileId: 'profile-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      displayName: 'TestPlayer',
      avatarId: null,
      privacyMode: 'public' as const,
      bio: null,
      socialVisibility: {},
      seasonRank: null,
      skillRatingBlue: null,
      skillRatingRed: null,
      skillRatingCoop: null,
      totalSessionsPlayed: 0,
      currentStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: null,
    };

    let capturedWhere: unknown = null;
    const mockFindFirst = vi.fn().mockImplementation((args) => {
      capturedWhere = args?.where;
      return Promise.resolve(mockProfile);
    });

    const mockDb = {
      query: {
        playerProfiles: {
          findFirst: mockFindFirst,
        },
      },
    } as unknown as DatabaseClient;

    const result = await getPlayerIdByProfileId(mockDb, 'tenant-789', 'profile-123');

    expect(mockFindFirst).toHaveBeenCalled();
    expect(result).toEqual({ profileId: 'profile-123', userId: 'user-456' });
    expect(capturedWhere).toBeDefined();
    const found: string[] = [];
    const visited = new WeakSet();
    function search(obj: unknown): void {
      if (obj === null || obj === undefined || visited.has(obj as object)) return;
      if (typeof obj === 'object') {
        visited.add(obj as object);
        const o = obj as Record<string, unknown>;
        for (const key of Object.keys(o)) {
          const val = o[key];
          if (typeof val === 'string' && val) {
            found.push(val);
          } else if (val && typeof val === 'object') {
            search(val);
          }
        }
      }
    }
    search(capturedWhere);
    expect(found).toContain('profile-123');
    expect(found).toContain('tenant-789');
  });

  it('should only return profileId and userId, not full profile data', async () => {
    const mockProfile = {
      profileId: 'profile-123',
      userId: 'user-456',
      tenantId: 'tenant-789',
      displayName: 'TestPlayer',
      avatarId: 'avatar-001',
      privacyMode: 'public' as const,
      bio: 'This is my bio',
      socialVisibility: { showOnlineStatus: true },
      seasonRank: 42,
      skillRatingBlue: 1500,
      skillRatingRed: 1400,
      skillRatingCoop: 1300,
      totalSessionsPlayed: 100,
      currentStreak: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
    };

    const mockDb = {
      query: {
        playerProfiles: {
          findFirst: vi.fn().mockResolvedValue(mockProfile),
        },
      },
    } as unknown as DatabaseClient;

    const result = await getPlayerIdByProfileId(mockDb, 'tenant-789', 'profile-123');

    expect(result).toEqual({
      profileId: 'profile-123',
      userId: 'user-456',
    });
    expect(result).not.toHaveProperty('displayName');
    expect(result).not.toHaveProperty('avatarId');
    expect(result).not.toHaveProperty('bio');
    expect(result).not.toHaveProperty('seasonRank');
    expect(result).not.toHaveProperty('skillRatingBlue');
    expect(result).not.toHaveProperty('skillRatingRed');
    expect(result).not.toHaveProperty('skillRatingCoop');
    expect(result).not.toHaveProperty('totalSessionsPlayed');
    expect(result).not.toHaveProperty('currentStreak');
    expect(result).not.toHaveProperty('socialVisibility');
  });

  it('should return undefined when tenantId is empty string', async () => {
    const mockDb = {
      query: {
        playerProfiles: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as DatabaseClient;

    const result = await getPlayerIdByProfileId(mockDb, '', 'profile-123');

    expect(result).toBeUndefined();
  });

  it('should return undefined when profileId is empty string', async () => {
    const mockDb = {
      query: {
        playerProfiles: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as DatabaseClient;

    const result = await getPlayerIdByProfileId(mockDb, 'tenant-789', '');

    expect(result).toBeUndefined();
  });

  it('should throw when database query throws an error', async () => {
    const mockDb = {
      query: {
        playerProfiles: {
          findFirst: vi.fn().mockRejectedValue(new Error('Database error')),
        },
      },
    } as unknown as DatabaseClient;

    await expect(getPlayerIdByProfileId(mockDb, 'tenant-789', 'profile-123')).rejects.toThrow(
      'Database error',
    );
  });
});
