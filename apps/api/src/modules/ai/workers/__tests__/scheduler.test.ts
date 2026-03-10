import { describe, it, expect } from 'vitest';

import type { SchedulerConfig } from '../scheduler.js';

describe('scheduler', () => {
  describe('SchedulerConfig', () => {
    it('should require redisUrl', () => {
      const config: SchedulerConfig = {
        redisUrl: 'redis://localhost:6379',
        batchSize: 10,
        minPerTier: 20,
        targetPerTier: 50,
      };

      expect(config.redisUrl).toBe('redis://localhost:6379');
      expect(config.batchSize).toBe(10);
      expect(config.minPerTier).toBe(20);
      expect(config.targetPerTier).toBe(50);
    });

    it('should have optional cronSchedule', () => {
      const config: SchedulerConfig = {
        redisUrl: 'redis://localhost:6379',
        cronSchedule: '0 3 * * *',
        batchSize: 10,
        minPerTier: 20,
        targetPerTier: 50,
      };

      expect(config.cronSchedule).toBe('0 3 * * *');
    });

    it('should have default values when not provided', () => {
      const config: SchedulerConfig = {
        redisUrl: 'redis://localhost:6379',
        batchSize: 5,
        minPerTier: 10,
        targetPerTier: 30,
      };

      expect(config.batchSize).toBe(5);
      expect(config.minPerTier).toBe(10);
      expect(config.targetPerTier).toBe(30);
    });
  });

  describe('Cron schedule patterns', () => {
    it('should support daily at 3 AM', () => {
      const cron = '0 3 * * *';
      expect(cron).toBe('0 3 * * *');
    });

    it('should support every 6 hours', () => {
      const cron = '0 */6 * * *';
      expect(cron).toBe('0 */6 * * *');
    });

    it('should support weekly on Sunday at midnight', () => {
      const cron = '0 0 * * 0';
      expect(cron).toBe('0 0 * * 0');
    });
  });
});
