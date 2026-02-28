import type { FastifyInstance } from 'fastify';
import type { WebhookService } from './webhook.service.js';
import type { WebhookRepo } from './webhook.repo.js';

export interface WebhookPluginOptions {
  prefix?: string;
}

export interface ListWebhookSubscriptionsParams {
  tenantId: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface GetWebhookSubscriptionParams {
  tenantId: string;
  subscriptionId: string;
}

export interface CreateWebhookSubscriptionParams {
  tenantId: string;
  name: string;
  targetUrl: string;
  eventTypes: string[];
  filters?: Record<string, unknown>;
}

export interface UpdateWebhookSubscriptionParams {
  tenantId: string;
  subscriptionId: string;
  name?: string;
  targetUrl?: string;
  eventTypes?: string[];
  filters?: Record<string, unknown>;
  status?: string;
}

export interface DeleteWebhookSubscriptionParams {
  tenantId: string;
  subscriptionId: string;
}

export interface TestWebhookSubscriptionParams {
  tenantId: string;
  subscriptionId: string;
}

export interface WebhookDeliveryJobData {
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

export interface WebhookModule {
  plugin: (instance: FastifyInstance, opts: WebhookPluginOptions) => Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    webhooks: {
      service: WebhookService;
      repo: WebhookRepo;
    };
  }
}
