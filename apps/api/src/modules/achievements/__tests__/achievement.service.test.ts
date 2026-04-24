import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AchievementService } from '../achievement.service.js';
import { findActiveGameSession, updatePlayerXP } from '../../game/session/index.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';
import type { EventBus } from '../../../shared/events/event-types.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../game/session/game-session.repo.js', () => ({
  findActiveGameSession: vi.fn(),
  updatePlayerXP: vi.fn(),
}));

describe('AchievementService', () => {
  const createMockDb = () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([]),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    return mockDb;
  };

  const createMockEventBus = (): EventBus => ({
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAchievementDefinitions', () => {
    it('should return visible achievement definitions for tenant', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockDefinitions = [
        { id: 'ach-1', title: 'First Achievement', visibility: 'visible' as const },
        { id: 'ach-2', title: 'Second Achievement', visibility: 'visible' as const },
      ];

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue(mockDefinitions);

      const result = await service.getAllAchievementDefinitions('tenant-1');

      expect(result).toEqual(mockDefinitions);
    });

    it('should return empty array when no definitions exist', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([]);

      const result = await service.getAllAchievementDefinitions('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerAchievements', () => {
    it('should return player achievements with definitions', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerAchievement: {
          id: 'pa-1',
          playerId: 'player-1',
          achievementId: 'ach-1',
          tenantId: 'tenant-1',
          unlockedAt: new Date(),
          progress: null,
          notificationSent: true,
          sharedToProfile: false,
        },
        definition: {
          id: 'ach-1',
          title: 'Test Achievement',
          achievementKey: 'test_achievement',
          description: 'Test description',
          category: 'gameplay',
          points: 100,
          criteria: { eventType: 'game.decision.denied', conditions: { count: 1 } },
          visibility: 'visible' as const,
          enterpriseReportable: false,
        },
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([mockRow]);

      const result = await service.getPlayerAchievements('player-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('pa-1');
      expect(result[0]!.definition.title).toBe('Test Achievement');
    });

    it('should return empty array when player has no achievements', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([]);

      const result = await service.getPlayerAchievements('player-1', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerUnlockedAchievements', () => {
    it('should return only unlocked achievements', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerAchievement: {
          id: 'pa-1',
          playerId: 'player-1',
          achievementId: 'ach-1',
          tenantId: 'tenant-1',
          unlockedAt: new Date(),
          progress: null,
          notificationSent: true,
          sharedToProfile: false,
        },
        definition: {
          id: 'ach-1',
          title: 'Unlocked Achievement',
          achievementKey: 'unlocked',
          description: 'Test',
          category: 'gameplay',
          points: 50,
          criteria: { eventType: 'game.decision.denied', conditions: { count: 1 } },
          visibility: 'visible' as const,
          enterpriseReportable: false,
        },
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([mockRow]);

      const result = await service.getPlayerUnlockedAchievements('player-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.unlockedAt).toBeTruthy();
    });

    it('should filter out in-progress achievements', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerAchievement: {
          id: 'pa-1',
          playerId: 'player-1',
          achievementId: 'ach-1',
          tenantId: 'tenant-1',
          unlockedAt: null,
          progress: {
            currentCount: 5,
            lastUpdated: new Date().toISOString(),
            eventsProcessed: [],
            completed: false,
          },
          notificationSent: false,
          sharedToProfile: false,
        },
        definition: {
          id: 'ach-1',
          title: 'In Progress Achievement',
          achievementKey: 'in_progress',
          description: 'Test',
          category: 'gameplay',
          points: 50,
          criteria: { eventType: 'game.decision.denied', conditions: { count: 10 } },
          visibility: 'visible' as const,
          enterpriseReportable: false,
        },
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([mockRow]);

      const result = await service.getPlayerUnlockedAchievements('player-1', 'tenant-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPlayerInProgressAchievements', () => {
    it('should return only in-progress achievements', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerAchievement: {
          id: 'pa-1',
          playerId: 'player-1',
          achievementId: 'ach-1',
          tenantId: 'tenant-1',
          unlockedAt: null,
          progress: {
            currentCount: 5,
            lastUpdated: new Date().toISOString(),
            eventsProcessed: [],
            completed: false,
          },
          notificationSent: false,
          sharedToProfile: false,
        },
        definition: {
          id: 'ach-1',
          title: 'In Progress Achievement',
          achievementKey: 'in_progress',
          description: 'Test',
          category: 'gameplay',
          points: 50,
          criteria: { eventType: 'game.decision.denied', conditions: { count: 10 } },
          visibility: 'visible' as const,
          enterpriseReportable: false,
        },
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([mockRow]);

      const result = await service.getPlayerInProgressAchievements('player-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.unlockedAt).toBeNull();
    });

    it('should filter out unlocked achievements', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerAchievement: {
          id: 'pa-1',
          playerId: 'player-1',
          achievementId: 'ach-1',
          tenantId: 'tenant-1',
          unlockedAt: new Date(),
          progress: null,
          notificationSent: true,
          sharedToProfile: false,
        },
        definition: {
          id: 'ach-1',
          title: 'Unlocked Achievement',
          achievementKey: 'unlocked',
          description: 'Test',
          category: 'gameplay',
          points: 50,
          criteria: { eventType: 'game.decision.denied', conditions: { count: 1 } },
          visibility: 'visible' as const,
          enterpriseReportable: false,
        },
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([mockRow]);

      const result = await service.getPlayerInProgressAchievements('player-1', 'tenant-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPublicPlayerAchievements', () => {
    it('should return only publicly shared achievements', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerAchievement: {
          id: 'pa-1',
          playerId: 'player-1',
          achievementId: 'ach-1',
          tenantId: 'tenant-1',
          unlockedAt: new Date(),
          progress: null,
          notificationSent: true,
          sharedToProfile: true,
        },
        definition: {
          id: 'ach-1',
          title: 'Shared Achievement',
          achievementKey: 'shared',
          description: 'Test',
          category: 'gameplay',
          points: 50,
          criteria: { eventType: 'game.decision.denied', conditions: { count: 1 } },
          visibility: 'visible' as const,
          enterpriseReportable: false,
        },
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue([mockRow]);

      const result = await service.getPublicPlayerAchievements('player-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.sharedToProfile).toBe(true);
    });
  });

  describe('getPlayerByUserId', () => {
    it('should return playerId when user exists', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.limit.mockResolvedValue([{ profileId: 'player-1' }]);

      const result = await service.getPlayerByUserId('user-1', 'tenant-1');

      expect(result).toBe('player-1');
    });

    it('should return null when user does not exist', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await service.getPlayerByUserId('unknown-user', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('getEnterpriseReportableAchievements', () => {
    it('should return enterprise reportable achievements', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockDefinitions = [
        { id: 'ach-1', title: 'Enterprise Achievement', enterpriseReportable: true },
      ];

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.where.mockResolvedValue(mockDefinitions);

      const result = await service.getEnterpriseReportableAchievements('tenant-1');

      expect(result).toEqual(mockDefinitions);
    });
  });

  describe('toggleShareAchievement', () => {
    it('should toggle sharedToProfile from false to true', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerId: 'player-1',
        achievementId: 'ach-1',
        tenantId: 'tenant-1',
        unlockedAt: null,
        progress: null,
        notificationSent: false,
        sharedToProfile: false,
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockRow]);
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();

      const result = await service.toggleShareAchievement('player-1', 'ach-1', 'tenant-1');

      expect(result).toBe(true);
    });

    it('should toggle sharedToProfile from true to false', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockRow = {
        playerId: 'player-1',
        achievementId: 'ach-1',
        tenantId: 'tenant-1',
        unlockedAt: new Date(),
        progress: null,
        notificationSent: true,
        sharedToProfile: true,
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockRow]);
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();

      const result = await service.toggleShareAchievement('player-1', 'ach-1', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should return false when achievement not found', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await service.toggleShareAchievement('player-1', 'unknown-ach', 'tenant-1');

      expect(result).toBe(false);
    });
  });

  describe('unlockAchievement', () => {
    it('should unlock achievement and return success result', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockAchievementDef = {
        id: 'ach-1',
        title: 'Test Achievement',
        achievementKey: 'test',
        description: 'Test',
        category: 'gameplay',
        points: 100,
        criteria: { eventType: 'game.decision.denied', conditions: { count: 1 } },
        visibility: 'visible' as const,
        enterpriseReportable: false,
      };

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit
        .mockResolvedValueOnce([]) // first call: check for existing player achievement (none)
        .mockResolvedValueOnce([mockAchievementDef]) // second call: get achievement definition
        .mockResolvedValueOnce([{ userId: 'user-1' }]); // third call: get profile

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();

      vi.mocked(findActiveGameSession).mockResolvedValue({ id: 'session-1' });
      vi.mocked(updatePlayerXP).mockResolvedValue({ didLevelUp: false, newLevel: 2 });

      const result = await service.unlockAchievement({
        playerId: 'player-1',
        achievementId: 'ach-1',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(true);
      expect(result.achievement).toBeDefined();
      expect(result.xpAwarded).toBe(100);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should return error when achievement already unlocked', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([{ unlockedAt: new Date() }]);

      const result = await service.unlockAchievement({
        playerId: 'player-1',
        achievementId: 'ach-1',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Achievement already unlocked');
    });

    it('should return error when achievement definition not found', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit
        .mockResolvedValueOnce([]) // existing player achievement check
        .mockResolvedValueOnce([]); // achievement definition not found

      const result = await service.unlockAchievement({
        playerId: 'player-1',
        achievementId: 'invalid-ach',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Achievement definition not found');
    });
  });

  describe('processGameEvent', () => {
    const createTestEvent = (overrides: Partial<Record<string, string>> = {}) => ({
      eventId: 'event-1',
      eventType: 'game.decision.denied',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      source: 'test',
      version: 1,
      payload: {},
      ...overrides,
    });

    it('should return empty array when player ID cannot be extracted', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const event = createTestEvent({ userId: '' });

      const result = await service.processGameEvent(event);

      expect(result).toEqual([]);
    });

    it('should return empty array when player profile not found', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const event = createTestEvent();

      const result = await service.processGameEvent(event);

      expect(result).toEqual([]);
    });

    it('should return empty array when no achievements match the event', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([{ profileId: 'player-1' }]).mockResolvedValue([]);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([]);

      const result = await service.processGameEvent(
        createTestEvent({ eventType: 'game.decision.denied' }),
      );

      expect(result).toEqual([]);
    });

    it('should unlock achievement when criteria are met', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockAchievementDef = {
        id: 'ach-1',
        title: 'Test Achievement',
        achievementKey: 'test',
        description: 'Test',
        category: 'gameplay',
        points: 100,
        criteria: { eventType: 'game.decision.denied', conditions: { count: 1 } },
        visibility: 'visible' as const,
        enterpriseReportable: false,
      };

      vi.spyOn(service, 'getPlayerByUserId').mockResolvedValue('player-1');

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();

      let fromCallCount = 0;
      mockDb.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            then: (resolve: (val: unknown) => void) => resolve([mockAchievementDef]),
            execute: async () => [mockAchievementDef],
            where: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
          };
        }
        return {
          then: (resolve: (val: unknown) => void) => resolve([]),
          execute: async () => [],
          where: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
        };
      });

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();

      vi.mocked(findActiveGameSession).mockResolvedValue({ id: 'session-1' });
      vi.mocked(updatePlayerXP).mockResolvedValue({ didLevelUp: true, newLevel: 2 });

      const result = await service.processGameEvent({
        eventId: 'event-1',
        eventType: 'game.decision.denied',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'test',
        version: 1,
        payload: { userId: 'user-1' },
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.success).toBe(true);
      expect(result[0]!.xpAwarded).toBe(100);
      expect(result[0]!.didLevelUp).toBe(true);
      expect(result[0]!.newLevel).toBe(2);
      expect(updatePlayerXP).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should NOT unlock achievement when criteria are NOT met (count threshold not reached)', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus();
      const service = new AchievementService(mockDb, mockEventBus);

      const mockAchievementDef = {
        id: 'ach-1',
        title: 'Test Achievement',
        achievementKey: 'test',
        description: 'Test',
        category: 'gameplay',
        points: 100,
        criteria: { eventType: 'game.decision.denied', conditions: { count: 10 } },
        visibility: 'visible' as const,
        enterpriseReportable: false,
      };

      const mockExistingProgress = {
        id: 'pa-1',
        playerId: 'player-1',
        achievementId: 'ach-1',
        tenantId: 'tenant-1',
        unlockedAt: null,
        progress: {
          currentCount: 5,
          lastUpdated: new Date().toISOString(),
          eventsProcessed: [],
          completed: false,
        },
        notificationSent: false,
        sharedToProfile: false,
      };

      vi.spyOn(service, 'getPlayerByUserId').mockResolvedValue('player-1');

      mockDb.execute.mockResolvedValue([]);
      mockDb.select.mockReturnThis();

      let fromCallCount = 0;
      mockDb.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            then: (resolve: (val: unknown) => void) => resolve([mockAchievementDef]),
            execute: async () => [mockAchievementDef],
            where: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
          };
        }
        return {
          then: (resolve: (val: unknown) => void) => resolve([mockExistingProgress]),
          execute: async () => [mockExistingProgress],
          where: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValueOnce([mockExistingProgress]),
        };
      });

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();

      const result = await service.processGameEvent({
        eventId: 'event-1',
        eventType: 'game.decision.denied',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'test',
        version: 1,
        payload: { userId: 'user-1' },
      });

      expect(result).toHaveLength(0);
      expect(updatePlayerXP).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
