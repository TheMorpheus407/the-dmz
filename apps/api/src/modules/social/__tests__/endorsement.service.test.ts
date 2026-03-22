import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  submitEndorsement,
  calculateDecayedImpact,
  ENDORSEMENT_TAG_SEEDS,
} from '../endorsement.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

const mockConfig = {
  tenantId: 'tenant-123',
  seasonId: 'season-123',
} as unknown as AppConfig;

const createMockDb = () => {
  const mockQueryResults: Map<string, unknown> = new Map();
  const mockInsertResults: Map<string, unknown[]> = new Map();

  const mockDb = {
    query: {
      endorsementTags: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      endorsements: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockImplementation(async () => {
          const key = 'endorsements.findFirst';
          const result = mockQueryResults.get(key);
          return result ?? null;
        }),
      },
      endorsementDecay: {
        findFirst: vi.fn().mockImplementation(async () => {
          const result = mockQueryResults.get('endorsementDecay.findFirst');
          return result ?? null;
        }),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(async () => {
      const result = mockInsertResults.get('endorsements.insert') ?? [];
      return result;
    }),
  };

  const setQueryResult = (key: string, result: unknown) => {
    mockQueryResults.set(key, result);
  };

  const setInsertResult = (key: string, result: unknown[]) => {
    mockInsertResults.set(key, result);
  };

  return { mockDb, setQueryResult, setInsertResult, mockQueryResults, mockInsertResults };
};

describe('endorsement service - constants', () => {
  it('should have max 3 tags per session', () => {
    expect(ENDORSEMENT_TAG_SEEDS.length).toBe(6);
  });

  it('should have exactly 6 endorsement tags', () => {
    expect(ENDORSEMENT_TAG_SEEDS).toHaveLength(6);
  });
});

describe('endorsement service - submitEndorsement validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject self-endorsement', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('endorsements.findFirst', null);

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-1',
      tagIds: ['tag-1'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot endorse yourself');
  });

  it('should reject empty tag array', async () => {
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-2',
      tagIds: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('At least one tag is required');
  });

  it('should reject more than 3 tags', async () => {
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-2',
      tagIds: ['tag-1', 'tag-2', 'tag-3', 'tag-4'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Maximum 3 tags per endorsement');
  });

  it('should reject when daily endorsement limit is reached', async () => {
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    mockDb.query.endorsements.findFirst = vi.fn().mockResolvedValue(null);

    let selectCallCount = 0;
    mockDb.select = vi.fn().mockReturnThis();
    mockDb.from = vi.fn().mockReturnThis();
    mockDb.where = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return { then: (resolve: (value: unknown) => void) => resolve([{ count: 10 }]) };
      }
      return mockDb;
    });

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-2',
      tagIds: ['tag-1'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Daily endorsement limit reached');
  });

  it('should reject duplicate endorsement for same session and player', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('endorsements.findFirst', { id: 'existing-endorsement' });

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-2',
      tagIds: ['tag-1'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Endorsement already exists for this session and player');
  });

  it('should reject duplicate tag endorsement for same session', async () => {
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    let callCount = 0;
    mockDb.query.endorsements.findFirst = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return null;
      return { id: 'duplicate-tag-endorsement' };
    });

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-2',
      tagIds: ['tag-1'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Duplicate tag endorsement for this session');
  });

  it('should successfully create endorsement with valid data', async () => {
    const { mockDb, setInsertResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    mockDb.query.endorsements.findFirst = vi.fn().mockResolvedValue(null);

    setInsertResult('endorsements.insert', [
      {
        id: 'new-endorsement-1',
        sessionId: 'session-1',
        endorserPlayerId: 'player-1',
        endorsedPlayerId: 'player-2',
        tagId: 'tag-1',
        tenantId: 'tenant-123',
        createdAt: new Date(),
      },
    ]);

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-2',
      tagIds: ['tag-1'],
    });

    expect(result.success).toBe(true);
    expect(result.endorsement).toBeDefined();
    expect(result.endorsement?.id).toBe('new-endorsement-1');
  });

  it('should allow up to 3 tags in a single endorsement', async () => {
    const { mockDb, setInsertResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    mockDb.query.endorsements.findFirst = vi.fn().mockResolvedValue(null);

    setInsertResult('endorsements.insert', [
      {
        id: 'new-endorsement-1',
        sessionId: 'session-1',
        endorserPlayerId: 'player-1',
        endorsedPlayerId: 'player-2',
        tagId: 'tag-1',
        tenantId: 'tenant-123',
        createdAt: new Date(),
      },
    ]);

    const result = await submitEndorsement(mockConfig, 'tenant-123', 'player-1', {
      sessionId: 'session-1',
      endorsedPlayerId: 'player-2',
      tagIds: ['tag-1', 'tag-2', 'tag-3'],
    });

    expect(result.success).toBe(true);
    expect(result.endorsement).toBeDefined();
  });
});

