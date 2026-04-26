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

import { RETENTION_QUEUE_DEFAULTS } from '../../../shared/queue/defaults.js';

export { RETENTION_QUEUE_DEFAULTS };

export const DEFAULT_JOB_OPTIONS = RETENTION_QUEUE_DEFAULTS.jobOptions;
export const DEFAULT_CONCURRENCY = RETENTION_QUEUE_DEFAULTS.concurrency;
export const MAX_JOB_ATTEMPTS = RETENTION_QUEUE_DEFAULTS.maxAttempts;
export const DEFAULT_BATCH_SIZE = 1000;

export {
  EXPONENTIAL_BACKOFF_DELAYS,
  RETRY_STRATEGY,
  getQueueConfig,
} from '../../../shared/queue/retry.js';
