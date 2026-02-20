import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';
import {
  AppError,
  ErrorCodes,
  createAppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationFailed,
  internalError,
  serviceUnavailable,
  tenantContextMissing,
  tenantContextInvalid,
  rateLimitExceeded,
} from '../error-handler.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

describe('ErrorCodes and AppError', () => {
  describe('ErrorCodes', () => {
    it('should have all required error codes', () => {
      expect(ErrorCodes.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCodes.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
      expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(ErrorCodes.AUTH_UNAUTHORIZED).toBe('AUTH_UNAUTHORIZED');
      expect(ErrorCodes.AUTH_FORBIDDEN).toBe('AUTH_FORBIDDEN');
      expect(ErrorCodes.AUTH_SESSION_EXPIRED).toBe('AUTH_SESSION_EXPIRED');
      expect(ErrorCodes.AUTH_INVALID_TOKEN).toBe('AUTH_INVALID_TOKEN');
      expect(ErrorCodes.TENANT_CONTEXT_MISSING).toBe('TENANT_CONTEXT_MISSING');
      expect(ErrorCodes.TENANT_CONTEXT_INVALID).toBe('TENANT_CONTEXT_INVALID');
      expect(ErrorCodes.TENANT_NOT_FOUND).toBe('TENANT_NOT_FOUND');
      expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('AppError', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Validation failed',
        statusCode: 400,
        details: { field: 'email' },
      });

      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
      expect(error).toBeInstanceOf(Error);
    });

    it('should create an AppError without details', () => {
      const error = new AppError({
        code: ErrorCodes.NOT_FOUND,
        message: 'Not found',
        statusCode: 404,
      });

      expect(error.details).toBeUndefined();
    });
  });

  describe('createAppError helper', () => {
    it('should create AppError with default message', () => {
      const error = createAppError(ErrorCodes.VALIDATION_FAILED);

      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
    });

    it('should create AppError with custom message', () => {
      const error = createAppError(ErrorCodes.NOT_FOUND, 'Custom not found message');

      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.message).toBe('Custom not found message');
      expect(error.statusCode).toBe(404);
    });

    it('should create AppError with details', () => {
      const error = createAppError(ErrorCodes.VALIDATION_FAILED, undefined, {
        issues: [{ path: ['email'], message: 'Invalid email' }],
      });

      expect(error.details).toEqual({ issues: [{ path: ['email'], message: 'Invalid email' }] });
    });
  });

  describe('shorthand helpers', () => {
    it('badRequest should create correct error', () => {
      const error = badRequest('Invalid email', { field: 'email' });

      expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
      expect(error.message).toBe('Invalid email');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('unauthorized should create correct error', () => {
      const error = unauthorized('Token expired');

      expect(error.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
      expect(error.message).toBe('Token expired');
      expect(error.statusCode).toBe(401);
    });

    it('forbidden should create correct error', () => {
      const error = forbidden('Admin access required');

      expect(error.code).toBe(ErrorCodes.AUTH_FORBIDDEN);
      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });

    it('notFound should create correct error', () => {
      const error = notFound('User not found', { userId: '123' });

      expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ userId: '123' });
    });

    it('conflict should create correct error', () => {
      const error = conflict('Email already exists');

      expect(error.code).toBe(ErrorCodes.CONFLICT);
      expect(error.statusCode).toBe(409);
    });

    it('validationFailed should create correct error', () => {
      const error = validationFailed('Invalid payload', { issues: [] });

      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.statusCode).toBe(400);
    });

    it('internalError should create correct error', () => {
      const error = internalError('Database connection failed');

      expect(error.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('serviceUnavailable should create correct error', () => {
      const error = serviceUnavailable();

      expect(error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
      expect(error.statusCode).toBe(503);
    });

    it('tenantContextMissing should create correct error', () => {
      const error = tenantContextMissing();

      expect(error.code).toBe(ErrorCodes.TENANT_CONTEXT_MISSING);
      expect(error.statusCode).toBe(401);
    });

    it('tenantContextInvalid should create correct error', () => {
      const error = tenantContextInvalid('Invalid tenant ID');

      expect(error.code).toBe(ErrorCodes.TENANT_CONTEXT_INVALID);
      expect(error.statusCode).toBe(401);
    });

    it('rateLimitExceeded should create correct error', () => {
      const error = rateLimitExceeded({ retryAfterSeconds: 60 });

      expect(error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfterSeconds: 60 });
    });
  });
});

describe('Global Error Handler Integration', () => {
  const app = buildApp(testConfig);

  app.get('/test-app-error', async () => {
    throw new AppError({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Test validation error',
      statusCode: 400,
      details: { field: 'test' },
    });
  });

  app.get('/test-zod-error', async () => {
    const { z } = await import('zod');
    const schema = z.object({ name: z.string() });
    schema.parse({ name: 123 });
  });

  app.get('/test-unhandled-error', async () => {
    throw new Error('Unexpected error');
  });

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('AppError handling', () => {
    it('should return standardized error envelope for AppError', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-app-error',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.message).toBe('Test validation error');
      expect(body.error.details).toEqual({ field: 'test' });
      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('ZodError handling', () => {
    it('should return standardized envelope for Zod validation errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-zod-error',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.details.issues).toBeDefined();
      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('Unhandled error handling', () => {
    it('should return INTERNAL_SERVER_ERROR for unhandled errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-unhandled-error',
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('Internal Server Error');
      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('404 handling', () => {
    it('should return standardized envelope for 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent-route-12345',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('requestId inclusion', () => {
    it('should include requestId in all error responses', async () => {
      const response1 = await app.inject({
        method: 'GET',
        url: '/nonexistent-route-12345',
      });

      const body1 = response1.json();
      expect(body1.error.requestId).toBeDefined();
      expect(typeof body1.error.requestId).toBe('string');

      const response2 = await app.inject({
        method: 'GET',
        url: '/test-unhandled-error',
      });

      const body2 = response2.json();
      expect(body2.error.requestId).toBeDefined();
      expect(typeof body2.error.requestId).toBe('string');
    });

    it('should use custom requestId from header when provided', async () => {
      const customRequestId = 'custom-req-id-123';

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent-route-12345',
        headers: {
          'x-request-id': customRequestId,
        },
      });

      const body = response.json();
      expect(body.error.requestId).toBe(customRequestId);
    });
  });
});
