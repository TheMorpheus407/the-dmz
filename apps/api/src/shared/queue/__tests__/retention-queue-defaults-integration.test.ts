import { describe, expect, it } from 'vitest';

import { RETENTION_QUEUE_DEFAULTS } from '../../defaults.js';
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_JOB_OPTIONS,
  MAX_JOB_ATTEMPTS,
} from '../../modules/retention/workers/queues.js';

describe('retention/workers/queues.ts defaults integration', () => {
  it('should import DEFAULT_JOB_OPTIONS from shared/queue/defaults.ts via RETENTION_QUEUE_DEFAULTS', () => {
    expect(DEFAULT_JOB_OPTIONS).toEqual(RETENTION_QUEUE_DEFAULTS.jobOptions);
  });

  it('should import DEFAULT_CONCURRENCY from shared/queue/defaults.ts via RETENTION_QUEUE_DEFAULTS', () => {
    expect(DEFAULT_CONCURRENCY).toBe(RETENTION_QUEUE_DEFAULTS.concurrency);
  });

  it('should import MAX_JOB_ATTEMPTS from shared/queue/defaults.ts via RETENTION_QUEUE_DEFAULTS', () => {
    expect(MAX_JOB_ATTEMPTS).toBe(RETENTION_QUEUE_DEFAULTS.maxAttempts);
  });

  it('should have retention-specific removeOnFail count of 1000', () => {
    expect(DEFAULT_JOB_OPTIONS.removeOnFail.count).toBe(1000);
  });

  it('should have retention-specific removeOnComplete count of 500', () => {
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete.count).toBe(500);
  });

  it('should have retention-specific concurrency of 3', () => {
    expect(DEFAULT_CONCURRENCY).toBe(3);
  });

  it('should have retention-specific maxAttempts of 5', () => {
    expect(MAX_JOB_ATTEMPTS).toBe(5);
  });
});
