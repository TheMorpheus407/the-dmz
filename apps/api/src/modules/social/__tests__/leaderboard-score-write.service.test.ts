import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  updatePlayerScore,
  updateEnterprisePlayerScore,
  buildLeaderboardKey,
} from '../leaderboard-score.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { getRedisClient } from '../../../shared/database/redis.js';
import { createMockDb, createMockRedis } from '../../../__tests__/helpers/index.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../../shared/database/redis.js', () => ({
  getRedisClient: vi.fn(),
}));

const mockConfig = {
  tenantId: 'tenant-123',
  seasonId: 'season-123',
} as unknown as AppConfig;

const mockMetrics = {
  accuracy: 95,
  avgDecisionTime: 50000,
  incidentsResolved: 50,
  resourceEfficiency: 90,
};

const setupMockDb = () => {
  const mock = createMockDb();
  const { setInsertResult } = mock;
  return { mockDb: mock.mockDb, setQueryResult: mock.setQueryResult, setInsertResult };
};

const setupMockRedis = () => {
  return createMockRedis();
};

describe('leaderboard-score service - buildLeaderboardKey', () => {
  it('should build key with global scope and null region', () => {
    const key = buildLeaderboardKey('global', null, 'season-1', 'overall', 'seasonal');
    expect(key).toBe('leaderboard:global:global:season-1:overall:seasonal');
  });

  it('should build key with regional scope and region', () => {
    const key = buildLeaderboardKey('regional', 'NA', 'season-1', 'accuracy', 'weekly');
    expect(key).toBe('leaderboard:regional:NA:season-1:accuracy:weekly');
  });

  it('should use global for null region', () => {
    const key = buildLeaderboardKey('friends', null, 'season-1', 'overall', 'seasonal');
    expect(key).toBe('leaderboard:friends:global:season-1:overall:seasonal');
  });
});

describe('leaderboard-score service - updatePlayerScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert new player entry when no existing entry', async () => {
    const { mockDb, setQueryResult, setInsertResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('leaderboards', 'findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      timeFrame: 'seasonal',
      isActive: true,
    });
    setQueryResult('leaderboardEntries', 'findFirst', null);
    setInsertResult([{ entryId: 'entry-1' }]);

    const result = await updatePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { seasonId: 'season-1', timeFrame: 'seasonal' },
    );

    expect(result.success).toBe(true);
  });

  it('should update existing player entry', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('leaderboards', 'findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      timeFrame: 'seasonal',
      isActive: true,
    });
    setQueryResult('leaderboardEntries', 'findFirst', {
      entryId: 'entry-existing',
      playerId: 'player-1',
      score: 100,
      rank: 5,
    });

    const result = await updatePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { seasonId: 'season-1', timeFrame: 'seasonal' },
    );

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('should continue to next category when leaderboard not found', async () => {
    const { mockDb, setQueryResult, setInsertResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('leaderboards', 'findFirst', null);
    setInsertResult([{ entryId: 'entry-1' }]);

    const result = await updatePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { seasonId: 'season-1', timeFrame: 'seasonal' },
    );

    expect(result.success).toBe(true);
  });

  it('should call Redis zadd and zrevrange when redis available', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('leaderboards', 'findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      timeFrame: 'seasonal',
      isActive: true,
    });
    setQueryResult('leaderboardEntries', 'findFirst', null);

    mockRedis.zrevrange = vi.fn().mockResolvedValue([
      { member: 'player-1', score: 150 },
      { member: 'player-2', score: 140 },
    ]);

    const result = await updatePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { seasonId: 'season-1', timeFrame: 'seasonal' },
    );

    expect(result.success).toBe(true);
    expect(mockRedis.zadd).toHaveBeenCalled();
    expect(mockRedis.zrevrange).toHaveBeenCalled();
  });

  it('should return rank from Redis when player found in zrevrange', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('leaderboards', 'findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      timeFrame: 'seasonal',
      isActive: true,
    });
    setQueryResult('leaderboardEntries', 'findFirst', null);

    mockRedis.zrevrange = vi.fn().mockResolvedValue([
      { member: 'player-2', score: 200 },
      { member: 'player-1', score: 150 },
      { member: 'player-3', score: 140 },
    ]);

    const result = await updatePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { seasonId: 'season-1', timeFrame: 'seasonal' },
    );

    expect(result.success).toBe(true);
    expect(result.rank).toBe(2);
  });

  it('should return success:true when no Redis available', async () => {
    const { mockDb, setQueryResult } = setupMockDb();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(null);

    setQueryResult('leaderboards', 'findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      timeFrame: 'seasonal',
      isActive: true,
    });
    setQueryResult('leaderboardEntries', 'findFirst', null);

    const result = await updatePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { seasonId: 'season-1', timeFrame: 'seasonal' },
    );

    expect(result.success).toBe(true);
    expect(result.rank).toBeUndefined();
  });

  it('should use default seasonId and timeFrame when not provided', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('leaderboards', 'findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      timeFrame: 'seasonal',
      isActive: true,
    });
    setQueryResult('leaderboardEntries', 'findFirst', null);

    const result = await updatePlayerScore(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      metrics: mockMetrics,
    });

    expect(result.success).toBe(true);
  });

  it('should include riskyApprovalRate in score calculation', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('leaderboards', 'findFirst', {
      leaderboardId: 'lb-1',
      scope: 'global',
      seasonId: 'season-1',
      rankingCategory: 'overall',
      timeFrame: 'seasonal',
      isActive: true,
    });
    setQueryResult('leaderboardEntries', 'findFirst', null);

    const result = await updatePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics, riskyApprovalRate: 50 },
      { seasonId: 'season-1', timeFrame: 'seasonal' },
    );

    expect(result.success).toBe(true);
  });
});

