import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  listEnterpriseLeaderboards,
  getEnterpriseLeaderboardEntries,
  getPlayerEnterprisePosition,
  getDepartmentLeaderboard,
  getCorporationLeaderboard,
  getTeamSummary,
  updatePrivacyLevel,
} from '../enterprise-leaderboard.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { createMockDb } from '../../../__tests__/helpers/index.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

const mockEvaluateFlag = vi.fn().mockResolvedValue(true);

vi.mock('../../feature-flags/feature-flags.service.js', () => ({
  evaluateFlag: (...args: unknown[]) => mockEvaluateFlag(...args),
}));

const mockConfig = {
  tenantId: 'tenant-123',
  seasonId: 'season-123',
} as unknown as AppConfig;

const setupMockDb = () => {
  const mock = createMockDb();
  const { setQueryResult } = mock;
  return { mockDb: mock.mockDb, setQueryResult };
};

describe('enterprise-leaderboard service - listEnterpriseLeaderboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await listEnterpriseLeaderboards(mockConfig, 'tenant-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return enterprise leaderboards successfully', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const mockLeaderboards = [
      {
        id: 'elb-1',
        scope: 'department',
        orgUnitId: 'dept-1',
        corporationId: null,
        leaderboardType: 'composite',
        isActive: true,
      },
    ];
    setQueryResult('enterpriseLeaderboards', 'findMany', mockLeaderboards);

    const result = await listEnterpriseLeaderboards(mockConfig, 'tenant-123');

    expect(result.success).toBe(true);
    expect(result.leaderboards).toEqual(mockLeaderboards);
  });

  it('should filter by scope', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findMany', []);

    await listEnterpriseLeaderboards(mockConfig, 'tenant-123', { scope: 'department' });

    expect(mockDb.query.enterpriseLeaderboards.findMany).toHaveBeenCalled();
  });

  it('should filter by departmentId', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findMany', []);

    await listEnterpriseLeaderboards(mockConfig, 'tenant-123', { departmentId: 'dept-1' });

    expect(mockDb.query.enterpriseLeaderboards.findMany).toHaveBeenCalled();
  });

  it('should filter by corporationId', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findMany', []);

    await listEnterpriseLeaderboards(mockConfig, 'tenant-123', { corporationId: 'corp-1' });

    expect(mockDb.query.enterpriseLeaderboards.findMany).toHaveBeenCalled();
  });
});

describe('enterprise-leaderboard service - getEnterpriseLeaderboardEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getEnterpriseLeaderboardEntries(mockConfig, 'tenant-123', 'elb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when leaderboard not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', null);

    const result = await getEnterpriseLeaderboardEntries(mockConfig, 'tenant-123', 'non-existent');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Enterprise leaderboard not found');
  });

  it('should return entries with player mapping and privacy filtering', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      privacyLevel: 'full_name',
      isActive: true,
    });

    const mockScores = [
      {
        id: 'score-1',
        leaderboardId: 'elb-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        departmentId: 'dept-1',
        corporationId: null,
        score: 100,
        rank: 1,
        metrics: {},
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      },
    ];
    setQueryResult('leaderboardScores', 'findMany', mockScores);

    const mockPlayers = [
      {
        profileId: 'player-1',
        displayName: 'TestPlayer',
        avatarId: null,
        privacyMode: 'public',
      },
    ];
    setQueryResult('playerProfiles', 'findMany', mockPlayers);

    const result = await getEnterpriseLeaderboardEntries(mockConfig, 'tenant-123', 'elb-1');

    expect(result.success).toBe(true);
    expect(result.leaderboards).toBeDefined();
    expect(result.totalCount).toBeDefined();
  });

  it('should apply pagination', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      privacyLevel: 'full_name',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findMany', []);
    setQueryResult('playerProfiles', 'findMany', []);

    const result = await getEnterpriseLeaderboardEntries(mockConfig, 'tenant-123', 'elb-1', {
      limit: 10,
      offset: 5,
    });

    expect(result.success).toBe(true);
  });

  it('should filter by departmentId', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      scope: 'tenant',
      privacyLevel: 'full_name',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findMany', []);
    setQueryResult('playerProfiles', 'findMany', []);

    const result = await getEnterpriseLeaderboardEntries(mockConfig, 'tenant-123', 'elb-1', {
      departmentId: 'dept-1',
    });

    expect(result.success).toBe(true);
  });
});

describe('enterprise-leaderboard service - getPlayerEnterprisePosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getPlayerEnterprisePosition(mockConfig, 'tenant-123', 'player-1', 'elb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when player not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboardScores', 'findFirst', null);

    const result = await getPlayerEnterprisePosition(mockConfig, 'tenant-123', 'player-1', 'elb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Player not found on this leaderboard');
  });

  it('should return rank and score when found', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboardScores', 'findFirst', {
      playerId: 'player-1',
      score: 150,
      rank: 3,
    });

    const result = await getPlayerEnterprisePosition(mockConfig, 'tenant-123', 'player-1', 'elb-1');

    expect(result.success).toBe(true);
    expect(result.rank).toBe(3);
    expect(result.score).toBe(150);
  });
});

