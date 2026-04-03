import { describe, expect, it } from 'vitest';

import { ErrorCodes } from '@the-dmz/shared/constants';

import { AppError } from '../../../shared/middleware/error-handler.js';
import {
  WebhookSubscriptionNotFoundError,
  WebhookSubscriptionInvalidStatusError,
  WebhookSubscriptionUrlInvalidError,
  WebhookSubscriptionEventTypesInvalidError,
  WebhookCircuitBreakerOpenError,
  WebhookDeliveryNotFoundError,
  WebhookDeliveryFailedError,
  WebhookDeliveryMaxRetriesExceededError,
  WebhookDeliveryDlqError,
  WebhookSignatureInvalidError,
  WebhookSignatureExpiredError,
  WebhookRateLimitExceededError,
  WebhookUnauthorizedError,
  WebhookInsufficientScopeError,
} from '../webhook.errors.js';

describe('webhook error classes', () => {
  describe('WebhookSubscriptionNotFoundError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookSubscriptionNotFoundError('sub-123');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookSubscriptionNotFoundError('sub-123');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SUBSCRIPTION_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Webhook subscription not found: sub-123');
    });

    it('has correct name', () => {
      const error = new WebhookSubscriptionNotFoundError('sub-123');
      expect(error.name).toBe('WebhookSubscriptionNotFoundError');
    });

    it('has a stack trace', () => {
      const error = new WebhookSubscriptionNotFoundError('sub-123');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('WebhookSubscriptionNotFoundError');
    });
  });

  describe('WebhookSubscriptionInvalidStatusError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookSubscriptionInvalidStatusError('invalid');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookSubscriptionInvalidStatusError('invalid');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SUBSCRIPTION_INVALID_STATUS);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid webhook subscription status: invalid');
    });

    it('has correct name', () => {
      const error = new WebhookSubscriptionInvalidStatusError('invalid');
      expect(error.name).toBe('WebhookSubscriptionInvalidStatusError');
    });
  });

  describe('WebhookSubscriptionUrlInvalidError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookSubscriptionUrlInvalidError('https://invalid');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookSubscriptionUrlInvalidError('https://invalid');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SUBSCRIPTION_URL_INVALID);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid webhook URL: https://invalid');
    });

    it('has correct name', () => {
      const error = new WebhookSubscriptionUrlInvalidError('https://invalid');
      expect(error.name).toBe('WebhookSubscriptionUrlInvalidError');
    });
  });

  describe('WebhookSubscriptionEventTypesInvalidError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookSubscriptionEventTypesInvalidError(['invalid']);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookSubscriptionEventTypesInvalidError(['type1', 'type2']);
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SUBSCRIPTION_EVENT_TYPES_INVALID);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid webhook event types: type1, type2');
    });

    it('has correct name', () => {
      const error = new WebhookSubscriptionEventTypesInvalidError(['type1']);
      expect(error.name).toBe('WebhookSubscriptionEventTypesInvalidError');
    });
  });

  describe('WebhookCircuitBreakerOpenError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookCircuitBreakerOpenError('sub-123');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookCircuitBreakerOpenError('sub-123');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SUBSCRIPTION_CIRCUIT_BREAKER_OPEN);
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Circuit breaker is open for subscription: sub-123');
    });

    it('has correct name', () => {
      const error = new WebhookCircuitBreakerOpenError('sub-123');
      expect(error.name).toBe('WebhookCircuitBreakerOpenError');
    });
  });

  describe('WebhookDeliveryNotFoundError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookDeliveryNotFoundError('del-123');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookDeliveryNotFoundError('del-123');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_DELIVERY_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Webhook delivery not found: del-123');
    });

    it('has correct name', () => {
      const error = new WebhookDeliveryNotFoundError('del-123');
      expect(error.name).toBe('WebhookDeliveryNotFoundError');
    });
  });

  describe('WebhookDeliveryFailedError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookDeliveryFailedError('del-123', 'Connection refused');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookDeliveryFailedError('del-123', 'Connection refused');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_DELIVERY_FAILED);
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Webhook delivery failed: del-123 - Connection refused');
    });

    it('has correct name', () => {
      const error = new WebhookDeliveryFailedError('del-123', 'Connection refused');
      expect(error.name).toBe('WebhookDeliveryFailedError');
    });
  });

  describe('WebhookDeliveryMaxRetriesExceededError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookDeliveryMaxRetriesExceededError('del-123');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookDeliveryMaxRetriesExceededError('del-123');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_DELIVERY_MAX_RETRIES_EXCEEDED);
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Webhook delivery max retries exceeded: del-123');
    });

    it('has correct name', () => {
      const error = new WebhookDeliveryMaxRetriesExceededError('del-123');
      expect(error.name).toBe('WebhookDeliveryMaxRetriesExceededError');
    });
  });

  describe('WebhookDeliveryDlqError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookDeliveryDlqError('del-123');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookDeliveryDlqError('del-123');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_DELIVERY_DLQ);
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Webhook delivery sent to DLQ: del-123');
    });

    it('has correct name', () => {
      const error = new WebhookDeliveryDlqError('del-123');
      expect(error.name).toBe('WebhookDeliveryDlqError');
    });
  });

  describe('WebhookSignatureInvalidError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookSignatureInvalidError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookSignatureInvalidError();
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SIGNATURE_INVALID);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid webhook signature');
    });

    it('has correct name', () => {
      const error = new WebhookSignatureInvalidError();
      expect(error.name).toBe('WebhookSignatureInvalidError');
    });
  });

  describe('WebhookSignatureExpiredError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookSignatureExpiredError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookSignatureExpiredError();
      expect(error.code).toBe(ErrorCodes.WEBHOOK_SIGNATURE_EXPIRED);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Webhook signature expired');
    });

    it('has correct name', () => {
      const error = new WebhookSignatureExpiredError();
      expect(error.name).toBe('WebhookSignatureExpiredError');
    });
  });

  describe('WebhookRateLimitExceededError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookRateLimitExceededError(100, 60000);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookRateLimitExceededError(100, 60000);
      expect(error.code).toBe(ErrorCodes.WEBHOOK_RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Webhook rate limit exceeded: 100 per 60000ms');
    });

    it('has correct name', () => {
      const error = new WebhookRateLimitExceededError(100, 60000);
      expect(error.name).toBe('WebhookRateLimitExceededError');
    });
  });

  describe('WebhookUnauthorizedError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookUnauthorizedError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookUnauthorizedError();
      expect(error.code).toBe(ErrorCodes.WEBHOOK_UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('has correct name', () => {
      const error = new WebhookUnauthorizedError();
      expect(error.name).toBe('WebhookUnauthorizedError');
    });
  });

  describe('WebhookInsufficientScopeError', () => {
    it('extends AppError and Error', () => {
      const error = new WebhookInsufficientScopeError('admin:read');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new WebhookInsufficientScopeError('admin:read');
      expect(error.code).toBe(ErrorCodes.WEBHOOK_INSUFFICIENT_SCOPE);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Insufficient scope: admin:read required');
    });

    it('has correct name', () => {
      const error = new WebhookInsufficientScopeError('admin:read');
      expect(error.name).toBe('WebhookInsufficientScopeError');
    });
  });
});
