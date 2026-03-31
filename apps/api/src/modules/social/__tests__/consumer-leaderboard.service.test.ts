import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  listLeaderboards,
  getLeaderboardById,
  getLeaderboardEntries,
  getPlayerPosition,
  getPlayerRanks,
  getFriendsLeaderboard,
  getGuildLeaderboard,
} from '../consumer-leaderboard.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../social-relationship.service.js', () => ({
  listFriends: vi.fn().mockResolvedValue([]),
}));

const mockEvaluateFlag = vi.fn().mockResolvedValue(true);

vi.mock('../../feature-flags/feature-flags.service.js', () => ({
  evaluateFlag: (...args: unknown[]) => mockEvaluateFlag(...args),
}));

const mockConfig = {
  tenantId: 'tenant-123',
  seasonId: 'season-123',
} as unknown as AppConfig;

const createMockDb = () => {
  const mockQueryResults: Map<string, unknown> = new Map();

  const mockDb = {
    query: {
      leaderboards: {
        findFirst: vi.fn().mockImplementation(async () => {
          return mockQueryResults.get('leaderboards.findFirst') ?? null;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          return mockQueryResults.get('leaderboards.findMany') ?? [];
        }),
      },
      leaderboardEntries: {
        findFirst: vi.fn().mockImplementation(async () => {
          return mockQueryResults.get('leaderboardEntries.findFirst') ?? null;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          return mockQueryResults.get('leaderboardEntries.findMany') ?? [];
        }),
      },
      playerProfiles: {
        findMany: vi.fn().mockImplementation(async () => {
          return mockQueryResults.get('playerProfiles.findMany') ?? [];
        }),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  };

  const setQueryResult = (key: string, result: unknown) => {
    mockQueryResults.set(key, result);
  };

  return { mockDb, setQueryResult, mockQueryResults };
};

describe('consumer-leaderboard service - listLeaderboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await listLeaderboards(mockConfig, 'tenant-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return leaderboards successfully', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const mockLeaderboards = [
      {
        leaderboardId: 'lb-1',
        scope: 'global',
        seasonId: 'season-1',
        rankingCategory: 'overall',
        timeFrame: 'seasonal',
        isActive: true,
      },
    ];
    setQueryResult('leaderboards.findMany', mockLeaderboards);

    const result = await listLeaderboards(mockConfig, 'tenant-123');

    expect(result.success).toBe(true);
    expect(result.leaderboards).toEqual(mockLeaderboards);
  });

  it('should filter by scope', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findMany', []);

    await listLeaderboards(mockConfig, 'tenant-123', { scope: 'global' });

    expect(mockDb.query.leaderboards.findMany).toHaveBeenCalled();
  });
});

describe('consumer-leaderboard service - getLeaderboardById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when leaderboard not found', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', null);

    const result = await getLeaderboardById(mockConfig, 'tenant-123', 'non-existent-id');

    expect(result).toBeNull();
  });

  it('should return leaderboard when found', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const mockLeaderboard = {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      isActive: true,
    };
    setQueryResult('leaderboards.findFirst', mockLeaderboard);

    const result = await getLeaderboardById(mockConfig, 'tenant-123', 'lb-1');

    expect(result).toEqual(mockLeaderboard);
  });
});

describe('consumer-leaderboard service - getLeaderboardEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getLeaderboardEntries(mockConfig, 'tenant-123', 'lb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when leaderboard not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', null);

    const result = await getLeaderboardEntries(mockConfig, 'tenant-123', 'non-existent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboard not found');
  });

  it('should return entries with player mapping', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      isActive: true,
    });

    const mockEntries = [
      {
        entryId: 'entry-1',
        leaderboardId: 'lb-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        score: 100,
        rank: 1,
        metrics: {},
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      },
    ];
    setQueryResult('leaderboardEntries.findMany', mockEntries);

    const mockPlayers = [
      {
        profileId: 'player-1',
        displayName: 'TestPlayer',
        avatarId: null,
        privacyMode: 'public',
      },
    ];
    setQueryResult('playerProfiles.findMany', mockPlayers);

    const result = await getLeaderboardEntries(mockConfig, 'tenant-123', 'lb-1');

    expect(result.success).toBe(true);
    expect(result.entries).toBeDefined();
    expect(result.entries![0]!.displayName).toBe('TestPlayer');
  });

  it('should apply pagination with limit and offset', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      isActive: true,
    });
    setQueryResult('leaderboardEntries.findMany', []);
    setQueryResult('playerProfiles.findMany', []);

    const result = await getLeaderboardEntries(mockConfig, 'tenant-123', 'lb-1', {
      limit: 10,
      offset: 5,
    });

    expect(result.success).toBe(true);
  });
});

describe('consumer-leaderboard service - getPlayerPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getPlayerPosition(mockConfig, 'tenant-123', 'player-1', 'lb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when leaderboard not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', null);

    const result = await getPlayerPosition(mockConfig, 'tenant-123', 'player-1', 'non-existent');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboard not found');
  });

  it('should return error when player not found', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', { leaderboardId: 'lb-1', isActive: true });
    setQueryResult('leaderboardEntries.findFirst', null);

    const result = await getPlayerPosition(mockConfig, 'tenant-123', 'player-1', 'lb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Player not found on this leaderboard');
  });

  it('should return rank and score when found', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', { leaderboardId: 'lb-1', isActive: true });
    setQueryResult('leaderboardEntries.findFirst', {
      playerId: 'player-1',
      score: 150,
      rank: 3,
    });

    const result = await getPlayerPosition(mockConfig, 'tenant-123', 'player-1', 'lb-1');

    expect(result.success).toBe(true);
    expect(result.rank).toBe(3);
    expect(result.score).toBe(150);
  });
});

