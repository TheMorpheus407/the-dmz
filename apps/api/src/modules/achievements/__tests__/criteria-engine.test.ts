import { describe, it, expect } from 'vitest';

import {
  parseTimeWindow,
  getTimeWindowMs,
  evaluateCountCondition,
  evaluateAccuracyThreshold,
  evaluateTimeWindow,
  evaluateCriteria,
  updateProgress,
  type AchievementCriteria,
  type AchievementProgress,
} from '../achievement.criteria-engine.js';

import type { DomainEvent } from '../../../shared/events/event-types.js';

describe('AchievementCriteriaEngine', () => {
  describe('parseTimeWindow', () => {
    it('should parse seconds correctly', () => {
      const result = parseTimeWindow('30s');
      expect(result).toEqual({ value: 30, unit: 's' });
    });

    it('should parse minutes correctly', () => {
      const result = parseTimeWindow('15m');
      expect(result).toEqual({ value: 15, unit: 'm' });
    });

    it('should parse hours correctly', () => {
      const result = parseTimeWindow('2h');
      expect(result).toEqual({ value: 2, unit: 'h' });
    });

    it('should parse days correctly', () => {
      const result = parseTimeWindow('7d');
      expect(result).toEqual({ value: 7, unit: 'd' });
    });

    it('should return null for invalid format', () => {
      const result = parseTimeWindow('invalid');
      expect(result).toBeNull();
    });
  });

  describe('getTimeWindowMs', () => {
    it('should convert seconds to milliseconds', () => {
      expect(getTimeWindowMs('30s')).toBe(30 * 1000);
    });

    it('should convert minutes to milliseconds', () => {
      expect(getTimeWindowMs('15m')).toBe(15 * 60 * 1000);
    });

    it('should convert hours to milliseconds', () => {
      expect(getTimeWindowMs('2h')).toBe(2 * 60 * 60 * 1000);
    });

    it('should convert days to milliseconds', () => {
      expect(getTimeWindowMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return 0 for invalid format', () => {
      expect(getTimeWindowMs('invalid')).toBe(0);
    });
  });

  describe('evaluateCountCondition', () => {
    it('should return true when current count meets required count', () => {
      const progress: AchievementProgress = {
        currentCount: 100,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: [],
        completed: false,
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100 },
      };

      expect(evaluateCountCondition(progress, criteria)).toBe(true);
    });

    it('should return false when current count is below required count', () => {
      const progress: AchievementProgress = {
        currentCount: 50,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: [],
        completed: false,
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100 },
      };

      expect(evaluateCountCondition(progress, criteria)).toBe(false);
    });

    it('should handle count of 0 (always pass)', () => {
      const progress: AchievementProgress = {
        currentCount: 0,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: [],
        completed: false,
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 0 },
      };

      expect(evaluateCountCondition(progress, criteria)).toBe(true);
    });
  });

  describe('evaluateAccuracyThreshold', () => {
    it('should return true when accuracy meets threshold', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'test-event-id',
        eventType: 'game.session.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: { accuracy: 0.96 },
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.session.completed',
        conditions: { accuracyThreshold: 0.95 },
      };

      expect(evaluateAccuracyThreshold(event, criteria)).toBe(true);
    });

    it('should return false when accuracy is below threshold', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'test-event-id',
        eventType: 'game.session.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: { accuracy: 0.9 },
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.session.completed',
        conditions: { accuracyThreshold: 0.95 },
      };

      expect(evaluateAccuracyThreshold(event, criteria)).toBe(false);
    });

    it('should return false when accuracy is not in payload', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'test-event-id',
        eventType: 'game.session.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: {},
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.session.completed',
        conditions: { accuracyThreshold: 0.95 },
      };

      expect(evaluateAccuracyThreshold(event, criteria)).toBe(false);
    });
  });

  describe('evaluateTimeWindow', () => {
    it('should return true when last update is within time window', () => {
      const now = new Date();
      const recentTime = new Date(now.getTime() - 1000).toISOString();

      const progress: AchievementProgress = {
        currentCount: 50,
        lastUpdated: recentTime,
        eventsProcessed: [],
        completed: false,
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100, timeWindow: '30s' },
      };

      expect(evaluateTimeWindow(progress, criteria)).toBe(true);
    });

    it('should return false when last update is outside time window', () => {
      const oldTime = new Date(Date.now() - 60 * 1000).toISOString();

      const progress: AchievementProgress = {
        currentCount: 50,
        lastUpdated: oldTime,
        eventsProcessed: [],
        completed: false,
      };
      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100, timeWindow: '30s' },
      };

      expect(evaluateTimeWindow(progress, criteria)).toBe(false);
    });
  });

  describe('evaluateCriteria', () => {
    it('should return true when all conditions are met', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'test-event-id',
        eventType: 'game.decision.denied',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: {},
      };

      const progress: AchievementProgress = {
        currentCount: 100,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: ['event-1', 'event-2'],
        completed: false,
      };

      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100 },
      };

      expect(evaluateCriteria(criteria, progress, event)).toBe(true);
    });

    it('should return false when count condition is not met', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'test-event-id',
        eventType: 'game.decision.denied',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: {},
      };

      const progress: AchievementProgress = {
        currentCount: 50,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: [],
        completed: false,
      };

      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100 },
      };

      expect(evaluateCriteria(criteria, progress, event)).toBe(false);
    });
  });

  describe('updateProgress', () => {
    it('should increment count for new events', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'new-event-id',
        eventType: 'game.decision.denied',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: {},
      };

      const progress: AchievementProgress = {
        currentCount: 1,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: ['existing-event-id'],
        completed: false,
      };

      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100 },
      };

      const updatedProgress = updateProgress(progress, event, criteria);

      expect(updatedProgress.currentCount).toBe(2);
      expect(updatedProgress.eventsProcessed).toContain('new-event-id');
      expect(updatedProgress.eventsProcessed).toContain('existing-event-id');
    });

    it('should not duplicate events already processed', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'existing-event-id',
        eventType: 'game.decision.denied',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: {},
      };

      const progress: AchievementProgress = {
        currentCount: 1,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: ['existing-event-id'],
        completed: false,
      };

      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100 },
      };

      const updatedProgress = updateProgress(progress, event, criteria);

      expect(updatedProgress.currentCount).toBe(1);
    });

    it('should mark progress as completed when count threshold is met', () => {
      const event: DomainEvent<Record<string, unknown>> = {
        eventId: 'event-100',
        eventType: 'game.decision.denied',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        source: 'test-source',
        version: 1,
        payload: {},
      };

      const progress: AchievementProgress = {
        currentCount: 99,
        lastUpdated: new Date().toISOString(),
        eventsProcessed: Array.from({ length: 99 }, (_, i) => `event-${i}`),
        completed: false,
      };

      const criteria: AchievementCriteria = {
        eventType: 'game.decision.denied',
        conditions: { count: 100 },
      };

      const updatedProgress = updateProgress(progress, event, criteria);

      expect(updatedProgress.completed).toBe(true);
      expect(updatedProgress.completedAt).toBeDefined();
    });
  });
});
