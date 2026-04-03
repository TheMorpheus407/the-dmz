import { Worker, Queue, type WorkerOptions, type Job } from 'bullmq';

import { sanitizeContext } from '@the-dmz/shared';

import { recordQueueDepth } from '../../../shared/metrics/hooks.js';

import {
  QUEUE_NAMES,
  JOB_TYPES,
  DEFAULT_JOB_OPTIONS,
  DEFAULT_CONCURRENCY,
  type AiGenerationJobData,
  type GenerateEmailJobData,
  type BatchGenerateJobData,
  type RegenerateFailedJobData,
} from './queues.js';
import { createGenerateEmailProcessor } from './processors/generate-email.processor.js';
import { createBatchGenerateProcessor } from './processors/batch-generate.processor.js';
import { createRegenerateFailedProcessor } from './processors/regenerate-failed.processor.js';

export interface WorkerDependencies {
  generateEmail: (options: {
    tenantId: string;
    difficulty: number;
    faction?: string;
    attackType?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{
    emailId: string;
    templateId: string;
    quality: number;
  }>;
  addToPool: (options: {
    tenantId: string;
    emailId: string;
    templateId: string;
    difficulty: number;
    quality: number;
    intent: 'legitimate' | 'malicious' | 'ambiguous';
    faction?: string;
    attackType?: string;
  }) => Promise<void>;
  getPoolHealth: (
    tenantId: string,
  ) => Promise<Map<number, { needsRefill: boolean; currentCount: number }>>;
}

export interface WorkerConfig {
  redisUrl: string;
  concurrency?: number;
  maxAttempts?: number;
}

export interface WorkerHealth {
  isRunning: boolean;
  isPaused: boolean;
  currentJobCount: number;
  completedCount: number;
  failedCount: number;
}

export class EmailGeneratorWorker {
  private worker: Worker<AiGenerationJobData>;
  private queue: Queue<AiGenerationJobData>;
  private dependencies: WorkerDependencies;
  private health: WorkerHealth;

  constructor(config: WorkerConfig, dependencies: WorkerDependencies) {
    this.dependencies = dependencies;
    this.health = {
      isRunning: false,
      isPaused: false,
      currentJobCount: 0,
      completedCount: 0,
      failedCount: 0,
    };

    const connection = this.getConnectionFromUrl(config.redisUrl);

    this.queue = new Queue<AiGenerationJobData>(QUEUE_NAMES.AI_GENERATION, {
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
      connection,
    });

    const workerOptions: WorkerOptions = {
      connection,
      concurrency: config.concurrency ?? DEFAULT_CONCURRENCY,
    };

    this.worker = new Worker<AiGenerationJobData>(
      QUEUE_NAMES.AI_GENERATION,
      async (job) => this.processJob(job),
      workerOptions,
    );

    this.worker.on('completed', () => {
      this.health.completedCount++;
      this.health.currentJobCount = Math.max(0, this.health.currentJobCount - 1);
      this.updateQueueDepth().catch(() => {});
    });

    this.worker.on('failed', (job, error) => {
      this.health.failedCount++;
      this.health.currentJobCount = Math.max(0, this.health.currentJobCount - 1);
      this.updateQueueDepth().catch(() => {});

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`Job failed: ${job?.name} (ID: ${job?.id})`, {
        message: errorMessage,
        stack: errorStack,
        queueName: job?.queueName,
        attemptsMade: job?.attemptsMade,
        tenantId: job?.data?.tenantId,
      });

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
              tenantId: job.data.tenantId,
            });
            sentry.captureException(error, { extra: context });
          } catch {
            // Sentry capture failed, continue without error tracking
          }
        };
        void captureError();
      }
    });

    this.worker.on('active', () => {
      this.health.currentJobCount++;
    });
  }

  private getConnectionFromUrl(redisUrl: string) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
    };
  }

  private async updateQueueDepth(): Promise<void> {
    try {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed');
      const waiting = counts['waiting'] ?? 0;
      const active = counts['active'] ?? 0;
      const delayed = counts['delayed'] ?? 0;
      const totalDepth = waiting + active + delayed;
      recordQueueDepth(QUEUE_NAMES.AI_GENERATION, totalDepth);
    } catch {
      // Queue might be closed
    }
  }

  private async processJob(job: Job<AiGenerationJobData>): Promise<unknown> {
    const { type } = job.data;

    switch (type) {
      case JOB_TYPES.GENERATE_EMAIL: {
        const processor = createGenerateEmailProcessor(
          this.dependencies.generateEmail,
          this.dependencies.addToPool,
        );
        return processor(job as Job<GenerateEmailJobData>);
      }
      case JOB_TYPES.BATCH_GENERATE: {
        const processor = createBatchGenerateProcessor(
          this.dependencies.generateEmail,
          this.dependencies.addToPool,
          async (tenantId: string) => {
            const health = await this.dependencies.getPoolHealth(tenantId);
            return health;
          },
        );
        return processor(job as Job<BatchGenerateJobData>);
      }
      case JOB_TYPES.REGENERATE_FAILED: {
        const processor = createRegenerateFailedProcessor(
          this.dependencies.generateEmail,
          this.dependencies.addToPool,
        );
        return processor(job as Job<RegenerateFailedJobData>);
      }
      default:
        throw new Error(`Unknown job type: ${type as string}`);
    }
  }

  async start(): Promise<void> {
    this.health.isRunning = true;
    this.health.isPaused = false;
    await this.worker.run();
  }

  async stop(): Promise<void> {
    this.health.isRunning = false;
    await this.worker.close();
  }

  async pause(): Promise<void> {
    this.health.isPaused = true;
    await this.worker.pause();
  }

  async resume(): Promise<void> {
    this.health.isPaused = false;
    this.worker.resume();
  }

  getHealth(): WorkerHealth {
    return { ...this.health };
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}

export function createEmailGeneratorWorker(
  config: WorkerConfig,
  dependencies: WorkerDependencies,
): EmailGeneratorWorker {
  return new EmailGeneratorWorker(config, dependencies);
}
