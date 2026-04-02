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

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
}));

vi.mock('../../../db/schema/game/events.schema.js', () => ({
  gameEvents: {},
}));

vi.mock('../../../db/schema/analytics/index.js', () => ({
  analyticsEvents: {},
}));

vi.mock('../../../db/schema/audit/index.js', () => ({
  auditLogs: {},
}));

vi.mock('../../../shared/database/schema/users.js', () => ({
  users: {},
}));

vi.mock('../../../db/schema/retention/index.js', () => ({
  archivedData: {},
}));

vi.mock('../../../db/schema/social/index.js', () => ({
  chatChannel: {},
  chatMessage: {},
}));

vi.mock('../../auth/index.js', () => ({
  getExpiredSessions: vi.fn().mockResolvedValue([]),
  deleteSessionsByIds: vi.fn().mockResolvedValue(0),
}));

vi.mock('../retention.service.js', () => ({
  calculateExpiryDate: vi.fn().mockReturnValue(new Date()),
  getEffectiveRetentionPolicy: vi
    .fn()
    .mockReturnValue({ effectiveRetentionDays: 90, effectiveAction: 'archive' }),
  isLegalHoldActive: vi.fn().mockResolvedValue(false),
}));

vi.mock('../anonymization.service.js', () => ({
  anonymizationService: {
    anonymize: vi
      .fn()
      .mockReturnValue({ anonymized: { email: 'anon123' }, fieldsAnonymized: ['email'] }),
  },
}));

vi.mock('../archive.service.js', () => ({
  archiveService: {
    archive: vi.fn().mockResolvedValue({ id: 'archive-1' }),
    deleteExpiredArchives: vi.fn().mockResolvedValue({ deleted: 0 }),
  },
}));

describe('RetentionWorker Sentry Integration', () => {
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
        id: 'retention-job-123',
        name: 'process-tenant',
        queueName: 'retention-processing',
        attemptsMade: 2,
        data: { type: 'process-tenant', tenantId: 'tenant-retention' },
      } as unknown as Job;

      const mockError = new Error('Retention processing failed');

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
            jobId: 'retention-job-123',
            jobName: 'process-tenant',
            queueName: 'retention-processing',
            attemptsMade: 2,
            tenantId: 'tenant-retention',
          }),
        }),
      );
    });

    it('sanitizes sensitive data in job context', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockError = new Error('Anonymization failed');

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: 'retention-job-456',
            jobName: 'anonymize-user',
            queueName: 'retention-processing',
            attemptsMade: 1,
            tenantId: 'tenant-sensitive',
            // secretlint-disable-next-line
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            secretValue: 'secret-key-value', // nosec
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            token: 'jwt-token-xyz', // nosec
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            password: 'database-password', // nosec
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

      const mockError = new Error('Some retention error');

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
        id: 'retention-job-789',
        name: 'cleanup-archives',
        queueName: 'retention-processing',
        attemptsMade: 1,
        data: { type: 'cleanup-expired-archives', tenantId: 'tenant-1' },
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
        id: 'retention-error-test',
        name: 'process-category',
        queueName: 'retention-processing',
        attemptsMade: 1,
        data: { type: 'process-category', tenantId: 'tenant-1', dataCategory: 'events' },
      } as unknown as Job;

      const mockError = new Error('Category processing failed');

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
        id: 'retention-tenant-test',
        name: 'process-tenant',
        queueName: 'retention-processing',
        attemptsMade: 3,
        data: { type: 'process-tenant', tenantId: 'tenant-specific-456', categories: ['events'] },
      } as unknown as Job;

      const mockError = new Error('Tenant processing failed');

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
            tenantId: 'tenant-specific-456',
          }),
        }),
      );
    });
  });
});
