export const WEBHOOK_ERROR_CODES = {
  SUBSCRIPTION_NOT_FOUND: 'WEBHOOK_SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_INVALID_STATUS: 'WEBHOOK_SUBSCRIPTION_INVALID_STATUS',
  SUBSCRIPTION_URL_INVALID: 'WEBHOOK_SUBSCRIPTION_URL_INVALID',
  SUBSCRIPTION_EVENT_TYPES_INVALID: 'WEBHOOK_SUBSCRIPTION_EVENT_TYPES_INVALID',
  SUBSCRIPTION_CIRCUIT_BREAKER_OPEN: 'WEBHOOK_SUBSCRIPTION_CIRCUIT_BREAKER_OPEN',
  DELIVERY_NOT_FOUND: 'WEBHOOK_DELIVERY_NOT_FOUND',
  DELIVERY_FAILED: 'WEBHOOK_DELIVERY_FAILED',
  DELIVERY_MAX_RETRIES_EXCEEDED: 'WEBHOOK_DELIVERY_MAX_RETRIES_EXCEEDED',
  DELIVERY_DLQ: 'WEBHOOK_DELIVERY_DLQ',
  SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  SIGNATURE_EXPIRED: 'WEBHOOK_SIGNATURE_EXPIRED',
  RATE_LIMIT_EXCEEDED: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'WEBHOOK_UNAUTHORIZED',
  INSUFFICIENT_SCOPE: 'WEBHOOK_INSUFFICIENT_SCOPE',
} as const;

export type WebhookErrorCode = (typeof WEBHOOK_ERROR_CODES)[keyof typeof WEBHOOK_ERROR_CODES];

export class WebhookSubscriptionNotFoundError extends Error {
  code = WEBHOOK_ERROR_CODES.SUBSCRIPTION_NOT_FOUND;
  statusCode = 404;

  constructor(subscriptionId: string) {
    super(`Webhook subscription not found: ${subscriptionId}`);
    this.name = 'WebhookSubscriptionNotFoundError';
  }
}

export class WebhookSubscriptionInvalidStatusError extends Error {
  code = WEBHOOK_ERROR_CODES.SUBSCRIPTION_INVALID_STATUS;
  statusCode = 400;

  constructor(status: string) {
    super(`Invalid webhook subscription status: ${status}`);
    this.name = 'WebhookSubscriptionInvalidStatusError';
  }
}

export class WebhookSubscriptionUrlInvalidError extends Error {
  code = WEBHOOK_ERROR_CODES.SUBSCRIPTION_URL_INVALID;
  statusCode = 400;

  constructor(url: string) {
    super(`Invalid webhook URL: ${url}`);
    this.name = 'WebhookSubscriptionUrlInvalidError';
  }
}

export class WebhookSubscriptionEventTypesInvalidError extends Error {
  code = WEBHOOK_ERROR_CODES.SUBSCRIPTION_EVENT_TYPES_INVALID;
  statusCode = 400;

  constructor(types: string[]) {
    super(`Invalid webhook event types: ${types.join(', ')}`);
    this.name = 'WebhookSubscriptionEventTypesInvalidError';
  }
}

export class WebhookCircuitBreakerOpenError extends Error {
  code = WEBHOOK_ERROR_CODES.SUBSCRIPTION_CIRCUIT_BREAKER_OPEN;
  statusCode = 503;

  constructor(subscriptionId: string) {
    super(`Circuit breaker is open for subscription: ${subscriptionId}`);
    this.name = 'WebhookCircuitBreakerOpenError';
  }
}

export class WebhookDeliveryNotFoundError extends Error {
  code = WEBHOOK_ERROR_CODES.DELIVERY_NOT_FOUND;
  statusCode = 404;

  constructor(deliveryId: string) {
    super(`Webhook delivery not found: ${deliveryId}`);
    this.name = 'WebhookDeliveryNotFoundError';
  }
}

export class WebhookDeliveryFailedError extends Error {
  code = WEBHOOK_ERROR_CODES.DELIVERY_FAILED;
  statusCode = 502;

  constructor(deliveryId: string, message: string) {
    super(`Webhook delivery failed: ${deliveryId} - ${message}`);
    this.name = 'WebhookDeliveryFailedError';
  }
}

export class WebhookDeliveryMaxRetriesExceededError extends Error {
  code = WEBHOOK_ERROR_CODES.DELIVERY_MAX_RETRIES_EXCEEDED;
  statusCode = 502;

  constructor(deliveryId: string) {
    super(`Webhook delivery max retries exceeded: ${deliveryId}`);
    this.name = 'WebhookDeliveryMaxRetriesExceededError';
  }
}

export class WebhookDeliveryDlqError extends Error {
  code = WEBHOOK_ERROR_CODES.DELIVERY_DLQ;
  statusCode = 502;

  constructor(deliveryId: string) {
    super(`Webhook delivery sent to DLQ: ${deliveryId}`);
    this.name = 'WebhookDeliveryDlqError';
  }
}

export class WebhookSignatureInvalidError extends Error {
  code = WEBHOOK_ERROR_CODES.SIGNATURE_INVALID;
  statusCode = 401;

  constructor() {
    super('Invalid webhook signature');
    this.name = 'WebhookSignatureInvalidError';
  }
}

export class WebhookSignatureExpiredError extends Error {
  code = WEBHOOK_ERROR_CODES.SIGNATURE_EXPIRED;
  statusCode = 401;

  constructor() {
    super('Webhook signature expired');
    this.name = 'WebhookSignatureExpiredError';
  }
}

export class WebhookRateLimitExceededError extends Error {
  code = WEBHOOK_ERROR_CODES.RATE_LIMIT_EXCEEDED;
  statusCode = 429;

  constructor(limit: number, windowMs: number) {
    super(`Webhook rate limit exceeded: ${limit} per ${windowMs}ms`);
    this.name = 'WebhookRateLimitExceededError';
  }
}

export class WebhookUnauthorizedError extends Error {
  code = WEBHOOK_ERROR_CODES.UNAUTHORIZED;
  statusCode = 401;

  constructor() {
    super('Unauthorized');
    this.name = 'WebhookUnauthorizedError';
  }
}

export class WebhookInsufficientScopeError extends Error {
  code = WEBHOOK_ERROR_CODES.INSUFFICIENT_SCOPE;
  statusCode = 403;

  constructor(requiredScope: string) {
    super(`Insufficient scope: ${requiredScope} required`);
    this.name = 'WebhookInsufficientScopeError';
  }
}
