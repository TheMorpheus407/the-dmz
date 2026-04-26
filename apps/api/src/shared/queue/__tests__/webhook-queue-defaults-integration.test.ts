import { describe, expect, it } from 'vitest';

import { WEBHOOK_QUEUE_DEFAULTS } from '../../defaults.js';
import { WEBHOOK_JOB_OPTIONS } from '../../modules/webhooks/workers/webhook-queue.js';

describe('webhooks/workers/webhook-queue.ts defaults integration', () => {
  it('should import WEBHOOK_QUEUE_DEFAULTS from shared/queue/defaults.ts', () => {
    expect(WEBHOOK_JOB_OPTIONS).toEqual(WEBHOOK_QUEUE_DEFAULTS.jobOptions);
  });

  it('should have webhook-specific attempts of 3', () => {
    expect(WEBHOOK_JOB_OPTIONS.attempts).toBe(3);
  });

  it('should have webhook-specific backoff type exponential', () => {
    expect(WEBHOOK_JOB_OPTIONS.backoff.type).toBe('exponential');
  });

  it('should have webhook-specific backoff delay of 1000', () => {
    expect(WEBHOOK_JOB_OPTIONS.backoff.delay).toBe(1000);
  });

  it('should have webhook-specific removeOnComplete count of 100', () => {
    expect(WEBHOOK_JOB_OPTIONS.removeOnComplete.count).toBe(100);
  });

  it('should have webhook-specific removeOnFail count of 500', () => {
    expect(WEBHOOK_JOB_OPTIONS.removeOnFail.count).toBe(500);
  });
});
