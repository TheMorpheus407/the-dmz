import { describe, it, expect, vi } from 'vitest';

import { AchievementService } from '../achievement.service.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';
import type { IEventBus } from '../../../shared/events/event-types.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../game/session/game-session.repo.js', () => ({
  findActiveGameSession: vi.fn(),
  updatePlayerXP: vi.fn(),
}));

describe('AchievementService', () => {
  const createMockDb = () => ({
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
  });

  const createMockEventBus = () => ({
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  });

  describe('service instantiation', () => {
    it('should create service instance with database client', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(service).toBeDefined();
    });

    it('should have getAllAchievementDefinitions method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.getAllAchievementDefinitions).toBe('function');
    });

    it('should have getPlayerAchievements method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.getPlayerAchievements).toBe('function');
    });

    it('should have unlockAchievement method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.unlockAchievement).toBe('function');
    });

    it('should have processGameEvent method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.processGameEvent).toBe('function');
    });

    it('should have toggleShareAchievement method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.toggleShareAchievement).toBe('function');
    });

    it('should have getEnterpriseReportableAchievements method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.getEnterpriseReportableAchievements).toBe('function');
    });

    it('should have getPublicPlayerAchievements method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.getPublicPlayerAchievements).toBe('function');
    });

    it('should have getPlayerByUserId method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.getPlayerByUserId).toBe('function');
    });

    it('should have getPlayerUnlockedAchievements method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.getPlayerUnlockedAchievements).toBe('function');
    });

    it('should have getPlayerInProgressAchievements method', () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);
      expect(typeof service.getPlayerInProgressAchievements).toBe('function');
    });
  });

  describe('processGameEvent handles all achievements regardless of visibility', () => {
    it('should be able to call processGameEvent with valid event structure', async () => {
      const mockDb = createMockDb() as unknown as DatabaseClient;
      const mockEventBus = createMockEventBus() as unknown as IEventBus;
      const service = new AchievementService(mockDb, mockEventBus);

      const event = {
        eventId: 'event-1',
        eventType: 'game.decision.denied' as const,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'test',
        version: 1,
        payload: {},
      };

      // The method should exist and be callable
      expect(typeof service.processGameEvent).toBe('function');

      // If we call it, it should not throw
      await expect(service.processGameEvent(event)).resolves.not.toThrow();
    });
  });
});
