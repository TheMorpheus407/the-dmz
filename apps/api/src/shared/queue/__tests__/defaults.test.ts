import { describe, expect, it } from 'vitest';

import {
  DEFAULT_JOB_OPTIONS,
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_JOB_ATTEMPTS,
  AI_QUEUE_DEFAULTS,
  RETENTION_QUEUE_DEFAULTS,
} from '../defaults.js';

describe('defaults', () => {
  describe('DEFAULT_JOB_OPTIONS', () => {
    it('should have removeOnComplete with age and count', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toHaveProperty('age');
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toHaveProperty('count');
    });

    it('should have removeOnComplete age of 3600 seconds (1 hour)', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete.age).toBe(3600);
    });

    it('should have removeOnComplete count of 1000', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete.count).toBe(1000);
    });

    it('should have removeOnFail with age and count', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnFail).toHaveProperty('age');
      expect(DEFAULT_JOB_OPTIONS.removeOnFail).toHaveProperty('count');
    });

    it('should have removeOnFail age of 604800 seconds (7 days)', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnFail.age).toBe(604800);
    });

    it('should have removeOnFail count of 1000', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnFail.count).toBe(1000);
    });

    it('should be a readonly object', () => {
      expect(DEFAULT_JOB_OPTIONS).toBeReadonly();
    });
  });

  describe('DEFAULT_CONCURRENCY', () => {
    it('should be 5', () => {
      expect(DEFAULT_CONCURRENCY).toBe(5);
    });

    it('should be a positive number', () => {
      expect(DEFAULT_CONCURRENCY).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_MAX_JOB_ATTEMPTS', () => {
    it('should be 5', () => {
      expect(DEFAULT_MAX_JOB_ATTEMPTS).toBe(5);
    });

    it('should be a positive number', () => {
      expect(DEFAULT_MAX_JOB_ATTEMPTS).toBeGreaterThan(0);
    });
  });

  describe('AI_QUEUE_DEFAULTS', () => {
    it('should have jobOptions with removeOnComplete and removeOnFail', () => {
      expect(AI_QUEUE_DEFAULTS.jobOptions).toHaveProperty('removeOnComplete');
      expect(AI_QUEUE_DEFAULTS.jobOptions).toHaveProperty('removeOnFail');
    });

    it('should have removeOnComplete matching AI queue requirements', () => {
      expect(AI_QUEUE_DEFAULTS.jobOptions.removeOnComplete).toEqual({
        age: 3600,
        count: 1000,
      });
    });

    it('should have removeOnFail matching AI queue requirements', () => {
      expect(AI_QUEUE_DEFAULTS.jobOptions.removeOnFail).toEqual({
        age: 604800,
        count: 5000,
      });
    });

    it('should have concurrency of 5', () => {
      expect(AI_QUEUE_DEFAULTS.concurrency).toBe(5);
    });

    it('should have maxAttempts of 10', () => {
      expect(AI_QUEUE_DEFAULTS.maxAttempts).toBe(10);
    });

    it('should have higher maxAttempts than DEFAULT_MAX_JOB_ATTEMPTS', () => {
      expect(AI_QUEUE_DEFAULTS.maxAttempts).toBeGreaterThan(DEFAULT_MAX_JOB_ATTEMPTS);
    });

    it('should have higher concurrency than RETENTION_QUEUE_DEFAULTS', () => {
      expect(AI_QUEUE_DEFAULTS.concurrency).toBeGreaterThan(RETENTION_QUEUE_DEFAULTS.concurrency);
    });

    it('should be a readonly object', () => {
      expect(AI_QUEUE_DEFAULTS).toBeReadonly();
    });
  });

  describe('RETENTION_QUEUE_DEFAULTS', () => {
    it('should have jobOptions with removeOnComplete and removeOnFail', () => {
      expect(RETENTION_QUEUE_DEFAULTS.jobOptions).toHaveProperty('removeOnComplete');
      expect(RETENTION_QUEUE_DEFAULTS.jobOptions).toHaveProperty('removeOnFail');
    });

    it('should have removeOnComplete matching retention queue requirements', () => {
      expect(RETENTION_QUEUE_DEFAULTS.jobOptions.removeOnComplete).toEqual({
        age: 3600,
        count: 500,
      });
    });

    it('should have removeOnFail matching retention queue requirements', () => {
      expect(RETENTION_QUEUE_DEFAULTS.jobOptions.removeOnFail).toEqual({
        age: 604800,
        count: 1000,
      });
    });

    it('should have concurrency of 3', () => {
      expect(RETENTION_QUEUE_DEFAULTS.concurrency).toBe(3);
    });

    it('should have maxAttempts of 5', () => {
      expect(RETENTION_QUEUE_DEFAULTS.maxAttempts).toBe(5);
    });

    it('should have lower concurrency than AI_QUEUE_DEFAULTS', () => {
      expect(RETENTION_QUEUE_DEFAULTS.concurrency).toBeLessThan(AI_QUEUE_DEFAULTS.concurrency);
    });

    it('should have lower maxAttempts than AI_QUEUE_DEFAULTS', () => {
      expect(RETENTION_QUEUE_DEFAULTS.maxAttempts).toBeLessThan(AI_QUEUE_DEFAULTS.maxAttempts);
    });

    it('should be a readonly object', () => {
      expect(RETENTION_QUEUE_DEFAULTS).toBeReadonly();
    });
  });

  describe('cross-queue consistency', () => {
    it('should have same removeOnComplete age across DEFAULT_JOB_OPTIONS and queue defaults', () => {
      expect(AI_QUEUE_DEFAULTS.jobOptions.removeOnComplete.age).toBe(
        DEFAULT_JOB_OPTIONS.removeOnComplete.age,
      );
      expect(RETENTION_QUEUE_DEFAULTS.jobOptions.removeOnComplete.age).toBe(
        DEFAULT_JOB_OPTIONS.removeOnComplete.age,
      );
    });

    it('should have same removeOnFail age across DEFAULT_JOB_OPTIONS and queue defaults', () => {
      expect(AI_QUEUE_DEFAULTS.jobOptions.removeOnFail.age).toBe(
        DEFAULT_JOB_OPTIONS.removeOnFail.age,
      );
      expect(RETENTION_QUEUE_DEFAULTS.jobOptions.removeOnFail.age).toBe(
        DEFAULT_JOB_OPTIONS.removeOnFail.age,
      );
    });

    it('should use DEFAULT_CONCURRENCY as baseline (AI and retention override it)', () => {
      expect(DEFAULT_CONCURRENCY).toBeLessThanOrEqual(AI_QUEUE_DEFAULTS.concurrency);
      expect(DEFAULT_CONCURRENCY).toBeLessThanOrEqual(RETENTION_QUEUE_DEFAULTS.concurrency);
    });
  });

  describe('BullMQ JobOptions compatibility', () => {
    it('should have removeOnComplete as an object with number properties (BullMQ compatible)', () => {
      const { removeOnComplete } = DEFAULT_JOB_OPTIONS;
      expect(typeof removeOnComplete.age).toBe('number');
      expect(typeof removeOnComplete.count).toBe('number');
    });

    it('should have removeOnFail as an object with number properties (BullMQ compatible)', () => {
      const { removeOnFail } = DEFAULT_JOB_OPTIONS;
      expect(typeof removeOnFail.age).toBe('number');
      expect(typeof removeOnFail.count).toBe('number');
    });

    it('should have age values in seconds (BullMQ expects seconds)', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete.age).toBe(3600);
      expect(DEFAULT_JOB_OPTIONS.removeOnFail.age).toBe(604800);
    });
  });
});
