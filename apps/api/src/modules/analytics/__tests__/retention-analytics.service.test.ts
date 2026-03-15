import { describe, it, expect, beforeEach } from 'vitest';

import { RetentionAnalyticsService } from '../retention-analytics.service.js';

describe('RetentionAnalyticsService', () => {
  let service: RetentionAnalyticsService;

  beforeEach(() => {
    service = new RetentionAnalyticsService();
  });

  describe('initializeCohort', () => {
    it('should create cohort with initial values', () => {
      const sessionAt = new Date('2026-01-15T10:00:00Z');
      const cohort = service.initializeCohort('user-1', 'tenant-1', sessionAt, 0);

      expect(cohort.userId).toBe('user-1');
      expect(cohort.tenantId).toBe('tenant-1');
      expect(cohort.totalSessions).toBe(1);
      expect(cohort.d1Retained).toBe(0);
      expect(cohort.d7Retained).toBe(0);
    });
  });

  describe('calculateRetentionRate', () => {
    it('should return 0 for zero cohort size', () => {
      const rate = service.calculateRetentionRate(0, 0);
      expect(rate).toBe(0);
    });

    it('should calculate correct rate', () => {
      const rate = service.calculateRetentionRate(1, 1);
      expect(rate).toBe(1);
    });
  });

  describe('calculateChurnRisk', () => {
    it('should return high risk for new users', () => {
      const risk = service.calculateChurnRisk(1, 10, 1, new Date(), new Date());
      expect(risk).toBeGreaterThan(50);
    });

    it('should return low risk for engaged users', () => {
      const risk = service.calculateChurnRisk(20, 500, 30, new Date(), new Date());
      expect(risk).toBeLessThan(30);
    });

    it('should increase risk for users who stopped playing', () => {
      const lastSession = new Date('2026-01-01');
      const currentSession = new Date('2026-01-20');
      const risk = service.calculateChurnRisk(10, 200, 19, currentSession, lastSession);
      expect(risk).toBeGreaterThanOrEqual(30);
    });
  });

  describe('predict14DayChurn', () => {
    it('should return 0 for no risk', () => {
      const prediction = service.predict14DayChurn(0);
      expect(prediction).toBe(0);
    });

    it('should return 1 for maximum risk', () => {
      const prediction = service.predict14DayChurn(100);
      expect(prediction).toBe(1);
    });

    it('should return correct probability', () => {
      const prediction = service.predict14DayChurn(50);
      expect(prediction).toBe(0.5);
    });
  });

  describe('calculateAverageSessionDuration', () => {
    it('should return 0 for no sessions', () => {
      const avg = service.calculateAverageSessionDuration(0, 0);
      expect(avg).toBe(0);
    });

    it('should calculate correct average', () => {
      const avg = service.calculateAverageSessionDuration(150, 5);
      expect(avg).toBe(30);
    });
  });

  describe('calculateSessionFrequency', () => {
    it('should return 0 for first day', () => {
      const freq = service.calculateSessionFrequency(1, 0);
      expect(freq).toBe(0);
    });

    it('should calculate correct frequency', () => {
      const freq = service.calculateSessionFrequency(7, 7);
      expect(freq).toBe(1);
    });
  });

  describe('getSeasonProgressionPercentage', () => {
    it('should return 0 for level 0', () => {
      const pct = service.getSeasonProgressionPercentage(0);
      expect(pct).toBe(0);
    });

    it('should return 100 for max level', () => {
      const pct = service.getSeasonProgressionPercentage(50);
      expect(pct).toBe(100);
    });
  });

  describe('getNextSeasonMilestone', () => {
    it('should return first milestone for level 0', () => {
      const milestone = service.getNextSeasonMilestone(0);
      expect(milestone).toBe(1);
    });

    it('should return null when max level reached', () => {
      const milestone = service.getNextSeasonMilestone(50);
      expect(milestone).toBeNull();
    });
  });
});
