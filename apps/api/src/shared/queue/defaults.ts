const DEFAULT_JOB_OPTIONS_BASE = {
  removeOnComplete: {
    age: 3600 as const,
    count: 1000 as const,
  },
  removeOnFail: {
    age: 604800 as const,
    count: 1000 as const,
  },
} as const;

export const DEFAULT_JOB_OPTIONS = DEFAULT_JOB_OPTIONS_BASE;

export const DEFAULT_CONCURRENCY = 5 as const;

export const DEFAULT_MAX_JOB_ATTEMPTS = 5 as const;

export const AI_QUEUE_DEFAULTS = {
  jobOptions: {
    removeOnComplete: {
      age: 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 604800,
      count: 5000,
    },
  },
  concurrency: 5,
  maxAttempts: 10,
} as const;

export const RETENTION_QUEUE_DEFAULTS = {
  jobOptions: {
    removeOnComplete: {
      age: 3600,
      count: 500,
    },
    removeOnFail: {
      age: 604800,
      count: 1000,
    },
  },
  concurrency: 3,
  maxAttempts: 5,
} as const;

export const WEBHOOK_QUEUE_DEFAULTS = {
  jobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
} as const;
