/* eslint-disable max-lines, max-statements */
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createSession,
  findSessionById,
  findSessionByTokenHash,
  deleteSession,
  deleteSessionByTokenHash,
  deleteAllSessionsByTenantId,
  deleteAllSessionsByUserId,
  findSessionsByUserId,
  updateSessionLastActive,
  updateSessionTokenHash,
  listTenantSessions,
  findSessionWithUser,
  revokeSessionById,
  countTenantSessions,
  countActiveUserSessions,
  getOldestActiveSession,
  deleteOldestUserSessions,
  findActiveSessionWithContext,
  getSessionMetrics,
  cleanupExpiredSessions,
  getExpiredSessions,
  deleteSessionsByIds,
  type SessionListItem,
  type ListTenantSessionsParams,
  type SessionMetricsParams,
  type CleanupExpiredSessionsParams,
  type GetExpiredSessionsParams,
} from '../session.repo.js';

import type { DB } from '../../../../shared/database/connection.js';

vi.mock('../../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('session.repo', () => {
  let mockDb: DB;

  const mockSession = {
    id: 'session-123',
    userId: 'user-456',
    tenantId: 'tenant-789',
    tokenHash: 'token-hash',
    expiresAt: new Date('2027-01-01'),
    createdAt: new Date('2026-01-01'),
    lastActiveAt: new Date('2026-01-01'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    deviceFingerprint: null,
    mfaVerifiedAt: null,
    mfaMethod: null,
    mfaFailedAttempts: 0,
    mfaLockedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: {
        sessions: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
    } as unknown as DB;
  });

  describe('createSession', () => {
    it('should create a session with all provided fields', async () => {
      const createdSession = {
        id: mockSession.id,
        userId: mockSession.userId,
        tenantId: mockSession.tenantId,
        expiresAt: mockSession.expiresAt,
        createdAt: mockSession.createdAt,
        lastActiveAt: mockSession.lastActiveAt,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdSession]),
        }),
      });

      const result = await createSession(mockDb, {
        userId: mockSession.userId,
        tenantId: mockSession.tenantId,
        tokenHash: mockSession.tokenHash,
        expiresAt: mockSession.expiresAt,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toMatchObject({
        id: mockSession.id,
        userId: mockSession.userId,
        tenantId: mockSession.tenantId,
      });
    });
  });

  describe('findSessionById', () => {
    it('should return session when found', async () => {
      mockDb.query.sessions.findFirst = vi.fn().mockResolvedValue(mockSession);

      const result = await findSessionById(mockDb, mockSession.id);

      expect(result).toMatchObject({
        id: mockSession.id,
        userId: mockSession.userId,
        tenantId: mockSession.tenantId,
      });
    });

    it('should return null when session not found', async () => {
      mockDb.query.sessions.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findSessionById(mockDb, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findSessionByTokenHash', () => {
    it('should return session when token hash matches', async () => {
      mockDb.query.sessions.findFirst = vi.fn().mockResolvedValue(mockSession);

      const result = await findSessionByTokenHash(mockDb, mockSession.tokenHash);

      expect(result).toMatchObject({
        id: mockSession.id,
        tokenHash: mockSession.tokenHash,
      });
    });

    it('should return null when token hash not found', async () => {
      mockDb.query.sessions.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findSessionByTokenHash(mockDb, 'wrong-hash');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session by id', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await deleteSession(mockDb, mockSession.id);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('deleteSessionByTokenHash', () => {
    it('should delete session by token hash', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await deleteSessionByTokenHash(mockDb, mockSession.tokenHash);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('deleteAllSessionsByTenantId', () => {
    it('should delete all sessions for tenant and return count', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        }),
      });

      const result = await deleteAllSessionsByTenantId(mockDb, mockSession.tenantId);

      expect(result).toBe(2);
    });

    it('should return 0 when no sessions deleted', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteAllSessionsByTenantId(mockDb, mockSession.tenantId);

      expect(result).toBe(0);
    });
  });

  describe('deleteAllSessionsByUserId', () => {
    it('should delete all sessions for user in tenant', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }]),
        }),
      });

      const result = await deleteAllSessionsByUserId(
        mockDb,
        mockSession.userId,
        mockSession.tenantId,
      );

      expect(result).toBe(1);
    });
  });

  describe('findSessionsByUserId', () => {
    it('should return all sessions for user', async () => {
      mockDb.query.sessions.findMany = vi.fn().mockResolvedValue([mockSession]);

      const result = await findSessionsByUserId(mockDb, mockSession.userId, mockSession.tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockSession.id,
        userId: mockSession.userId,
      });
    });

    it('should return empty array when no sessions found', async () => {
      mockDb.query.sessions.findMany = vi.fn().mockResolvedValue([]);

      const result = await findSessionsByUserId(mockDb, mockSession.userId, mockSession.tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('updateSessionLastActive', () => {
    it('should update last active timestamp', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await updateSessionLastActive(mockDb, mockSession.id);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateSessionTokenHash', () => {
    it('should update token hash', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await updateSessionTokenHash(mockDb, mockSession.id, 'new-hash');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('listTenantSessions', () => {
    it('should return paginated sessions for tenant', async () => {
      const sessions: SessionListItem[] = [
        {
          id: mockSession.id,
          userId: mockSession.userId,
          tenantId: mockSession.tenantId,
          expiresAt: mockSession.expiresAt,
          createdAt: mockSession.createdAt,
          lastActiveAt: mockSession.lastActiveAt,
          ipAddress: mockSession.ipAddress,
          userAgent: mockSession.userAgent,
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(sessions),
            }),
          }),
        }),
      });

      const params: ListTenantSessionsParams = {
        tenantId: mockSession.tenantId,
        limit: 10,
      };

      const result = await listTenantSessions(mockDb, params);

      expect(result.sessions).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should return next cursor when more results exist', async () => {
      const sessions: SessionListItem[] = [
        {
          id: '1',
          userId: 'u1',
          tenantId: 't1',
          expiresAt: new Date(),
          createdAt: new Date('2026-01-01'),
          lastActiveAt: null,
          ipAddress: null,
          userAgent: null,
        },
        {
          id: '2',
          userId: 'u2',
          tenantId: 't1',
          expiresAt: new Date(),
          createdAt: new Date('2026-01-02'),
          lastActiveAt: null,
          ipAddress: null,
          userAgent: null,
        },
        {
          id: '3',
          userId: 'u3',
          tenantId: 't1',
          expiresAt: new Date(),
          createdAt: new Date('2026-01-03'),
          lastActiveAt: null,
          ipAddress: null,
          userAgent: null,
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(sessions),
            }),
          }),
        }),
      });

      const params: ListTenantSessionsParams = {
        tenantId: 't1',
        limit: 2,
      };

      const result = await listTenantSessions(mockDb, params);

      expect(result.sessions).toHaveLength(2);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('findSessionWithUser', () => {
    it('should return session with user email', async () => {
      const sessionWithUser = {
        ...mockSession,
        email: 'test@example.com',
      };

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([sessionWithUser]),
            }),
          }),
        }),
      });

      const result = await findSessionWithUser(mockDb, mockSession.id, mockSession.tenantId);

      expect(result).toMatchObject({
        id: mockSession.id,
        email: 'test@example.com',
      });
    });

    it('should return null when session not found', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await findSessionWithUser(mockDb, 'nonexistent', mockSession.tenantId);

      expect(result).toBeNull();
    });
  });

  describe('revokeSessionById', () => {
    it('should return success true when session revoked', async () => {
      mockDb.query.sessions.findFirst = vi.fn().mockResolvedValue(mockSession);
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await revokeSessionById(mockDb, mockSession.id, mockSession.tenantId);

      expect(result).toEqual({ success: true, alreadyRevoked: false });
    });

    it('should return success false when session not found', async () => {
      mockDb.query.sessions.findFirst = vi.fn().mockResolvedValue(null);

      const result = await revokeSessionById(mockDb, 'nonexistent', mockSession.tenantId);

      expect(result).toEqual({ success: false, alreadyRevoked: false });
    });
  });

  describe('countTenantSessions', () => {
    it('should return count of tenant sessions', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await countTenantSessions(mockSession.tenantId);

      expect(result).toBe(5);
    });

    it('should return 0 when no sessions', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const result = await countTenantSessions(mockSession.tenantId);

      expect(result).toBe(0);
    });
  });

  describe('countActiveUserSessions', () => {
    it('should return count of active user sessions', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const result = await countActiveUserSessions(
        mockDb,
        mockSession.userId,
        mockSession.tenantId,
      );

      expect(result).toBe(3);
    });
  });

  describe('getOldestActiveSession', () => {
    it('should return oldest session for user', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockSession]),
            }),
          }),
        }),
      });

      const result = await getOldestActiveSession(mockDb, mockSession.userId, mockSession.tenantId);

      expect(result).toMatchObject({
        id: mockSession.id,
        userId: mockSession.userId,
      });
    });

    it('should return null when no sessions', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await getOldestActiveSession(mockDb, mockSession.userId, mockSession.tenantId);

      expect(result).toBeNull();
    });
  });

  describe('deleteOldestUserSessions', () => {
    it('should delete oldest sessions keeping specified count', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { id: '1', createdAt: new Date('2026-01-01') },
                { id: '2', createdAt: new Date('2026-01-02') },
                { id: '3', createdAt: new Date('2026-01-03') },
              ]),
            }),
          }),
        }),
      });

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        }),
      });

      const result = await deleteOldestUserSessions(
        mockDb,
        mockSession.userId,
        mockSession.tenantId,
        1,
      );

      expect(result).toBe(2);
    });

    it('should return 0 when fewer sessions than keep count', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: '1', createdAt: new Date() }]),
            }),
          }),
        }),
      });

      const result = await deleteOldestUserSessions(
        mockDb,
        mockSession.userId,
        mockSession.tenantId,
        5,
      );

      expect(result).toBe(0);
    });
  });

  describe('findActiveSessionWithContext', () => {
    it('should return session with context', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      const result = await findActiveSessionWithContext(mockDb, mockSession.id);

      expect(result).toMatchObject({
        id: mockSession.id,
        userId: mockSession.userId,
      });
    });

    it('should return null when session not found', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await findActiveSessionWithContext(mockDb, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getSessionMetrics', () => {
    it('should return session metrics', async () => {
      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 20 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 100 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 500 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  { date: '2026-04-01', count: 10 },
                  { date: '2026-04-02', count: 15 },
                ]),
              }),
            }),
          }),
        });

      const params: SessionMetricsParams = {
        tenantId: mockSession.tenantId,
        fifteenMinutesAgo: new Date(),
        oneDayAgo: new Date(),
        sevenDaysAgo: new Date(),
        thirtyDaysAgo: new Date(),
        now: new Date(),
      };

      const result = await getSessionMetrics(mockDb, params);

      expect(result.activeSessionCount).toBe(10);
      expect(result.usersOnlineLast15Min).toBe(5);
      expect(result.dailyActiveUsers).toBe(20);
      expect(result.weeklyActiveUsers).toBe(100);
      expect(result.monthlyActiveUsers).toBe(500);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
          }),
        }),
      });

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        }),
      });

      const params: CleanupExpiredSessionsParams = {
        tenantId: mockSession.tenantId,
        expiryDate: new Date(),
        limit: 10,
      };

      const result = await cleanupExpiredSessions(mockDb, params);

      expect(result.deletedCount).toBe(2);
      expect(result.deletedIds).toEqual(['1', '2']);
    });

    it('should return zero when no expired sessions', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const params: CleanupExpiredSessionsParams = {
        tenantId: mockSession.tenantId,
        expiryDate: new Date(),
        limit: 10,
      };

      const result = await cleanupExpiredSessions(mockDb, params);

      expect(result).toEqual({ deletedCount: 0, deletedIds: [] });
    });
  });

  describe('getExpiredSessions', () => {
    it('should return expired sessions', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      const params: GetExpiredSessionsParams = {
        tenantId: mockSession.tenantId,
        expiryDate: new Date(),
        limit: 10,
      };

      const result = await getExpiredSessions(mockDb, params);

      expect(result).toHaveLength(1);
    });
  });

  describe('deleteSessionsByIds', () => {
    it('should delete sessions by ids', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        }),
      });

      const result = await deleteSessionsByIds(mockDb, mockSession.tenantId, ['1', '2']);

      expect(result).toBe(2);
    });

    it('should return 0 when ids array is empty', async () => {
      const result = await deleteSessionsByIds(mockDb, mockSession.tenantId, []);

      expect(result).toBe(0);
    });
  });
});
