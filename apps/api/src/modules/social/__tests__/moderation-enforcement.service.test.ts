import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  checkPlayerRestrictions,
  isActionAllowed,
  getPlayerRestrictionStatus,
} from '../moderation-enforcement.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { createMockDb } from '../../../__tests__/helpers/index.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

const mockConfig = {
  tenantId: 'tenant-123',
  seasonId: 'season-123',
} as unknown as AppConfig;

const setupMockDb = () => {
  const mock = createMockDb();
  return { mockDb: mock.mockDb, setQueryResult: mock.setQueryResult };
};

describe('moderation-enforcement service - checkPlayerRestrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when player has no restrictions', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', []);

    const result = await checkPlayerRestrictions(mockConfig, 'tenant-123', 'player-1');

    expect(result).toEqual([]);
  });

  it('should return active (non-expired) restrictions', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 86400000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: futureDate,
        reportId: 'report-1',
      },
    ]);

    const result = await checkPlayerRestrictions(mockConfig, 'tenant-123', 'player-1');

    expect(result).toHaveLength(1);
    expect(result[0].actionType).toBe('mute');
    expect(result[0].reason).toBe('Violation');
    expect(result[0].expiresAt).toEqual(futureDate);
    expect(result[0].reportId).toBe('report-1');
  });

  it('should filter out expired restrictions', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const pastDate = new Date(Date.now() - 86400000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Expired mute',
        expiresAt: pastDate,
        reportId: null,
      },
    ]);

    const result = await checkPlayerRestrictions(mockConfig, 'tenant-123', 'player-1');

    expect(result).toEqual([]);
  });

  it('should preserve permanent restrictions (expiresAt = null)', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Permanent ban',
        expiresAt: null,
        reportId: null,
      },
    ]);

    const result = await checkPlayerRestrictions(mockConfig, 'tenant-123', 'player-1');

    expect(result).toHaveLength(1);
    expect(result[0].actionType).toBe('ban');
    expect(result[0].expiresAt).toBeNull();
  });

  it('should return only non-expired when mixed with permanent restrictions', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const pastDate = new Date(Date.now() - 86400000);
    const futureDate = new Date(Date.now() + 86400000);

    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Expired mute',
        expiresAt: pastDate,
        reportId: null,
      },
      {
        id: 'action-2',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Permanent ban',
        expiresAt: null,
        reportId: null,
      },
      {
        id: 'action-3',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute_duration',
        reason: 'Temporary mute',
        expiresAt: futureDate,
        reportId: 'report-2',
      },
    ]);

    const result = await checkPlayerRestrictions(mockConfig, 'tenant-123', 'player-1');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.actionType)).toContain('ban');
    expect(result.map((r) => r.actionType)).toContain('mute_duration');
    expect(result.map((r) => r.actionType)).not.toContain('mute');
  });
});

describe('moderation-enforcement service - isActionAllowed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow action when player has no restrictions', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', []);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'send_message');

    expect(result.allowed).toBe(true);
    expect(result.restriction).toBeUndefined();
    expect(result.retryAfterMs).toBeUndefined();
  });

  it('should block send_message when player is muted', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'send_message');

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('mute');
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('should block send_message when player has mute_duration', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute_duration',
        reason: 'Temp mute',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'send_message');

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('mute_duration');
  });

  it('should block send_message when player is banned', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Permanent ban',
        expiresAt: null,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'send_message');

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('ban');
    expect(result.retryAfterMs).toBeUndefined();
  });

  it('should only block send_friend_request when player is banned (not muted)', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(
      mockConfig,
      'tenant-123',
      'player-1',
      'send_friend_request',
    );

    expect(result.allowed).toBe(true);
  });

  it('should block send_friend_request when player is banned', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Permanent ban',
        expiresAt: null,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(
      mockConfig,
      'tenant-123',
      'player-1',
      'send_friend_request',
    );

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('ban');
  });

  it('should block create_forum_post when player is muted', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'create_forum_post');

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('mute');
  });

  it('should block create_chat_room when player is muted', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'create_chat_room');

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('mute');
  });

  it('should default to ban-only blocking for unknown action types', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(
      mockConfig,
      'tenant-123',
      'player-1',
      'unknown_action_type',
    );

    expect(result.allowed).toBe(true);
  });

  it('should block unknown action when player is banned', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Permanent ban',
        expiresAt: null,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(
      mockConfig,
      'tenant-123',
      'player-1',
      'unknown_action_type',
    );

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('ban');
  });

  it('should allow action when restriction is already expired (expired restrictions are filtered)', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const pastDate = new Date(Date.now() - 1000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: pastDate,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'send_message');

    expect(result.allowed).toBe(true);
  });

  it('should return higher priority restriction first (mute before ban)', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Temp mute',
        expiresAt: futureDate,
        reportId: null,
      },
      {
        id: 'action-2',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Permanent ban',
        expiresAt: null,
        reportId: null,
      },
    ]);

    const result = await isActionAllowed(mockConfig, 'tenant-123', 'player-1', 'send_message');

    expect(result.allowed).toBe(false);
    expect(result.restriction?.actionType).toBe('mute');
  });
});