describe('consumer-leaderboard service - getPlayerRanks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getPlayerRanks(mockConfig, 'tenant-123', 'player-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should filter out entries with no matching leaderboard', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const mockEntries = [
      { entryId: 'entry-1', leaderboardId: 'lb-1', playerId: 'player-1', score: 100, rank: 1 },
      {
        entryId: 'entry-2',
        leaderboardId: 'lb-deleted',
        playerId: 'player-1',
        score: 200,
        rank: 5,
      },
    ];
    setQueryResult('leaderboardEntries.findMany', mockEntries);

    const mockLeaderboards = [
      {
        leaderboardId: 'lb-1',
        scope: 'global',
        region: null,
        rankingCategory: 'overall',
        timeFrame: 'seasonal',
        isActive: true,
      },
    ];
    setQueryResult('leaderboards.findMany', mockLeaderboards);

    const result = await getPlayerRanks(mockConfig, 'tenant-123', 'player-1');

    expect(result.success).toBe(true);
    expect(result.ranks).toHaveLength(1);
    expect(result.ranks![0]!.leaderboardId).toBe('lb-1');
  });

  it('should return ranks successfully', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboardEntries.findMany', [
      { entryId: 'entry-1', leaderboardId: 'lb-1', playerId: 'player-1', score: 100, rank: 1 },
    ]);
    setQueryResult('leaderboards.findMany', [
      {
        leaderboardId: 'lb-1',
        scope: 'global',
        region: null,
        rankingCategory: 'overall',
        timeFrame: 'seasonal',
        isActive: true,
      },
    ]);

    const result = await getPlayerRanks(mockConfig, 'tenant-123', 'player-1');

    expect(result.success).toBe(true);
    expect(result.ranks).toBeDefined();
  });
});

describe('consumer-leaderboard service - getFriendsLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getFriendsLeaderboard(mockConfig, 'tenant-123', 'player-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when friends leaderboard not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', null);

    const result = await getFriendsLeaderboard(mockConfig, 'tenant-123', 'player-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Friends leaderboard not found');
  });

  it('should return visible entries filtered by friends', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', {
      leaderboardId: 'lb-friends',
      scope: 'friends',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      isActive: true,
    });

    const mockEntries = [
      {
        entryId: 'entry-1',
        leaderboardId: 'lb-friends',
        playerId: 'player-1',
        score: 100,
        rank: 1,
        tenantId: 'tenant-123',
        metrics: {},
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      },
      {
        entryId: 'entry-2',
        leaderboardId: 'lb-friends',
        playerId: 'friend-1',
        score: 90,
        rank: 2,
        tenantId: 'tenant-123',
        metrics: {},
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      },
      {
        entryId: 'entry-3',
        leaderboardId: 'lb-friends',
        playerId: 'stranger',
        score: 80,
        rank: 3,
        tenantId: 'tenant-123',
        metrics: {},
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      },
    ];
    setQueryResult('leaderboardEntries.findMany', mockEntries);

    setQueryResult('playerProfiles.findMany', [
      { profileId: 'player-1', displayName: 'Me', avatarId: null, privacyMode: 'public' },
      { profileId: 'friend-1', displayName: 'Friend', avatarId: null, privacyMode: 'public' },
      { profileId: 'stranger', displayName: 'Stranger', avatarId: null, privacyMode: 'public' },
    ]);

    const result = await getFriendsLeaderboard(mockConfig, 'tenant-123', 'player-1');

    expect(result.success).toBe(true);
    expect(result.entries).toBeDefined();
  });

  it('should use default seasonId and rankingCategory', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', {
      leaderboardId: 'lb-friends',
      scope: 'friends',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      isActive: true,
    });
    setQueryResult('leaderboardEntries.findMany', []);
    setQueryResult('playerProfiles.findMany', []);

    const result = await getFriendsLeaderboard(mockConfig, 'tenant-123', 'player-1');

    expect(result.success).toBe(true);
  });
});

describe('consumer-leaderboard service - getGuildLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getGuildLeaderboard(mockConfig, 'tenant-123', 'guild-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when guild leaderboard not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', null);

    const result = await getGuildLeaderboard(mockConfig, 'tenant-123', 'guild-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Guild leaderboard not found');
  });

  it('should return entries successfully', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', {
      leaderboardId: 'lb-guild',
      scope: 'guild',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      isActive: true,
    });

    const mockEntries = [
      {
        entryId: 'entry-1',
        leaderboardId: 'lb-guild',
        playerId: 'player-1',
        score: 100,
        rank: 1,
        tenantId: 'tenant-123',
        metrics: {},
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      },
    ];
    setQueryResult('leaderboardEntries.findMany', mockEntries);
    setQueryResult('playerProfiles.findMany', [
      { profileId: 'player-1', displayName: 'GuildMember', avatarId: null, privacyMode: 'public' },
    ]);

    const result = await getGuildLeaderboard(mockConfig, 'tenant-123', 'guild-1');

    expect(result.success).toBe(true);
    expect(result.entries).toBeDefined();
  });

  it('should apply pagination', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboards.findFirst', {
      leaderboardId: 'lb-guild',
      scope: 'guild',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      isActive: true,
    });
    setQueryResult('leaderboardEntries.findMany', []);
    setQueryResult('playerProfiles.findMany', []);

    const result = await getGuildLeaderboard(mockConfig, 'tenant-123', 'guild-1', {
      limit: 50,
    });

    expect(result.success).toBe(true);
  });
});
