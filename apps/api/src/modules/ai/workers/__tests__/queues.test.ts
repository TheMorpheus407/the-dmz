import { describe, it, expect } from 'vitest';

import {
  QUEUE_NAMES,
  JOB_TYPES,
  EXPONENTIAL_BACKOFF_DELAYS,
  MAX_JOB_ATTEMPTS,
  RETRY_STRATEGY,
  createJobIdempotencyKey,
  type GenerateEmailJobData,
  type BatchGenerateJobData,
  type RegenerateFailedJobData,
} from '../queues.js';

describe('queues', () => {
  describe('QUEUE_NAMES', () => {
    it('should have correct queue names', () => {
      expect(QUEUE_NAMES.AI_GENERATION).toBe('ai-generation');
      expect(QUEUE_NAMES.AI_GENERATION_DLQ).toBe('ai-generation-dlq');
    });
  });

  describe('JOB_TYPES', () => {
    it('should have correct job types', () => {
      expect(JOB_TYPES.GENERATE_EMAIL).toBe('generate-email');
      expect(JOB_TYPES.BATCH_GENERATE).toBe('batch-generate');
      expect(JOB_TYPES.REGENERATE_FAILED).toBe('regenerate-failed');
    });
  });

  describe('EXPONENTIAL_BACKOFF_DELAYS', () => {
    it('should have correct number of delay intervals', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS).toHaveLength(5);
    });

    it('should have delays in increasing order', () => {
      for (let i = 1; i < EXPONENTIAL_BACKOFF_DELAYS.length; i++) {
        expect(EXPONENTIAL_BACKOFF_DELAYS[i]!).toBeGreaterThan(EXPONENTIAL_BACKOFF_DELAYS[i - 1]!);
      }
    });

    it('should have correct delay values', () => {
      expect(EXPONENTIAL_BACKOFF_DELAYS[0]).toBe(30 * 1000);
      expect(EXPONENTIAL_BACKOFF_DELAYS[1]).toBe(2 * 60 * 1000);
      expect(EXPONENTIAL_BACKOFF_DELAYS[2]).toBe(10 * 60 * 1000);
      expect(EXPONENTIAL_BACKOFF_DELAYS[3]).toBe(30 * 60 * 1000);
      expect(EXPONENTIAL_BACKOFF_DELAYS[4]).toBe(2 * 60 * 60 * 1000);
    });
  });

  describe('MAX_JOB_ATTEMPTS', () => {
    it('should be 10', () => {
      expect(MAX_JOB_ATTEMPTS).toBe(10);
    });
  });

  describe('RETRY_STRATEGY', () => {
    it('should return correct delay for first attempt', () => {
      expect(RETRY_STRATEGY(1)).toBe(30 * 1000);
    });

    it('should return correct delay for second attempt', () => {
      expect(RETRY_STRATEGY(2)).toBe(2 * 60 * 1000);
    });

    it('should return correct delay for third attempt', () => {
      expect(RETRY_STRATEGY(3)).toBe(10 * 60 * 1000);
    });

    it('should return correct delay for fourth attempt', () => {
      expect(RETRY_STRATEGY(4)).toBe(30 * 60 * 1000);
    });

    it('should return correct delay for fifth attempt', () => {
      expect(RETRY_STRATEGY(5)).toBe(2 * 60 * 60 * 1000);
    });

    it('should return max delay for attempts beyond defined delays', () => {
      expect(RETRY_STRATEGY(6)).toBe(2 * 60 * 60 * 1000);
      expect(RETRY_STRATEGY(10)).toBe(2 * 60 * 60 * 1000);
    });
  });

  describe('createJobIdempotencyKey', () => {
    it('should create unique key for generate-email job', () => {
      const data: GenerateEmailJobData = {
        type: 'generate-email',
        difficulty: 3,
        faction: 'Nexion Industries',
        attackType: 'spear_phishing',
        tenantId: 'tenant-1',
      };

      const key = createJobIdempotencyKey('generate-email', data);

      expect(key).toContain('generate-email');
      expect(key).toContain('tenant-1');
      expect(key).toContain('3');
      expect(key).toContain('Nexion Industries');
      expect(key).toContain('spear_phishing');
    });

    it('should create consistent key for same generate-email job', () => {
      const data: GenerateEmailJobData = {
        type: 'generate-email',
        difficulty: 2,
        faction: 'Librarians',
        tenantId: 'tenant-2',
      };

      const key1 = createJobIdempotencyKey('generate-email', data);
      const key2 = createJobIdempotencyKey('generate-email', data);

      expect(key1).toBe(key2);
    });

    it('should handle missing optional fields', () => {
      const data: GenerateEmailJobData = {
        type: 'generate-email',
        difficulty: 1,
        tenantId: 'tenant-3',
      };

      const key = createJobIdempotencyKey('generate-email', data);

      expect(key).toContain('generate-email');
      expect(key).toContain('tenant-3');
      expect(key).toContain('none');
    });

    it('should create unique key for batch-generate job', () => {
      const data: BatchGenerateJobData = {
        type: 'batch-generate',
        difficulties: [1, 2, 3],
        countPerDifficulty: 10,
        tenantId: 'tenant-1',
      };

      const key = createJobIdempotencyKey('batch-generate', data);

      expect(key).toContain('batch-generate');
      expect(key).toContain('tenant-1');
    });

    it('should create unique key for regenerate-failed job', () => {
      const data: RegenerateFailedJobData = {
        type: 'regenerate-failed',
        failedEmailIds: ['email-1', 'email-2'],
        tenantId: 'tenant-1',
      };

      const key = createJobIdempotencyKey('regenerate-failed', data);

      expect(key).toContain('regenerate-failed');
      expect(key).toContain('tenant-1');
    });

    it('should sort failed email IDs for consistent key generation', () => {
      const data1: RegenerateFailedJobData = {
        type: 'regenerate-failed',
        failedEmailIds: ['email-2', 'email-1'],
        tenantId: 'tenant-1',
      };

      const data2: RegenerateFailedJobData = {
        type: 'regenerate-failed',
        failedEmailIds: ['email-1', 'email-2'],
        tenantId: 'tenant-1',
      };

      const key1 = createJobIdempotencyKey('regenerate-failed', data1);
      const key2 = createJobIdempotencyKey('regenerate-failed', data2);

      expect(key1).toBe(key2);
    });
  });
});