describe('moderation-enforcement service - getPlayerRestrictionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all flags false when player has no restrictions', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', []);

    const result = await getPlayerRestrictionStatus(mockConfig, 'tenant-123', 'player-1');

    expect(result.isMuted).toBe(false);
    expect(result.isBanned).toBe(false);
    expect(result.isRestricted).toBe(false);
    expect(result.muteExpiresAt).toBeNull();
    expect(result.banExpiresAt).toBeNull();
  });

  it('should set isMuted true when player has mute restriction', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Violation',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await getPlayerRestrictionStatus(mockConfig, 'tenant-123', 'player-1');

    expect(result.isMuted).toBe(true);
    expect(result.isBanned).toBe(false);
    expect(result.isRestricted).toBe(false);
    expect(result.muteExpiresAt).toEqual(futureDate);
    expect(result.banExpiresAt).toBeNull();
  });

  it('should set isMuted true when player has mute_duration restriction', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 3600000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute_duration',
        reason: 'Temp mute',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await getPlayerRestrictionStatus(mockConfig, 'tenant-123', 'player-1');

    expect(result.isMuted).toBe(true);
    expect(result.muteExpiresAt).toEqual(futureDate);
  });

  it('should set isBanned true when player has ban restriction', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Permanent ban',
        expiresAt: null,
        reportId: null,
      },
    ]);

    const result = await getPlayerRestrictionStatus(mockConfig, 'tenant-123', 'player-1');

    expect(result.isBanned).toBe(true);
    expect(result.banExpiresAt).toBeNull();
  });

  it('should set isRestricted true when player has restriction action', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const futureDate = new Date(Date.now() + 86400000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'restriction',
        reason: 'Limited access',
        expiresAt: futureDate,
        reportId: null,
      },
    ]);

    const result = await getPlayerRestrictionStatus(mockConfig, 'tenant-123', 'player-1');

    expect(result.isRestricted).toBe(true);
    expect(result.isMuted).toBe(false);
    expect(result.isBanned).toBe(false);
  });

  it('should handle multiple concurrent restrictions', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const muteExpiry = new Date(Date.now() + 3600000);
    const banExpiry = new Date(Date.now() + 86400000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Temp mute',
        expiresAt: muteExpiry,
        reportId: null,
      },
      {
        id: 'action-2',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'ban',
        reason: 'Ban',
        expiresAt: banExpiry,
        reportId: null,
      },
      {
        id: 'action-3',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'restriction',
        reason: 'Limited',
        expiresAt: null,
        reportId: null,
      },
    ]);

    const result = await getPlayerRestrictionStatus(mockConfig, 'tenant-123', 'player-1');

    expect(result.isMuted).toBe(true);
    expect(result.isBanned).toBe(true);
    expect(result.isRestricted).toBe(true);
    expect(result.muteExpiresAt).toEqual(muteExpiry);
    expect(result.banExpiresAt).toEqual(banExpiry);
  });

  it('should filter expired restrictions for status flags', async () => {
    const { mockDb, setQueryResult } = setupMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const pastDate = new Date(Date.now() - 1000);
    setQueryResult('moderationAction', 'findMany', [
      {
        id: 'action-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        actionType: 'mute',
        reason: 'Expired mute',
        expiresAt: pastDate,
        reportId: null,
      },
    ]);

    const result = await getPlayerRestrictionStatus(mockConfig, 'tenant-123', 'player-1');

    expect(result.isMuted).toBe(false);
    expect(result.isBanned).toBe(false);
    expect(result.isRestricted).toBe(false);
  });
});
