import { z } from 'zod';

import { STANDARD_RETRY_DELAYS_MS } from '../constants/retry.js';

export enum WebhookSubscriptionStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  TEST_PENDING = 'test_pending',
  FAILURE_DISABLED = 'failure_disabled',
}

export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  DLQ = 'dlq',
}

export const WEBHOOK_EVENT_TYPES = [
  'auth.user.created',
  'auth.user.updated',
  'auth.user.deleted',
  'auth.user.role_changed',
  'auth.session.started',
  'auth.session.ended',
  'auth.mfa.enabled',
  'auth.mfa.disabled',
  'auth.password.changed',
  'game.session.started',
  'game.session.ended',
  'game.score.updated',
  'enterprise.tenant.created',
  'enterprise.tenant.updated',
  'campaign.started',
  'campaign.completed',
  'campaign.paused',
  'training.completed',
  'training.started',
  'training.failed',
  'session.created',
  'session.updated',
  'session.deleted',
  'competency.updated',
  'competency.domain_updated',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const webhookSubscriptionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  targetUrl: z.string().url(),
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1),
  status: z.nativeEnum(WebhookSubscriptionStatus),
  secretHash: z.string().min(1),
  filters: z.record(z.unknown()).optional(),
  ipAllowlist: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  disabledAt: z.date().optional(),
  testPendingAt: z.date().optional(),
  failureDisabledAt: z.date().optional(),
});

export type WebhookSubscription = z.infer<typeof webhookSubscriptionSchema>;

export const createWebhookSubscriptionSchema = z.object({
  name: z.string().min(1).max(255),
  targetUrl: z.string().url(),
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1),
  filters: z.record(z.unknown()).optional(),
  ipAllowlist: z.array(z.string()).optional(),
});

export type CreateWebhookSubscriptionInput = z.infer<typeof createWebhookSubscriptionSchema>;

export const updateWebhookSubscriptionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  targetUrl: z.string().url().optional(),
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1).optional(),
  filters: z.record(z.unknown()).optional(),
  status: z.nativeEnum(WebhookSubscriptionStatus).optional(),
  ipAllowlist: z.array(z.string()).optional(),
});

export type UpdateWebhookSubscriptionInput = z.infer<typeof updateWebhookSubscriptionSchema>;

export const webhookDeliveryBaseSchema = z.object({
  id: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  eventId: z.string().uuid(),
  eventType: z.enum(WEBHOOK_EVENT_TYPES),
  tenantId: z.string().uuid(),
  targetUrl: z.string().url(),
  status: z.nativeEnum(WebhookDeliveryStatus),
  attemptNumber: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  nextAttemptAt: z.date().optional(),
  lastAttemptAt: z.date().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WebhookDeliveryBase = z.infer<typeof webhookDeliveryBaseSchema>;

export const httpWebhookDeliverySchema = webhookDeliveryBaseSchema.extend({
  responseStatusCode: z.number().int().optional(),
  responseBody: z.string().optional(),
  latencyMs: z.number().int().optional(),
});

export type HttpWebhookDelivery = z.infer<typeof httpWebhookDeliverySchema>;

export const webhookDeliverySchema: z.ZodType<HttpWebhookDelivery> = httpWebhookDeliverySchema;

export type WebhookDelivery = HttpWebhookDelivery;

export const webhookEventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(WEBHOOK_EVENT_TYPES),
  occurredAt: z.string().datetime(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
});

export type WebhookEventEnvelope = z.infer<typeof webhookEventEnvelopeSchema>;

export const webhookSignatureHeadersSchema = z.object({
  'X-Webhook-Id': z.string().uuid(),
  'X-Webhook-Timestamp': z.string().datetime(),
  'X-Webhook-Signature': z.string().startsWith('v1='),
  'X-Tenant-ID': z.string().uuid(),
});

export type WebhookSignatureHeaders = z.infer<typeof webhookSignatureHeadersSchema>;

export const webhookTestResultBaseSchema = z.object({
  success: z.boolean(),
  errorMessage: z.string().optional(),
  signatureValid: z.boolean().optional(),
});

export type WebhookTestResultBase = z.infer<typeof webhookTestResultBaseSchema>;

export const httpWebhookTestResultSchema = webhookTestResultBaseSchema.extend({
  statusCode: z.number().int().optional(),
  latencyMs: z.number().int().optional(),
});

export type HttpWebhookTestResult = z.infer<typeof httpWebhookTestResultSchema>;

export const webhookTestResultSchema: z.ZodType<HttpWebhookTestResult> =
  httpWebhookTestResultSchema;

export type WebhookTestResult = HttpWebhookTestResult;

export const webhookSecretRotationSchema = z.object({
  previousSecretHash: z.string().min(1),
  newSecret: z.string().min(1),
});

export type WebhookSecretRotation = z.infer<typeof webhookSecretRotationSchema>;

export const webhookRotateSecretResultSchema = z.object({
  secret: z.string().min(1),
  rotatedAt: z.string().datetime(),
});

export type WebhookRotateSecretResult = z.infer<typeof webhookRotateSecretResultSchema>;

export const WEBHOOK_SIGNATURE_VERSION = 'v1';
export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;
export const WEBHOOK_DEFAULT_MAX_ATTEMPTS = 5;
export const WEBHOOK_DELIVERY_TIMEOUT_MS = 30 * 1000;
export const WEBHOOK_RETRY_DELAYS_MS = STANDARD_RETRY_DELAYS_MS;

export const WEBHOOK_RATE_LIMITS = {
  CREATE: { limit: 20, windowMs: 60 * 1000 },
  LIST: { limit: 60, windowMs: 60 * 1000 },
  GET: { limit: 60, windowMs: 60 * 1000 },
  UPDATE: { limit: 30, windowMs: 60 * 1000 },
  DELETE: { limit: 30, windowMs: 60 * 1000 },
  TEST: { limit: 10, windowMs: 60 * 1000 },
  ROTATE_SECRET: { limit: 10, windowMs: 60 * 1000 },
  DELIVERY_LIST: { limit: 60, windowMs: 60 * 1000 },
  DELIVERY_GET: { limit: 60, windowMs: 60 * 1000 },
} as const;

export const WEBHOOK_CIRCUIT_BREAKER = {
  FAILURE_THRESHOLD: 0.95,
  FAILURE_WINDOW_MS: 24 * 60 * 60 * 1000,
  MIN_REQUESTS: 20,
} as const;

export const WEBHOOK_DELIVERY_LOG_RETENTION_DAYS = 90;

export const isValidWebhookEventType = (eventType: string): eventType is WebhookEventType => {
  return WEBHOOK_EVENT_TYPES.includes(eventType as WebhookEventType);
};

export const isRetryableStatus = (status: WebhookDeliveryStatus): boolean => {
  return status === WebhookDeliveryStatus.PENDING || status === WebhookDeliveryStatus.FAILED;
};

export const isTerminalStatus = (status: WebhookDeliveryStatus): boolean => {
  return status === WebhookDeliveryStatus.SUCCESS || status === WebhookDeliveryStatus.DLQ;
};

export const getRetryDelayMs = (attemptNumber: number): number => {
  const index = Math.min(attemptNumber - 1, WEBHOOK_RETRY_DELAYS_MS.length - 1);
  const delay = WEBHOOK_RETRY_DELAYS_MS[index];
  return delay !== undefined ? delay : WEBHOOK_RETRY_DELAYS_MS[WEBHOOK_RETRY_DELAYS_MS.length - 1]!;
};

export const isValidHttpsUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
