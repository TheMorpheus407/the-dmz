import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CoopSessionRepository } from '../coop-session.repository.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../social/index.js', () => ({
  getPlayerIdByProfileId: vi.fn(),
}));

describe('CoopSessionRepository - findPlayerProfile decoupling', () => {
  let mockDb: DatabaseClient;
  let repository: CoopSessionRepository;
  let mockFindFirst: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

    mockFindFirst = vi.fn();

    mockDb = {
      query: {
        coopSession: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        coopRoleAssignment: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        coopDecisionProposal: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        party: {
          findFirst: vi.fn(),
        },
        playerProfiles: {
          findFirst: mockFindFirst,
        },
      },
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as DatabaseClient;

    repository = new CoopSessionRepository(mockDb);
  });

  it('should call getPlayerIdByProfileId from social service instead of querying playerProfiles directly', async () => {
    const { getPlayerIdByProfileId } = await import('../../social/index.js');
    vi.mocked(getPlayerIdByProfileId).mockResolvedValue({
      profileId: 'profile-123',
      userId: 'user-456',
    });

    const result = await repository.findPlayerProfile({
      profileId: 'profile-123',
      tenantId: 'tenant-789',
    });

    expect(getPlayerIdByProfileId).toHaveBeenCalledWith(mockDb, 'tenant-789', 'profile-123');
    expect(result).toEqual({
      profileId: 'profile-123',
      userId: 'user-456',
    });
  });

  it('should return undefined from service when profile not found', async () => {
    const { getPlayerIdByProfileId } = await import('../../social/index.js');
    vi.mocked(getPlayerIdByProfileId).mockResolvedValue(undefined);

    const result = await repository.findPlayerProfile({
      profileId: 'non-existent',
      tenantId: 'tenant-789',
    });

    expect(result).toBeUndefined();
    expect(getPlayerIdByProfileId).toHaveBeenCalledWith(mockDb, 'tenant-789', 'non-existent');
  });

  it('should not query playerProfiles table directly via db.query', async () => {
    const { getPlayerIdByProfileId } = await import('../../social/index.js');
    vi.mocked(getPlayerIdByProfileId).mockResolvedValue({
      profileId: 'profile-123',
      userId: 'user-456',
    });

    await repository.findPlayerProfile({
      profileId: 'profile-123',
      tenantId: 'tenant-789',
    });

    expect(mockFindFirst).not.toHaveBeenCalled();
  });
});