describe('enterprise-leaderboard service - getDepartmentLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getDepartmentLeaderboard(mockConfig, 'tenant-123', 'dept-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when department leaderboard not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', null);

    const result = await getDepartmentLeaderboard(mockConfig, 'tenant-123', 'dept-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Department leaderboard not found');
  });

  it('should delegate to getEnterpriseLeaderboardEntries', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-dept',
      scope: 'department',
      orgUnitId: 'dept-1',
      privacyLevel: 'full_name',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findMany', []);
    setQueryResult('playerProfiles', 'findMany', []);

    const result = await getDepartmentLeaderboard(mockConfig, 'tenant-123', 'dept-1');

    expect(result.success).toBe(true);
  });
});

describe('enterprise-leaderboard service - getCorporationLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getCorporationLeaderboard(mockConfig, 'tenant-123', 'corp-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
  });

  it('should return error when corporation leaderboard not found', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', null);

    const result = await getCorporationLeaderboard(mockConfig, 'tenant-123', 'corp-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Corporation leaderboard not found');
  });

  it('should delegate to getEnterpriseLeaderboardEntries', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-corp',
      scope: 'corporation',
      corporationId: 'corp-1',
      privacyLevel: 'full_name',
      isActive: true,
    });
    setQueryResult('leaderboardScores', 'findMany', []);
    setQueryResult('playerProfiles', 'findMany', []);

    const result = await getCorporationLeaderboard(mockConfig, 'tenant-123', 'corp-1');

    expect(result.success).toBe(true);
  });
});

describe('enterprise-leaderboard service - getTeamSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when flag disabled', async () => {
    mockEvaluateFlag.mockResolvedValue(false);
    const { mockDb } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await getTeamSummary(mockConfig, 'tenant-123', 'team-1', 'elb-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboards system is disabled');
    expect(result.teamId).toBe('team-1');
    expect(result.averageScore).toBe(0);
    expect(result.totalPlayers).toBe(0);
    expect(result.topPerformers).toEqual([]);
  });

  it('should return empty summary when no entries', async () => {
    mockEvaluateFlag.mockResolvedValue(true);
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('leaderboardScores', 'findMany', []);

    const result = await getTeamSummary(mockConfig, 'tenant-123', 'team-1', 'elb-1');

    expect(result.success).toBe(true);
    expect(result.teamId).toBe('team-1');
    expect(result.averageScore).toBe(0);
    expect(result.totalPlayers).toBe(0);
    expect(result.topPerformers).toEqual([]);
  });

  it('should calculate average score correctly', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const mockEntries = [
      { id: 'score-1', score: 100, rank: 1 },
      { id: 'score-2', score: 200, rank: 2 },
      { id: 'score-3', score: 300, rank: 3 },
    ];
    setQueryResult('leaderboardScores', 'findMany', mockEntries);

    const result = await getTeamSummary(mockConfig, 'tenant-123', 'team-1', 'elb-1');

    expect(result.success).toBe(true);
    expect(result.averageScore).toBe(200);
    expect(result.totalPlayers).toBe(3);
  });

  it('should limit top performers to 5', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const mockEntries = [
      { id: 'score-1', score: 100, rank: 1 },
      { id: 'score-2', score: 90, rank: 2 },
      { id: 'score-3', score: 80, rank: 3 },
      { id: 'score-4', score: 70, rank: 4 },
      { id: 'score-5', score: 60, rank: 5 },
      { id: 'score-6', score: 50, rank: 6 },
      { id: 'score-7', score: 40, rank: 7 },
    ];
    setQueryResult('leaderboardScores', 'findMany', mockEntries);

    const result = await getTeamSummary(mockConfig, 'tenant-123', 'team-1', 'elb-1');

    expect(result.success).toBe(true);
    expect(result.topPerformers).toHaveLength(5);
  });
});

describe('enterprise-leaderboard service - updatePrivacyLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when leaderboard not found', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', null);

    const result = await updatePrivacyLevel(mockConfig, 'tenant-123', 'non-existent', 'pseudonym');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboard not found');
  });

  it('should return error when tenant mismatch', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', null);

    const result = await updatePrivacyLevel(mockConfig, 'tenant-123', 'elb-1', 'pseudonym');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Leaderboard not found');
  });

  it('should update privacy level successfully', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('enterpriseLeaderboards', 'findFirst', {
      id: 'elb-1',
      tenantId: 'tenant-123',
    });

    const result = await updatePrivacyLevel(mockConfig, 'tenant-123', 'elb-1', 'pseudonym');

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });
});