describe('leaderboard-score service - updateEnterprisePlayerScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when enterprise leaderboard not found', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('enterpriseLeaderboards', 'findFirst', null);

    const result = await updateEnterprisePlayerScore(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      metrics: mockMetrics,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Enterprise leaderboard not found');
  });

  it('should insert new entry with departmentId and corporationId', async () => {
    const { mockDb, setQueryResult, setInsertResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      leaderboardType: 'composite',
      currentSeasonId: 'season-1',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findFirst', null);
    setInsertResult([{ id: 'score-1' }]);

    const result = await updateEnterprisePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { departmentId: 'dept-1', corporationId: 'corp-1' },
    );

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should update existing entry preserving departmentId and corporationId', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      leaderboardType: 'composite',
      currentSeasonId: 'season-1',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findFirst', {
      id: 'score-existing',
      playerId: 'player-1',
      departmentId: 'old-dept',
      corporationId: 'old-corp',
    });

    const result = await updateEnterprisePlayerScore(
      mockConfig,
      'tenant-123',
      { playerId: 'player-1', metrics: mockMetrics },
      { departmentId: 'new-dept' },
    );

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should use default leaderboardType when not provided', async () => {
    const { mockDb, setQueryResult, setInsertResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      leaderboardType: 'composite',
      currentSeasonId: 'season-1',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findFirst', null);
    setInsertResult([{ id: 'score-1' }]);

    const result = await updateEnterprisePlayerScore(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      metrics: mockMetrics,
    });

    expect(result.success).toBe(true);
    expect(mockDb.query.enterpriseLeaderboards.findFirst).toHaveBeenCalled();
  });

  it('should perform Redis operations when redis available', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      leaderboardType: 'composite',
      currentSeasonId: 'season-1',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findFirst', null);

    mockRedis.zrevrange = vi.fn().mockResolvedValue([{ member: 'player-1', score: 150 }]);

    const result = await updateEnterprisePlayerScore(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      metrics: mockMetrics,
    });

    expect(result.success).toBe(true);
    expect(mockRedis.zadd).toHaveBeenCalled();
    expect(mockRedis.zrevrange).toHaveBeenCalled();
  });

  it('should update rank via database after Redis operation', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    const { mockRedis } = setupMockRedis();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      leaderboardType: 'composite',
      currentSeasonId: 'season-1',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findFirst', {
      id: 'score-existing',
      playerId: 'player-1',
    });

    mockRedis.zrevrange = vi.fn().mockResolvedValue([{ member: 'player-1', score: 150 }]);

    const result = await updateEnterprisePlayerScore(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      metrics: mockMetrics,
    });

    expect(result.success).toBe(true);
    expect(result.rank).toBe(1);
  });

  it('should return success when no Redis available', async () => {
    const { mockDb, setQueryResult, setInsertResult } = setupMockDb();

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
    vi.mocked(getRedisClient).mockReturnValue(null);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      leaderboardType: 'composite',
      currentSeasonId: 'season-1',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findFirst', null);
    setInsertResult([{ id: 'score-1' }]);

    const result = await updateEnterprisePlayerScore(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      metrics: mockMetrics,
    });

    expect(result.success).toBe(true);
    expect(result.rank).toBeUndefined();
  });
});
