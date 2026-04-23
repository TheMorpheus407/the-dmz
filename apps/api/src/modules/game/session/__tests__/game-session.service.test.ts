import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  bootstrapGameSession,
  getGameSession,
  ensureGameSession,
  type AuthenticatedUser,
} from '../game-session.service.js';
import { findActiveGameSession, createGameSession } from '../game-session.repo.js';
import { recordGameSession } from '../../../shared/metrics/hooks.js';

import type { DB } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../game-session.repo.js', () => ({
  findActiveGameSession: vi.fn(),
  createGameSession: vi.fn(),
}));

vi.mock('../../../shared/metrics/hooks.js', () => ({
  recordGameSession: vi.fn(),
}));

vi.mock('@the-dmz/shared/game', () => ({
  generateSeed: vi.fn().mockReturnValue(12345n),
}));

describe('GameSessionService', () => {
  const mockDb = {
    query: {
      gameSessions: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
  } as unknown as DB;

  const mockUser: AuthenticatedUser = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    sessionId: 'session-789',
    role: 'player',
  };

  const mockGameSession = {
    id: 'session-id-1',
    tenantId: 'tenant-456',
    userId: 'user-123',
    seed: 12345n,
    day: 1,
    funds: 1000,
    clientCount: 5,
    threatLevel: 'low' as const,
    defenseLevel: 1,
    serverLevel: 1,
    networkLevel: 1,
    isActive: 'active-uuid',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    playerXP: 0,
    playerLevel: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bootstrapGameSession', () => {
    it('should return existing session when one already exists', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(mockGameSession);

      const result = await bootstrapGameSession(mockDb, mockUser);

      expect(result.isNew).toBe(false);
      expect(result.session).toEqual({
        schemaVersion: 1,
        tenantId: mockGameSession.tenantId,
        sessionId: mockGameSession.id,
        userId: mockGameSession.userId,
        day: mockGameSession.day,
        funds: mockGameSession.funds,
        clientCount: mockGameSession.clientCount,
        threatLevel: mockGameSession.threatLevel,
        facilityLoadout: {
          defenseLevel: mockGameSession.defenseLevel,
          serverLevel: mockGameSession.serverLevel,
          networkLevel: mockGameSession.networkLevel,
        },
        createdAt: mockGameSession.createdAt.toISOString(),
        updatedAt: mockGameSession.updatedAt.toISOString(),
      });
      expect(findActiveGameSession).toHaveBeenCalledWith(
        mockDb,
        mockUser.userId,
        mockUser.tenantId,
      );
      expect(createGameSession).not.toHaveBeenCalled();
    });

    it('should create a new session when none exists', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(null);
      vi.mocked(createGameSession).mockResolvedValue(mockGameSession);

      const result = await bootstrapGameSession(mockDb, mockUser);

      expect(result.isNew).toBe(true);
      expect(result.session.sessionId).toBe(mockGameSession.id);
      expect(findActiveGameSession).toHaveBeenCalledWith(
        mockDb,
        mockUser.userId,
        mockUser.tenantId,
      );
      expect(createGameSession).toHaveBeenCalled();
      expect(recordGameSession).toHaveBeenCalledWith('start', mockUser.tenantId);
    });

    it('should propagate error when findActiveGameSession throws', async () => {
      vi.mocked(findActiveGameSession).mockRejectedValue(new Error('DB error'));

      await expect(bootstrapGameSession(mockDb, mockUser)).rejects.toThrow('DB error');
    });

    it('should propagate error when createGameSession throws', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(null);
      vi.mocked(createGameSession).mockRejectedValue(new Error('Create error'));

      await expect(bootstrapGameSession(mockDb, mockUser)).rejects.toThrow('Create error');
    });

    it('should pass correct session data when creating new session', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(null);
      vi.mocked(createGameSession).mockResolvedValue(mockGameSession);

      await bootstrapGameSession(mockDb, mockUser);

      expect(createGameSession).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          tenantId: mockUser.tenantId,
          userId: mockUser.userId,
          seed: 12345n,
          day: 1,
          funds: 1000,
          clientCount: 5,
          threatLevel: 'low',
          defenseLevel: 1,
          serverLevel: 1,
          networkLevel: 1,
        }),
      );
    });
  });

  describe('getGameSession', () => {
    it('should return session data when session exists', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(mockGameSession);

      const result = await getGameSession(mockDb, mockUser);

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(mockGameSession.id);
      expect(result!.tenantId).toBe(mockGameSession.tenantId);
      expect(result!.userId).toBe(mockGameSession.userId);
      expect(findActiveGameSession).toHaveBeenCalledWith(
        mockDb,
        mockUser.userId,
        mockUser.tenantId,
      );
    });

    it('should return null when no session exists', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(null);

      const result = await getGameSession(mockDb, mockUser);

      expect(result).toBeNull();
      expect(findActiveGameSession).toHaveBeenCalledWith(
        mockDb,
        mockUser.userId,
        mockUser.tenantId,
      );
    });

    it('should propagate error when findActiveGameSession throws', async () => {
      vi.mocked(findActiveGameSession).mockRejectedValue(new Error('DB error'));

      await expect(getGameSession(mockDb, mockUser)).rejects.toThrow('DB error');
    });
  });

  describe('ensureGameSession', () => {
    it('should return existing session when one already exists', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(mockGameSession);

      const result = await ensureGameSession(mockDb, mockUser);

      expect(result.sessionId).toBe(mockGameSession.id);
      expect(findActiveGameSession).toHaveBeenCalledWith(
        mockDb,
        mockUser.userId,
        mockUser.tenantId,
      );
      expect(createGameSession).not.toHaveBeenCalled();
    });

    it('should create new session when none exists', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(null);
      vi.mocked(createGameSession).mockResolvedValue(mockGameSession);

      const result = await ensureGameSession(mockDb, mockUser);

      expect(result.sessionId).toBe(mockGameSession.id);
      expect(findActiveGameSession).toHaveBeenCalledTimes(2);
      expect(findActiveGameSession).toHaveBeenCalledWith(
        mockDb,
        mockUser.userId,
        mockUser.tenantId,
      );
      expect(createGameSession).toHaveBeenCalled();
      expect(recordGameSession).toHaveBeenCalledWith('start', mockUser.tenantId);
    });

    it('should propagate error when getGameSession throws', async () => {
      vi.mocked(findActiveGameSession).mockRejectedValue(new Error('DB error'));

      await expect(ensureGameSession(mockDb, mockUser)).rejects.toThrow('DB error');
    });

    it('should propagate error when bootstrapGameSession throws during session creation', async () => {
      vi.mocked(findActiveGameSession).mockResolvedValue(null);
      vi.mocked(createGameSession).mockRejectedValue(new Error('Create failed'));

      await expect(ensureGameSession(mockDb, mockUser)).rejects.toThrow('Create failed');
    });
  });
});
