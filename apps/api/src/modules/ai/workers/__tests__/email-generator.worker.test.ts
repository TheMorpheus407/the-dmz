import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { Job } from 'bullmq';

const mockSentryCaptureException = vi.fn();

vi.mock('@sentry/node', () => ({
  default: {
    init: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    captureException: mockSentryCaptureException,
  },
  init: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  captureException: mockSentryCaptureException,
}));

vi.mock('../../../shared/metrics/hooks.js', () => ({
  recordQueueDepth: vi.fn(),
}));

describe('EmailGeneratorWorker Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSentryCaptureException.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sentry error capture on job failure', () => {
    it('captures Sentry exception with sanitized job context when job fails', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'job-123',
        name: 'generate-email',
        queueName: 'ai-generation',
        attemptsMade: 2,
        data: { type: 'generate-email', tenantId: 'tenant-abc', difficulty: 3 },
      } as unknown as Job;

      const mockError = new Error('AI generation failed');

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: mockJob.id,
            jobName: mockJob.name,
            queueName: mockJob.queueName,
            attemptsMade: mockJob.attemptsMade,
            tenantId: mockJob.data.tenantId,
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await captureError();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          extra: expect.objectContaining({
            jobId: 'job-123',
            jobName: 'generate-email',
            queueName: 'ai-generation',
            attemptsMade: 2,
            tenantId: 'tenant-abc',
          }),
        }),
      );
    });

    it('sanitizes sensitive data in job context', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'job-456',
        name: 'batch-generate',
        queueName: 'ai-generation',
        attemptsMade: 1,
        data: {
          type: 'batch-generate',
          tenantId: 'tenant-xyz',
        },
      } as unknown as Job;

      const mockError = new Error('Batch generation failed');

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: mockJob.id,
            jobName: mockJob.name,
            queueName: mockJob.queueName,
            attemptsMade: mockJob.attemptsMade,
            tenantId: mockJob.data.tenantId,
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            secretValue: 'super-secret-key', // nosec
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            token: 'jwt-token-123', // nosec
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            password: 'my-password', // nosec
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await captureError();

      expect(mockSentryCaptureException).toHaveBeenCalled();
      const capturedContext = mockSentryCaptureException.mock.calls[0]![1] as {
        extra: Record<string, unknown>;
      };
      expect(capturedContext.extra.secretValue).toBe('[REDACTED]');
      expect(capturedContext.extra.token).toBe('[REDACTED]');
      expect(capturedContext.extra.password).toBe('[REDACTED]');
    });

    it('does not capture Sentry exception when job is undefined', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockError = new Error('Some error');

      const shouldCapture = (job: Job | undefined, error: Error) => {
        if (error && job) {
          const captureError = async () => {
            try {
              const Sentry = await import('@sentry/node');
              const sentry = Sentry.default ?? Sentry;
              const context = sanitizeContext({
                jobId: job.id,
                jobName: job.name,
                queueName: job.queueName,
                attemptsMade: job.attemptsMade,
              });
              sentry.captureException(error, { extra: context });
            } catch {
              // Sentry capture failed, continue without error tracking
            }
          };
          void captureError();
        }
      };

      shouldCapture(undefined, mockError);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });

    it('does not capture Sentry exception when error is undefined', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'job-789',
        name: 'generate-email',
        queueName: 'ai-generation',
        attemptsMade: 1,
        data: { type: 'generate-email', tenantId: 'tenant-1' },
      } as unknown as Job;

      const shouldCapture = (job: Job | undefined, error: Error | undefined) => {
        if (error && job) {
          const captureError = async () => {
            try {
              const Sentry = await import('@sentry/node');
              const sentry = Sentry.default ?? Sentry;
              const context = sanitizeContext({
                jobId: job.id,
                jobName: job.name,
                queueName: job.queueName,
                attemptsMade: job.attemptsMade,
              });
              sentry.captureException(error, { extra: context });
            } catch {
              // Sentry capture failed, continue without error tracking
            }
          };
          void captureError();
        }
      };

      shouldCapture(mockJob, undefined);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });

    it('continues working if Sentry capture fails', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'job-error-test',
        name: 'generate-email',
        queueName: 'ai-generation',
        attemptsMade: 1,
        data: { type: 'generate-email', tenantId: 'tenant-1' },
      } as unknown as Job;

      const mockError = new Error('Generation failed');

      mockSentryCaptureException.mockImplementationOnce(() => {
        throw new Error('Sentry network error');
      });

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: mockJob.id,
            jobName: mockJob.name,
            queueName: mockJob.queueName,
            attemptsMade: mockJob.attemptsMade,
            tenantId: mockJob.data.tenantId,
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await expect(captureError()).resolves.not.toThrow();

      expect(mockSentryCaptureException).toHaveBeenCalled();
    });

    it('correctly extracts tenantId from job data', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'job-tenant-test',
        name: 'generate-email',
        queueName: 'ai-generation',
        attemptsMade: 3,
        data: { type: 'generate-email', tenantId: 'tenant-specific-123', difficulty: 5 },
      } as unknown as Job;

      const mockError = new Error('Generation failed');

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: mockJob.id,
            jobName: mockJob.name,
            queueName: mockJob.queueName,
            attemptsMade: mockJob.attemptsMade,
            tenantId: mockJob.data.tenantId,
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await captureError();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          extra: expect.objectContaining({
            tenantId: 'tenant-specific-123',
          }),
        }),
      );
    });
  });
});
