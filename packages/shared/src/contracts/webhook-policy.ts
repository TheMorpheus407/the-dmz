import { z } from 'zod';

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
});

export type CreateWebhookSubscriptionInput = z.infer<typeof createWebhookSubscriptionSchema>;

export const updateWebhookSubscriptionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  targetUrl: z.string().url().optional(),
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1).optional(),
  filters: z.record(z.unknown()).optional(),
  status: z.nativeEnum(WebhookSubscriptionStatus).optional(),
});

export type UpdateWebhookSubscriptionInput = z.infer<typeof updateWebhookSubscriptionSchema>;

export const webhookDeliverySchema = z.object({
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
  responseStatusCode: z.number().int().optional(),
  responseBody: z.string().optional(),
  errorMessage: z.string().optional(),
  latencyMs: z.number().int().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;

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
  'x-dmz-webhook-id': z.string().uuid(),
  'x-dmz-webhook-timestamp': z.string().datetime(),
  'x-dmz-webhook-signature': z.string().startsWith('v1='),
});

export type WebhookSignatureHeaders = z.infer<typeof webhookSignatureHeadersSchema>;

export const webhookTestResultSchema = z.object({
  success: z.boolean(),
  statusCode: z.number().int().optional(),
  latencyMs: z.number().int().optional(),
  errorMessage: z.string().optional(),
  signatureValid: z.boolean().optional(),
});

export type WebhookTestResult = z.infer<typeof webhookTestResultSchema>;

export const WEBHOOK_SIGNATURE_VERSION = 'v1';
export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;
export const WEBHOOK_DEFAULT_MAX_ATTEMPTS = 5;
export const WEBHOOK_RETRY_DELAYS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
  8 * 60 * 60 * 1000,
];

export const WEBHOOK_RATE_LIMITS = {
  CREATE: { limit: 20, windowMs: 60 * 1000 },
  LIST: { limit: 60, windowMs: 60 * 1000 },
  TEST: { limit: 10, windowMs: 60 * 1000 },
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
