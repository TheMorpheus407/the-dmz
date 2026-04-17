export const QUEUE_NAMES = {
  AI_GENERATION: 'ai-generation',
  AI_GENERATION_DLQ: 'ai-generation-dlq',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_TYPES = {
  GENERATE_EMAIL: 'generate-email',
  BATCH_GENERATE: 'batch-generate',
  REGENERATE_FAILED: 'regenerate-failed',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export interface GenerateEmailJobData {
  type: 'generate-email';
  difficulty: 1 | 2 | 3 | 4 | 5;
  faction?: string;
  attackType?: string;
  metadata?: Record<string, unknown>;
  tenantId: string;
  priority?: number;
}

export interface BatchGenerateJobData {
  type: 'batch-generate';
  difficulties: Array<1 | 2 | 3 | 4 | 5>;
  countPerDifficulty: number;
  faction?: string;
  attackTypes?: string[];
  tenantId: string;
}

export interface RegenerateFailedJobData {
  type: 'regenerate-failed';
  failedEmailIds: string[];
  difficulty?: 1 | 2 | 3 | 4 | 5;
  tenantId: string;
}

export type AiGenerationJobData =
  | GenerateEmailJobData
  | BatchGenerateJobData
  | RegenerateFailedJobData;

export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 604800,
    count: 5000,
  },
};

export const DEFAULT_CONCURRENCY = 5;

export { EXPONENTIAL_BACKOFF_DELAYS, RETRY_STRATEGY } from '../../../shared/queue/retry.js';

export const MAX_JOB_ATTEMPTS = 10;

export function createJobIdempotencyKey(jobType: JobType, data: AiGenerationJobData): string {
  const base = `${jobType}:${data.tenantId}`;

  switch (jobType) {
    case JOB_TYPES.GENERATE_EMAIL: {
      const typedData = data as GenerateEmailJobData;
      return `${base}:${typedData.difficulty}:${typedData.faction ?? 'none'}:${typedData.attackType ?? 'none'}`;
    }
    case JOB_TYPES.BATCH_GENERATE: {
      const typedData = data as BatchGenerateJobData;
      return `${base}:${typedData.difficulties.join(',')}:${typedData.countPerDifficulty}`;
    }
    case JOB_TYPES.REGENERATE_FAILED: {
      const typedData = data as RegenerateFailedJobData;
      return `${base}:${typedData.failedEmailIds.sort().join(',')}`;
    }
    default:
      return `${base}:${Date.now()}`;
  }
}

export { getQueueConfig } from '../../../shared/queue/retry.js';