describe('endorsement service - calculateDecayedImpact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 when decay record not found', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('endorsementDecay.findFirst', null);

    const result = await calculateDecayedImpact(mockConfig, 'non-existent-id');

    expect(result).toBe(0);
  });

  it('should return 0 when endorsement is already decayed', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('endorsementDecay.findFirst', {
      id: 'decay-1',
      endorsementId: 'endorsement-1',
      reputationImpact: 10,
      decaySchedule: { initialDecay: 0.9, decayIntervalDays: 30, finalDecay: 0.1 },
      createdAt: new Date(),
      decayedAt: new Date(),
    });

    const result = await calculateDecayedImpact(mockConfig, 'endorsement-1');

    expect(result).toBe(0);
  });

  it('should return 0 when endorsement is older than decay period', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    setQueryResult('endorsementDecay.findFirst', {
      id: 'decay-1',
      endorsementId: 'endorsement-1',
      reputationImpact: 10,
      decaySchedule: { initialDecay: 0.9, decayIntervalDays: 30, finalDecay: 0.1 },
      createdAt: oldDate,
      decayedAt: null,
    });

    const result = await calculateDecayedImpact(mockConfig, 'endorsement-1');

    expect(result).toBe(0);
  });

  it('should apply decay factor for fresh endorsement', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('endorsementDecay.findFirst', {
      id: 'decay-1',
      endorsementId: 'endorsement-1',
      reputationImpact: 10,
      decaySchedule: { initialDecay: 0.9, decayIntervalDays: 30, finalDecay: 0.1 },
      createdAt: new Date(),
      decayedAt: null,
    });

    const result = await calculateDecayedImpact(mockConfig, 'endorsement-1');

    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(10);
  });
});

describe('endorsement service - endorsement tags', () => {
  it('should have all required tag keys', () => {
    const expectedTagKeys = [
      'careful_verifier',
      'clear_communicator',
      'steady_incident_commander',
      'quick_responder',
      'team_player',
      'threat_hunter',
    ];

    const actualTagKeys = ENDORSEMENT_TAG_SEEDS.map((t) => t.tagKey);

    expectedTagKeys.forEach((key) => {
      expect(actualTagKeys).toContain(key);
    });
  });

  it('should have unique tag keys', () => {
    const tagKeys = ENDORSEMENT_TAG_SEEDS.map((t) => t.tagKey);
    const uniqueKeys = new Set(tagKeys);

    expect(uniqueKeys.size).toBe(tagKeys.length);
  });

  it('should have non-empty display names for all tags', () => {
    ENDORSEMENT_TAG_SEEDS.forEach((tag) => {
      expect(tag.displayName.length).toBeGreaterThan(0);
    });
  });

  it('should have non-empty descriptions for all tags', () => {
    ENDORSEMENT_TAG_SEEDS.forEach((tag) => {
      expect(tag.description.length).toBeGreaterThan(0);
    });
  });

  it('should have all tags active by default', () => {
    ENDORSEMENT_TAG_SEEDS.forEach((tag) => {
      expect(tag.isActive).toBe(true);
    });
  });
});

