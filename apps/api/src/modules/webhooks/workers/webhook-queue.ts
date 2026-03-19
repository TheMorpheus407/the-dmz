export const WEBHOOK_QUEUE_NAMES = {
  WEBHOOK_DELIVERY: 'webhook-delivery',
} as const;

export const WEBHOOK_JOB_OPTIONS = {
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
} as const;

export interface WebhookDeliveryJobData {
  type: 'deliver-webhook';
  deliveryId: string;
  subscriptionId: string;
  tenantId: string;
  targetUrl: string;
  payload: Record<string, unknown>;
  eventId: string;
  eventType: string;
  attemptNumber: number;
  maxAttempts: number;
}

export interface WebhookDeliveryWorkerOptions {
  redisUrl: string;
}

export interface WebhookDeliveryProcessor {
  processDelivery: (opts: {
    deliveryId: string;
    subscriptionId: string;
    tenantId: string;
    targetUrl: string;
    payload: Record<string, unknown>;
    eventId: string;
    eventType: string;
    attemptNumber: number;
    maxAttempts: number;
  }) => Promise<{
    success: boolean;
    statusCode?: number;
    errorMessage?: string;
    latencyMs?: number;
  }>;
}

export interface WebhookDeliveryWorker {
  start: () => Promise<void>;
  close: () => Promise<void>;
}

export function createWebhookDeliveryWorker(
  _options: WebhookDeliveryWorkerOptions,
  _processor: WebhookDeliveryProcessor,
): WebhookDeliveryWorker {
  return {
    start: async () => {},
    close: async () => {},
  };
}
