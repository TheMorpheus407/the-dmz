export const WEBHOOK_QUEUE_NAMES = {
  WEBHOOK_DELIVERY: 'webhook-delivery',
} as const;

import { WEBHOOK_QUEUE_DEFAULTS } from '../../../shared/queue/defaults.js';

export { WEBHOOK_QUEUE_DEFAULTS };

export const WEBHOOK_JOB_OPTIONS = WEBHOOK_QUEUE_DEFAULTS.jobOptions;

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
