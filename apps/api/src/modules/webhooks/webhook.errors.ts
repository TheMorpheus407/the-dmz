import { ErrorCodes } from '@the-dmz/shared/constants';

import { AppError } from '../../shared/middleware/error-handler.js';

export class WebhookSubscriptionNotFoundError extends AppError {
  constructor(subscriptionId: string) {
    super({
      code: ErrorCodes.WEBHOOK_SUBSCRIPTION_NOT_FOUND,
      message: `Webhook subscription not found: ${subscriptionId}`,
      statusCode: 404,
    });
    this.name = 'WebhookSubscriptionNotFoundError';
  }
}

export class WebhookSubscriptionInvalidStatusError extends AppError {
  constructor(status: string) {
    super({
      code: ErrorCodes.WEBHOOK_SUBSCRIPTION_INVALID_STATUS,
      message: `Invalid webhook subscription status: ${status}`,
      statusCode: 400,
    });
    this.name = 'WebhookSubscriptionInvalidStatusError';
  }
}

export class WebhookSubscriptionUrlInvalidError extends AppError {
  constructor(url: string) {
    super({
      code: ErrorCodes.WEBHOOK_SUBSCRIPTION_URL_INVALID,
      message: `Invalid webhook URL: ${url}`,
      statusCode: 400,
    });
    this.name = 'WebhookSubscriptionUrlInvalidError';
  }
}

export class WebhookSubscriptionEventTypesInvalidError extends AppError {
  constructor(types: string[]) {
    super({
      code: ErrorCodes.WEBHOOK_SUBSCRIPTION_EVENT_TYPES_INVALID,
      message: `Invalid webhook event types: ${types.join(', ')}`,
      statusCode: 400,
    });
    this.name = 'WebhookSubscriptionEventTypesInvalidError';
  }
}

export class WebhookCircuitBreakerOpenError extends AppError {
  constructor(subscriptionId: string) {
    super({
      code: ErrorCodes.WEBHOOK_SUBSCRIPTION_CIRCUIT_BREAKER_OPEN,
      message: `Circuit breaker is open for subscription: ${subscriptionId}`,
      statusCode: 503,
    });
    this.name = 'WebhookCircuitBreakerOpenError';
  }
}

export class WebhookDeliveryNotFoundError extends AppError {
  constructor(deliveryId: string) {
    super({
      code: ErrorCodes.WEBHOOK_DELIVERY_NOT_FOUND,
      message: `Webhook delivery not found: ${deliveryId}`,
      statusCode: 404,
    });
    this.name = 'WebhookDeliveryNotFoundError';
  }
}

export class WebhookDeliveryFailedError extends AppError {
  constructor(deliveryId: string, message: string) {
    super({
      code: ErrorCodes.WEBHOOK_DELIVERY_FAILED,
      message: `Webhook delivery failed: ${deliveryId} - ${message}`,
      statusCode: 502,
    });
    this.name = 'WebhookDeliveryFailedError';
  }
}

export class WebhookDeliveryMaxRetriesExceededError extends AppError {
  constructor(deliveryId: string) {
    super({
      code: ErrorCodes.WEBHOOK_DELIVERY_MAX_RETRIES_EXCEEDED,
      message: `Webhook delivery max retries exceeded: ${deliveryId}`,
      statusCode: 502,
    });
    this.name = 'WebhookDeliveryMaxRetriesExceededError';
  }
}

export class WebhookDeliveryDlqError extends AppError {
  constructor(deliveryId: string) {
    super({
      code: ErrorCodes.WEBHOOK_DELIVERY_DLQ,
      message: `Webhook delivery sent to DLQ: ${deliveryId}`,
      statusCode: 502,
    });
    this.name = 'WebhookDeliveryDlqError';
  }
}

export class WebhookSignatureInvalidError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.WEBHOOK_SIGNATURE_INVALID,
      message: 'Invalid webhook signature',
      statusCode: 401,
    });
    this.name = 'WebhookSignatureInvalidError';
  }
}

export class WebhookSignatureExpiredError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.WEBHOOK_SIGNATURE_EXPIRED,
      message: 'Webhook signature expired',
      statusCode: 401,
    });
    this.name = 'WebhookSignatureExpiredError';
  }
}

export class WebhookRateLimitExceededError extends AppError {
  constructor(limit: number, windowMs: number) {
    super({
      code: ErrorCodes.WEBHOOK_RATE_LIMIT_EXCEEDED,
      message: `Webhook rate limit exceeded: ${limit} per ${windowMs}ms`,
      statusCode: 429,
    });
    this.name = 'WebhookRateLimitExceededError';
  }
}

export class WebhookUnauthorizedError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.WEBHOOK_UNAUTHORIZED,
      message: 'Unauthorized',
      statusCode: 401,
    });
    this.name = 'WebhookUnauthorizedError';
  }
}

export class WebhookInsufficientScopeError extends AppError {
  constructor(requiredScope: string) {
    super({
      code: ErrorCodes.WEBHOOK_INSUFFICIENT_SCOPE,
      message: `Insufficient scope: ${requiredScope} required`,
      statusCode: 403,
    });
    this.name = 'WebhookInsufficientScopeError';
  }
}
