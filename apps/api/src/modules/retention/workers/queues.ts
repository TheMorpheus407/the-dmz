export const RETENTION_QUEUE_NAMES = {
  RETENTION_PROCESSING: 'retention-processing',
  RETENTION_PROCESSING_DLQ: 'retention-processing-dlq',
} as const;

export type RetentionQueueName = (typeof RETENTION_QUEUE_NAMES)[keyof typeof RETENTION_QUEUE_NAMES];

export const RETENTION_JOB_TYPES = {
  PROCESS_TENANT: 'process-tenant',
  PROCESS_CATEGORY: 'process-category',
  CLEANUP_EXPIRED_ARCHIVES: 'cleanup-expired-archives',
  ANONYMIZE_USER: 'anonymize-user',
} as const;

export type RetentionJobType = (typeof RETENTION_JOB_TYPES)[keyof typeof RETENTION_JOB_TYPES];

export interface ProcessTenantJobData {
  type: 'process-tenant';
  tenantId: string;
  categories?: string[];
}

export interface ProcessCategoryJobData {
  type: 'process-category';
  tenantId: string;
  dataCategory: string;
  cursor?: string;
  batchSize?: number;
}

export interface CleanupExpiredArchivesJobData {
  type: 'cleanup-expired-archives';
  tenantId?: string;
}

export interface AnonymizeUserJobData {
  type: 'anonymize-user';
  tenantId: string;
  userId: string;
  retentionDays?: number;
}

export type RetentionJobData =
  | ProcessTenantJobData
  | ProcessCategoryJobData
  | CleanupExpiredArchivesJobData
  | AnonymizeUserJobData;

export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: {
    age: 3600,
    count: 500,
  },
  removeOnFail: {
    age: 604800,
    count: 1000,
  },
};

export const DEFAULT_CONCURRENCY = 3;
export const DEFAULT_BATCH_SIZE = 1000;

export const EXPONENTIAL_BACKOFF_DELAYS = [
  30 * 1000,
  2 * 60 * 1000,
  10 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
] as const;

export const MAX_JOB_ATTEMPTS = 5;

export const RETRY_STRATEGY = (attempt: number): number => {
  const index = Math.min(attempt - 1, EXPONENTIAL_BACKOFF_DELAYS.length - 1);
  return (
    EXPONENTIAL_BACKOFF_DELAYS[index] ??
    EXPONENTIAL_BACKOFF_DELAYS[EXPONENTIAL_BACKOFF_DELAYS.length - 1]!
  );
};

export function getQueueConfig(redisUrl: string) {
  return {
    connection: {
      host: new URL(redisUrl).hostname,
      port: parseInt(new URL(redisUrl).port, 10) || 6379,
    },
  };
}
