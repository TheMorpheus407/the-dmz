import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JOB_TYPES } from '../queues.js';
import { AiGenerationScheduler, type SchedulerConfig } from '../scheduler.js';

vi.mock('bullmq');

const mockQueueAdd = vi.fn();
const mockGetRepeatableJobs = vi.fn();
const mockRemoveRepeatableByKey = vi.fn();
const mockQueueClose = vi.fn();

vi.mock('bullmq', () => ({
  Queue: vi.fn(function MockQueue() {
    return {
      add: mockQueueAdd,
      getRepeatableJobs: mockGetRepeatableJobs,
      removeRepeatableByKey: mockRemoveRepeatableByKey,
      close: mockQueueClose,
    };
  }),
}));

describe('AiGenerationScheduler', () => {
  const createConfig = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
    redisUrl: 'redis://localhost:6379',
    batchSize: 10,
    minPerTier: 20,
    targetPerTier: 50,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd.mockResolvedValue({ id: 'mock-job-id' });
    mockGetRepeatableJobs.mockResolvedValue([]);
    mockRemoveRepeatableByKey.mockResolvedValue(true);
    mockQueueClose.mockResolvedValue(undefined);
  });

  describe('scheduleBatchGeneration', () => {
    it('should return scheduled=0 and empty jobIds when no tiers need refill', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      const poolHealth = [
        { difficulty: 1, needsRefill: false, currentCount: 50 },
        { difficulty: 2, needsRefill: false, currentCount: 50 },
      ];

      const result = await scheduler.scheduleBatchGeneration('tenant-abc', poolHealth);

      expect(result).toEqual({ scheduled: 0, jobIds: [] });
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('should schedule batch job when tiers need refill', async () => {
      const scheduler = new AiGenerationScheduler(createConfig({ batchSize: 15 }));
      const poolHealth = [
        { difficulty: 1, needsRefill: true, currentCount: 5 },
        { difficulty: 3, needsRefill: true, currentCount: 10 },
      ];

      const result = await scheduler.scheduleBatchGeneration('tenant-abc', poolHealth);

      expect(result.scheduled).toBe(1);
      expect(result.jobIds).toHaveLength(1);
      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('should pass correct job data to queue.add', async () => {
      const scheduler = new AiGenerationScheduler(createConfig({ batchSize: 20 }));
      const poolHealth = [
        { difficulty: 2, needsRefill: true, currentCount: 10 },
        { difficulty: 4, needsRefill: true, currentCount: 5 },
      ];

      await scheduler.scheduleBatchGeneration('tenant-xyz', poolHealth);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        JOB_TYPES.BATCH_GENERATE,
        expect.objectContaining({
          type: JOB_TYPES.BATCH_GENERATE,
          tenantId: 'tenant-xyz',
          difficulties: [2, 4],
          countPerDifficulty: 20,
        }),
        expect.objectContaining({
          priority: 5,
        }),
      );
    });

    it('should include only difficulties that need refill', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      const poolHealth = [
        { difficulty: 1, needsRefill: false, currentCount: 50 },
        { difficulty: 2, needsRefill: true, currentCount: 5 },
        { difficulty: 3, needsRefill: false, currentCount: 30 },
        { difficulty: 4, needsRefill: true, currentCount: 3 },
        { difficulty: 5, needsRefill: true, currentCount: 10 },
      ];

      await scheduler.scheduleBatchGeneration('tenant-test', poolHealth);

      const call = mockQueueAdd.mock.calls[0];
      const jobData = call[1] as { difficulties: number[] };
      expect(jobData.difficulties).toEqual([2, 4, 5]);
    });

    it('should use priority 5 for batch jobs', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      const poolHealth = [{ difficulty: 1, needsRefill: true, currentCount: 5 }];

      await scheduler.scheduleBatchGeneration('tenant-priority', poolHealth);

      const call = mockQueueAdd.mock.calls[0];
      const options = call[2] as { priority: number };
      expect(options.priority).toBe(5);
    });

    it('should generate unique job IDs with timestamp', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      const poolHealth = [{ difficulty: 1, needsRefill: true, currentCount: 5 }];

      await scheduler.scheduleBatchGeneration('tenant-123', poolHealth);

      const call = mockQueueAdd.mock.calls[0];
      const options = call[2] as { jobId: string };
      expect(options.jobId).toMatch(/^batch-tenant-123-\d+$/);
    });
  });

  describe('scheduleRepeatableBatchGeneration', () => {
    it('should create repeatable job with custom cron expression', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockQueueAdd.mockResolvedValue({ id: 'repeatable-job-123' });

      const result = await scheduler.scheduleRepeatableBatchGeneration('tenant-abc', '0 */6 * * *');

      expect(result).toBe('repeatable-job-123');
      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('should use config cronSchedule when no expression provided', async () => {
      const scheduler = new AiGenerationScheduler(createConfig({ cronSchedule: '0 3 * * *' }));
      mockQueueAdd.mockResolvedValue({ id: 'repeatable-job-456' });

      await scheduler.scheduleRepeatableBatchGeneration('tenant-xyz');

      expect(mockQueueAdd).toHaveBeenCalledWith(
        JOB_TYPES.BATCH_GENERATE,
        expect.any(Object),
        expect.objectContaining({
          repeat: expect.objectContaining({
            pattern: '0 3 * * *',
            tz: 'UTC',
          }),
        }),
      );
    });

    it('should use default cron when neither expression nor config provided', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockQueueAdd.mockResolvedValue({ id: 'repeatable-job-789' });

      await scheduler.scheduleRepeatableBatchGeneration('tenant-default');

      expect(mockQueueAdd).toHaveBeenCalledWith(
        JOB_TYPES.BATCH_GENERATE,
        expect.any(Object),
        expect.objectContaining({
          repeat: expect.objectContaining({
            pattern: '0 3 * * *',
          }),
        }),
      );
    });

    it('should use priority 10 for repeatable jobs', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockQueueAdd.mockResolvedValue({ id: 'repeatable-job-prio' });

      await scheduler.scheduleRepeatableBatchGeneration('tenant-prio');

      const call = mockQueueAdd.mock.calls[0];
      const options = call[2] as { priority: number };
      expect(options.priority).toBe(10);
    });

    it('should use jobId format scheduled-batch-{tenantId}', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockQueueAdd.mockResolvedValue({ id: 'scheduled-batch-tenant-jobid' });

      await scheduler.scheduleRepeatableBatchGeneration('tenant-jobid');

      const call = mockQueueAdd.mock.calls[0];
      const options = call[2] as { jobId: string };
      expect(options.jobId).toBe('scheduled-batch-tenant-jobid');
    });

    it('should pass difficulties 1-5 for batch generation', async () => {
      const scheduler = new AiGenerationScheduler(createConfig({ batchSize: 25 }));
      mockQueueAdd.mockResolvedValue({ id: 'repeatable-job-diff' });

      await scheduler.scheduleRepeatableBatchGeneration('tenant-diff');

      const call = mockQueueAdd.mock.calls[0];
      const jobData = call[1] as { difficulties: number[]; countPerDifficulty: number };
      expect(jobData.difficulties).toEqual([1, 2, 3, 4, 5]);
      expect(jobData.countPerDifficulty).toBe(25);
    });

    it('should pass correct tenantId in job data', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockQueueAdd.mockResolvedValue({ id: 'repeatable-job-tid' });

      await scheduler.scheduleRepeatableBatchGeneration('tenant-specific-id');

      const call = mockQueueAdd.mock.calls[0];
      const jobData = call[1] as { tenantId: string };
      expect(jobData.tenantId).toBe('tenant-specific-id');
    });
  });

  describe('cancelRepeatableJobs', () => {
    it('should return 0 when no repeatable jobs exist', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockGetRepeatableJobs.mockResolvedValue([]);

      const result = await scheduler.cancelRepeatableJobs('tenant-abc');

      expect(result).toBe(0);
      expect(mockRemoveRepeatableByKey).not.toHaveBeenCalled();
    });

    it('should cancel jobs with matching tenantId prefix', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockGetRepeatableJobs.mockResolvedValue([
        { key: 'repeat:scheduled-batch-tenant-abc:1691540400000', name: JOB_TYPES.BATCH_GENERATE },
        {
          key: 'repeat:scheduled-batch-other-tenant:1691540400000',
          name: JOB_TYPES.BATCH_GENERATE,
        },
      ]);

      const result = await scheduler.cancelRepeatableJobs('tenant-abc');

      expect(result).toBe(1);
      expect(mockRemoveRepeatableByKey).toHaveBeenCalledTimes(1);
      expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith(
        'repeat:scheduled-batch-tenant-abc:1691540400000',
      );
    });

    it('should not cancel jobs with different tenantId', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockGetRepeatableJobs.mockResolvedValue([
        {
          key: 'repeat:scheduled-batch-other-tenant:1691540400000',
          name: JOB_TYPES.BATCH_GENERATE,
        },
        {
          key: 'repeat:scheduled-batch-another-tenant:1691540400000',
          name: JOB_TYPES.BATCH_GENERATE,
        },
      ]);

      const result = await scheduler.cancelRepeatableJobs('tenant-abc');

      expect(result).toBe(0);
      expect(mockRemoveRepeatableByKey).not.toHaveBeenCalled();
    });

    it('should cancel multiple jobs for same tenant', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockGetRepeatableJobs.mockResolvedValue([
        {
          key: 'repeat:scheduled-batch-tenant-multi:1691540400000',
          name: JOB_TYPES.BATCH_GENERATE,
        },
        {
          key: 'repeat:scheduled-batch-tenant-multi:1691540500000',
          name: JOB_TYPES.BATCH_GENERATE,
        },
        {
          key: 'repeat:scheduled-batch-tenant-multi:1691540600000',
          name: JOB_TYPES.BATCH_GENERATE,
        },
      ]);

      const result = await scheduler.cancelRepeatableJobs('tenant-multi');

      expect(result).toBe(3);
      expect(mockRemoveRepeatableByKey).toHaveBeenCalledTimes(3);
    });

    it('should not incorrectly match partial tenantId matches', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockGetRepeatableJobs.mockResolvedValue([
        { key: 'repeat:scheduled-batch-tenant-abc:1691540400000', name: JOB_TYPES.BATCH_GENERATE },
        {
          key: 'repeat:scheduled-batch-tenant-abc-2:1691540400000',
          name: JOB_TYPES.BATCH_GENERATE,
        },
      ]);

      const result = await scheduler.cancelRepeatableJobs('tenant-abc');

      expect(result).toBe(1);
      expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith(
        'repeat:scheduled-batch-tenant-abc:1691540400000',
      );
    });
  });

  describe('getNextScheduledRun', () => {
    it('should return null when no repeatable jobs exist', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockGetRepeatableJobs.mockResolvedValue([]);

      const result = await scheduler.getNextScheduledRun();

      expect(result).toBeNull();
    });

    it('should return null when jobs have no nextRunTime', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      mockGetRepeatableJobs.mockResolvedValue([
        {
          key: 'repeat:scheduled-batch-tenant:123',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: undefined,
        },
      ]);

      const result = await scheduler.getNextScheduledRun();

      expect(result).toBeNull();
    });

    it('should return the next run time when single job exists', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      const nextRun = new Date('2026-04-21T03:00:00.000Z');
      mockGetRepeatableJobs.mockResolvedValue([
        {
          key: 'repeat:scheduled-batch-tenant:123',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: nextRun,
        },
      ]);

      const result = await scheduler.getNextScheduledRun();

      expect(result).toEqual(nextRun);
    });

    it('should return earliest nextRunTime when multiple jobs exist', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      const earliest = new Date('2026-04-21T03:00:00.000Z');
      const later = new Date('2026-04-21T09:00:00.000Z');
      mockGetRepeatableJobs.mockResolvedValue([
        {
          key: 'repeat:scheduled-batch-tenant-a:123',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: later,
        },
        {
          key: 'repeat:scheduled-batch-tenant-b:456',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: earliest,
        },
        {
          key: 'repeat:scheduled-batch-tenant-c:789',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: new Date('2026-04-21T06:00:00.000Z'),
        },
      ]);

      const result = await scheduler.getNextScheduledRun();

      expect(result).toEqual(earliest);
    });

    it('should ignore jobs without nextRunTime when finding earliest', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());
      const nextRun = new Date('2026-04-21T03:00:00.000Z');
      mockGetRepeatableJobs.mockResolvedValue([
        {
          key: 'repeat:scheduled-batch-tenant-a:123',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: undefined,
        },
        {
          key: 'repeat:scheduled-batch-tenant-b:456',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: null,
        },
        {
          key: 'repeat:scheduled-batch-tenant-c:789',
          name: JOB_TYPES.BATCH_GENERATE,
          nextRunTime: nextRun,
        },
      ]);

      const result = await scheduler.getNextScheduledRun();

      expect(result).toEqual(nextRun);
    });
  });

  describe('close', () => {
    it('should call queue.close', async () => {
      const scheduler = new AiGenerationScheduler(createConfig());

      await scheduler.close();

      expect(mockQueueClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQueue', () => {
    it('should return the queue instance', () => {
      const scheduler = new AiGenerationScheduler(createConfig());

      const queue = scheduler.getQueue();

      expect(queue).toBeDefined();
    });
  });

  describe('SchedulerConfig validation', () => {
    it('should accept valid config with all required fields', () => {
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

    it('should accept config with optional cronSchedule', () => {
      const config: SchedulerConfig = {
        redisUrl: 'redis://localhost:6379',
        cronSchedule: '0 3 * * *',
        batchSize: 10,
        minPerTier: 20,
        targetPerTier: 50,
      };

      expect(config.cronSchedule).toBe('0 3 * * *');
    });

    it('should accept config with custom batch size', () => {
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
});