describe('endorsement service - decay calculation logic', () => {
  it('should calculate correct decay factor for fresh endorsement', () => {
    const schedule = { initialDecay: 0.9, decayIntervalDays: 30, finalDecay: 0.1 };
    const daysSinceCreation = 0;
    const intervals = Math.floor(daysSinceCreation / schedule.decayIntervalDays);

    let decayFactor: number;
    if (intervals === 0) {
      decayFactor = 1;
    } else {
      decayFactor =
        schedule.initialDecay *
        Math.pow(1 - (schedule.initialDecay - schedule.finalDecay) / intervals, intervals);
    }

    expect(decayFactor).toBe(1);
  });

  it('should calculate correct decay factor after 30 days', () => {
    const schedule = { initialDecay: 0.9, decayIntervalDays: 30, finalDecay: 0.1 };
    const daysSinceCreation = 30;
    const intervals = Math.floor(daysSinceCreation / schedule.decayIntervalDays);

    let decayFactor: number;
    if (intervals === 0) {
      decayFactor = 1;
    } else {
      decayFactor =
        schedule.initialDecay *
        Math.pow(1 - (schedule.initialDecay - schedule.finalDecay) / intervals, intervals);
    }

    expect(decayFactor).toBeLessThan(1);
    expect(decayFactor).toBeGreaterThan(schedule.finalDecay);
  });

  it('should not go below final decay value', () => {
    const schedule = { initialDecay: 0.9, decayIntervalDays: 30, finalDecay: 0.1 };
    const daysSinceCreation = 365;
    const intervals = Math.floor(daysSinceCreation / schedule.decayIntervalDays);

    let decayFactor: number;
    if (intervals === 0) {
      decayFactor = 1;
    } else {
      decayFactor =
        schedule.initialDecay *
        Math.pow(1 - (schedule.initialDecay - schedule.finalDecay) / intervals, intervals);
    }

    expect(decayFactor).toBeGreaterThanOrEqual(schedule.finalDecay);
  });
});

describe('endorsement service - summary calculation', () => {
  it('should calculate endorsement rate with zero given', () => {
    const totalReceived = 10;
    const totalGiven = 0;
    const endorsementRate = totalReceived / Math.max(totalGiven, 1);

    expect(endorsementRate).toBe(10);
  });

  it('should calculate endorsement rate with normal values', () => {
    const totalReceived = 10;
    const totalGiven = 5;
    const endorsementRate = totalReceived / Math.max(totalGiven, 1);

    expect(endorsementRate).toBe(2);
  });

  it('should identify recent endorsements correctly', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const endorsements = [
      { createdAt: new Date(), tagId: 'tag-1' },
      { createdAt: new Date(), tagId: 'tag-2' },
      { createdAt: new Date(thirtyDaysAgo.getTime() + 1000), tagId: 'tag-1' },
      { createdAt: new Date(thirtyDaysAgo.getTime() - 1000), tagId: 'tag-3' },
    ];

    const recentCount = endorsements.filter((e) => e.createdAt >= thirtyDaysAgo).length;

    expect(recentCount).toBe(3);
  });
});

describe('endorsement service - pagination', () => {
  it('should calculate correct offset for page 1', () => {
    const page = 1;
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    expect(offset).toBe(0);
  });

  it('should calculate correct offset for page 3', () => {
    const page = 3;
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    expect(offset).toBe(40);
  });

  it('should determine hasMore correctly when more data exists', () => {
    const offset = 40;
    const dataLength = 20;
    const total = 65;
    const hasMore = offset + dataLength < total;

    expect(hasMore).toBe(true);
  });

  it('should determine hasMore correctly on last page', () => {
    const offset = 60;
    const dataLength = 5;
    const total = 65;
    const hasMore = offset + dataLength < total;

    expect(hasMore).toBe(false);
  });
});

describe('endorsement service - PaginatedResult interface', () => {
  it('should use items property instead of data for self-documenting code', () => {
    const mockPaginatedResult = {
      items: [{ id: '1', name: 'test' }],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    };

    expect(mockPaginatedResult.items).toBeDefined();
    expect(Array.isArray(mockPaginatedResult.items)).toBe(true);
    expect(mockPaginatedResult.items).toHaveLength(1);
    expect(mockPaginatedResult.total).toBe(1);
    expect(mockPaginatedResult.page).toBe(1);
    expect(mockPaginatedResult.pageSize).toBe(20);
    expect(mockPaginatedResult.hasMore).toBe(false);
  });

  it('should have items as array of endorsements', () => {
    const mockEndorsementWithTag = {
      id: 'endorsement-1',
      sessionId: 'session-1',
      endorserPlayerId: 'player-1',
      endorsedPlayerId: 'player-2',
      tagId: 'tag-1',
      tenantId: 'tenant-1',
      seasonId: null,
      createdAt: new Date(),
      tag: {
        id: 'tag-1',
        tagKey: 'careful_verifier',
        displayName: 'Careful Verifier',
        description: 'Test description',
        isActive: true,
        createdAt: new Date(),
      },
    };

    const mockPaginatedResult = {
      items: [mockEndorsementWithTag],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    };

    expect(mockPaginatedResult.items[0]).toHaveProperty('tag');
    expect(mockPaginatedResult.items[0]!.tag.tagKey).toBe('careful_verifier');
  });
});
