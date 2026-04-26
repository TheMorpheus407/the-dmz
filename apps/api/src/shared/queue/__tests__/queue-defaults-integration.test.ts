import { describe, expect, it } from 'vitest';

import { AI_QUEUE_DEFAULTS } from '../../defaults.js';
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_JOB_OPTIONS,
  MAX_JOB_ATTEMPTS,
} from '../../modules/ai/workers/queues.js';

describe('ai/workers/queues.ts defaults integration', () => {
  it('should import DEFAULT_JOB_OPTIONS from shared/queue/defaults.ts via AI_QUEUE_DEFAULTS', () => {
    expect(DEFAULT_JOB_OPTIONS).toEqual(AI_QUEUE_DEFAULTS.jobOptions);
  });

  it('should import DEFAULT_CONCURRENCY from shared/queue/defaults.ts via AI_QUEUE_DEFAULTS', () => {
    expect(DEFAULT_CONCURRENCY).toBe(AI_QUEUE_DEFAULTS.concurrency);
  });

  it('should import MAX_JOB_ATTEMPTS from shared/queue/defaults.ts via AI_QUEUE_DEFAULTS', () => {
    expect(MAX_JOB_ATTEMPTS).toBe(AI_QUEUE_DEFAULTS.maxAttempts);
  });

  it('should have AI-specific removeOnFail count of 5000', () => {
    expect(DEFAULT_JOB_OPTIONS.removeOnFail.count).toBe(5000);
  });

  it('should have AI-specific removeOnComplete count of 1000', () => {
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete.count).toBe(1000);
  });

  it('should have AI-specific concurrency of 5', () => {
    expect(DEFAULT_CONCURRENCY).toBe(5);
  });

  it('should have AI-specific maxAttempts of 10', () => {
    expect(MAX_JOB_ATTEMPTS).toBe(10);
  });
});
