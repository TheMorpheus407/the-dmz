import { Queue, type RepeatOptions } from 'bullmq';

import {
  QUEUE_NAMES,
  JOB_TYPES,
  type BatchGenerateJobData,
  type AiGenerationJobData,
  DEFAULT_JOB_OPTIONS,
} from './queues.js';

export interface SchedulerConfig {
  redisUrl: string;
  cronSchedule?: string;
  batchSize: number;
  minPerTier: number;
  targetPerTier: number;
}

export interface PoolHealthChecker {
  (
    tenantId: string,
  ): Promise<Array<{ difficulty: number; needsRefill: boolean; currentCount: number }>>;
}

export class AiGenerationScheduler {
  private queue: Queue<AiGenerationJobData>;
  private config: SchedulerConfig;
  private repeatJobName = '';

  constructor(config: SchedulerConfig) {
    this.config = config;
    this.queue = new Queue<AiGenerationJobData>(QUEUE_NAMES.AI_GENERATION, {
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
      connection: this.getConnectionFromUrl(config.redisUrl),
    });
  }

  private getConnectionFromUrl(redisUrl: string) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
    };
  }

  async scheduleBatchGeneration(
    tenantId: string,
    poolHealth: Array<{ difficulty: number; needsRefill: boolean }>,
  ): Promise<{
    scheduled: number;
    jobIds: string[];
  }> {
    const jobIds: string[] = [];
    const lowTiers = poolHealth
      .filter((h) => h.needsRefill)
      .map((h) => h.difficulty as 1 | 2 | 3 | 4 | 5);

    if (lowTiers.length === 0) {
      return { scheduled: 0, jobIds };
    }

    const jobData: BatchGenerateJobData = {
      type: JOB_TYPES.BATCH_GENERATE,
      tenantId,
      difficulties: lowTiers,
      countPerDifficulty: this.config.batchSize,
    };

    const job = await this.queue.add(JOB_TYPES.BATCH_GENERATE, jobData, {
      jobId: `batch-${tenantId}-${Date.now()}`,
      priority: 5,
    });

    jobIds.push(job.id ?? '');

    return { scheduled: 1, jobIds };
  }

  async scheduleRepeatableBatchGeneration(
    tenantId: string,
    cronExpression?: string,
  ): Promise<string> {
    const repeatOptions: RepeatOptions = {
      pattern: cronExpression ?? this.config.cronSchedule ?? '0 3 * * *',
      tz: 'UTC',
    };

    const jobData: BatchGenerateJobData = {
      type: JOB_TYPES.BATCH_GENERATE,
      tenantId,
      difficulties: [1, 2, 3, 4, 5],
      countPerDifficulty: this.config.batchSize,
    };

    const job = await this.queue.add(JOB_TYPES.BATCH_GENERATE, jobData, {
      jobId: `scheduled-batch-${tenantId}`,
      priority: 10,
      repeat: repeatOptions,
    });

    this.repeatJobName = job.id ?? '';
    return this.repeatJobName;
  }

  async cancelRepeatableJobs(tenantId: string): Promise<number> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    let cancelled = 0;

    for (const job of repeatableJobs) {
      if (job.key.includes(tenantId)) {
        await this.queue.removeRepeatableByKey(job.key);
        cancelled++;
      }
    }

    return cancelled;
  }

  async getNextScheduledRun(): Promise<Date | null> {
    const repeatableJobs = await this.queue.getRepeatableJobs();

    if (repeatableJobs.length === 0) {
      return null;
    }

    let nextRun: Date | null = null;

    for (const job of repeatableJobs) {
      const jobNextRun = (job as { nextRunTime?: Date }).nextRunTime;
      if (jobNextRun) {
        if (!nextRun || jobNextRun.getTime() < nextRun.getTime()) {
          nextRun = jobNextRun;
        }
      }
    }

    return nextRun;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }

  getQueue(): Queue<AiGenerationJobData> {
    return this.queue;
  }
}

export function createScheduler(config: SchedulerConfig): AiGenerationScheduler {
  return new AiGenerationScheduler(config);
}
