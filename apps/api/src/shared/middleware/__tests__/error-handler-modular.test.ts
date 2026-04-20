import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';
import {
  ErrorCodes,
  ErrorStatusMap,
  ErrorMessages,
  errorCodeMetadata,
  AppError,
  createAppError,
  badRequest,
  unauthorized,
  forbidden,
  insufficientPermissions,
  notFound,
  conflict,
  validationFailed,
  internalError,
  serviceUnavailable,
  tenantContextMissing,
  tenantContextInvalid,
  rateLimitExceeded,
  createErrorHandler,
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

describe('error-handler modular structure', () => {
  describe('index exports', () => {
    it('should export ErrorCodes', () => {
      expect(ErrorCodes).toBeDefined();
      expect(ErrorCodes.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    });

    it('should export ErrorStatusMap', () => {
      expect(ErrorStatusMap).toBeDefined();
      expect(typeof ErrorStatusMap).toBe('object');
      expect(ErrorStatusMap[ErrorCodes.INTERNAL_SERVER_ERROR]).toBe(500);
      expect(ErrorStatusMap[ErrorCodes.VALIDATION_FAILED]).toBe(400);
      expect(ErrorStatusMap[ErrorCodes.NOT_FOUND]).toBe(404);
    });

    it('should export ErrorMessages', () => {
      expect(ErrorMessages).toBeDefined();
      expect(typeof ErrorMessages).toBe('object');
      expect(ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR]).toBe(
        'An internal server error occurred',
      );
      expect(ErrorMessages[ErrorCodes.VALIDATION_FAILED]).toBe('Validation failed');
    });

    it('should export errorCodeMetadata', () => {
      expect(errorCodeMetadata).toBeDefined();
      expect(typeof errorCodeMetadata).toBe('object');
      expect(errorCodeMetadata[ErrorCodes.RATE_LIMIT_EXCEEDED]).toMatchObject({
        category: expect.stringMatching(/rate_limiting/i),
        retryable: true,
      });
    });

    it('should export AppError class', () => {
      expect(AppError).toBeDefined();
      expect(typeof AppError).toBe('function');
    });

    it('should export createAppError function', () => {
      expect(createAppError).toBeDefined();
      expect(typeof createAppError).toBe('function');
    });

    it('should export all factory functions', () => {
      expect(badRequest).toBeDefined();
      expect(unauthorized).toBeDefined();
      expect(forbidden).toBeDefined();
      expect(insufficientPermissions).toBeDefined();
      expect(notFound).toBeDefined();
      expect(conflict).toBeDefined();
      expect(validationFailed).toBeDefined();
      expect(internalError).toBeDefined();
      expect(serviceUnavailable).toBeDefined();
      expect(tenantContextMissing).toBeDefined();
      expect(tenantContextInvalid).toBeDefined();
      expect(rateLimitExceeded).toBeDefined();
    });

    it('should export createErrorHandler function', () => {
      expect(createErrorHandler).toBeDefined();
      expect(typeof createErrorHandler).toBe('function');
    });
  });

  describe('ErrorCodes structure', () => {
    it('should include all API-specific error codes', () => {
      expect(ErrorCodes.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
      expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
      expect(ErrorCodes.PROFILE_NOT_FOUND).toBe('PROFILE_NOT_FOUND');
      expect(ErrorCodes.PROFILE_UPDATE_FAILED).toBe('PROFILE_UPDATE_FAILED');
    });

    it('should have AUTH_PERMISSION_DECLARATION_MISSING code', () => {
      expect(ErrorCodes.AUTH_PERMISSION_DECLARATION_MISSING).toBe(
        'AUTH_PERMISSION_DECLARATION_MISSING',
      );
    });
  });

  describe('ErrorStatusMap coverage', () => {
    it('should have status codes for all error codes', () => {
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      for (const code of allCodes) {
        expect(ErrorStatusMap[code], `Missing status code for ${code}`).toBeDefined();
        expect(typeof ErrorStatusMap[code]).toBe('number');
      }
    });

    it('should map client errors to 4xx status codes', () => {
      expect(ErrorStatusMap[ErrorCodes.VALIDATION_FAILED]).toBe(400);
      expect(ErrorStatusMap[ErrorCodes.INVALID_INPUT]).toBe(400);
      expect(ErrorStatusMap[ErrorCodes.AUTH_UNAUTHORIZED]).toBe(401);
      expect(ErrorStatusMap[ErrorCodes.AUTH_FORBIDDEN]).toBe(403);
      expect(ErrorStatusMap[ErrorCodes.NOT_FOUND]).toBe(404);
      expect(ErrorStatusMap[ErrorCodes.CONFLICT]).toBe(409);
      expect(ErrorStatusMap[ErrorCodes.RATE_LIMIT_EXCEEDED]).toBe(429);
    });

    it('should map server errors to 5xx status codes', () => {
      expect(ErrorStatusMap[ErrorCodes.INTERNAL_SERVER_ERROR]).toBe(500);
      expect(ErrorStatusMap[ErrorCodes.SERVICE_UNAVAILABLE]).toBe(503);
    });
  });

  describe('ErrorMessages coverage', () => {
    it('should have messages for all error codes', () => {
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      for (const code of allCodes) {
        expect(ErrorMessages[code], `Missing message for ${code}`).toBeDefined();
        expect(typeof ErrorMessages[code]).toBe('string');
      }
    });
  });

  describe('errorCodeMetadata coverage', () => {
    it('should have metadata for all error codes', () => {
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      for (const code of allCodes) {
        expect(errorCodeMetadata[code], `Missing metadata for ${code}`).toBeDefined();
      }
    });

    it('should have valid category for each code', () => {
      const validCategories = [
        'authentication',
        'authorization',
        'validation',
        'rate_limiting',
        'abuse',
        'server',
        'network',
        'not_found',
        'tenant_blocked',
        'limit',
        'conflict',
      ];
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      for (const code of allCodes) {
        const meta = errorCodeMetadata[code];
        expect(validCategories).toContain(meta.category);
      }
    });

    it('should have boolean retryable flag for each code', () => {
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      for (const code of allCodes) {
        const meta = errorCodeMetadata[code];
        expect(typeof meta.retryable).toBe('boolean');
      }
    });
  });

  describe('ErrorStatusMap reverse coverage', () => {
    it('should have all entries in ErrorStatusMap correspond to valid ErrorCodes', () => {
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      const allCodeValues = new Set(allCodes);
      const statusMapKeys = Object.keys(ErrorStatusMap) as Array<keyof typeof ErrorStatusMap>;
      for (const key of statusMapKeys) {
        expect(
          allCodeValues.has(key as (typeof allCodes)[number]),
          `ErrorStatusMap contains unknown key: ${key}`,
        ).toBe(true);
      }
    });
  });

  describe('ErrorMessages reverse coverage', () => {
    it('should have all entries in ErrorMessages correspond to valid ErrorCodes', () => {
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      const allCodeValues = new Set(allCodes);
      const messagesKeys = Object.keys(ErrorMessages) as Array<keyof typeof ErrorMessages>;
      for (const key of messagesKeys) {
        expect(
          allCodeValues.has(key as (typeof allCodes)[number]),
          `ErrorMessages contains unknown key: ${key}`,
        ).toBe(true);
      }
    });
  });

  describe('errorCodeMetadata reverse coverage', () => {
    it('should have all entries in errorCodeMetadata correspond to valid ErrorCodes', () => {
      const allCodes = Object.keys(ErrorCodes) as Array<keyof typeof ErrorCodes>;
      const allCodeValues = new Set(allCodes);
      const metadataKeys = Object.keys(errorCodeMetadata) as Array<keyof typeof errorCodeMetadata>;
      for (const key of metadataKeys) {
        expect(
          allCodeValues.has(key as (typeof allCodes)[number]),
          `errorCodeMetadata contains unknown key: ${key}`,
        ).toBe(true);
      }
    });
  });

  describe('AppError class', () => {
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

    it('should propagate cause when provided', () => {
      const originalError = new Error('Original error message');
      const error = new AppError({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Wrapped error',
        statusCode: 400,
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });

    it('should preserve error chain when cause is provided', () => {
      const originalError = new Error('Database connection failed');
      const wrappedError = new AppError({
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch user',
        statusCode: 500,
        cause: originalError,
      });
      const finalError = new AppError({
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Request failed',
        statusCode: 500,
        cause: wrappedError,
      });

      expect(finalError.cause).toBe(wrappedError);
      expect((finalError.cause as AppError).cause).toBe(originalError);
    });

    it('should handle null cause', () => {
      const error = new AppError({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'With null cause',
        statusCode: 400,
        cause: null,
      });
      expect(error.cause).toBe(null);
    });

    it('should handle undefined cause', () => {
      const error = new AppError({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'With undefined cause',
        statusCode: 400,
        cause: undefined,
      });
      expect(error.cause).toBeUndefined();
    });
  });

  describe('createAppError helper', () => {
    it('should create AppError with default message from ErrorMessages', () => {
      const error = createAppError(ErrorCodes.VALIDATION_FAILED);

      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.message).toBe(ErrorMessages[ErrorCodes.VALIDATION_FAILED]);
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

    it('should create AppError with cause', () => {
      const originalError = new Error('Underlying error');
      const error = createAppError(
        ErrorCodes.VALIDATION_FAILED,
        'Wrapped error',
        undefined,
        originalError,
      );

      expect(error.cause).toBe(originalError);
    });
  });

  describe('factory functions', () => {
    it('badRequest should create error with INVALID_INPUT code', () => {
      const error = badRequest('Invalid email', { field: 'email' });

      expect(error.code).toBe(ErrorCodes.INVALID_INPUT);
      expect(error.message).toBe('Invalid email');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('unauthorized should create error with AUTH_UNAUTHORIZED code', () => {
      const error = unauthorized('Token expired');

      expect(error.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
      expect(error.message).toBe('Token expired');
      expect(error.statusCode).toBe(401);
    });

    it('forbidden should create error with AUTH_FORBIDDEN code', () => {
      const error = forbidden('Admin access required');

      expect(error.code).toBe(ErrorCodes.AUTH_FORBIDDEN);
      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });

    it('insufficientPermissions should create error with AUTH_INSUFFICIENT_PERMS code', () => {
      const error = insufficientPermissions('Not enough permissions');

      expect(error.code).toBe(ErrorCodes.AUTH_INSUFFICIENT_PERMS);
      expect(error.statusCode).toBe(403);
    });

    it('notFound should create error with RESOURCE_NOT_FOUND code', () => {
      const error = notFound('User not found', { userId: '123' });

      expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ userId: '123' });
    });

    it('conflict should create error with CONFLICT code', () => {
      const error = conflict('Email already exists');

      expect(error.code).toBe(ErrorCodes.CONFLICT);
      expect(error.statusCode).toBe(409);
    });

    it('validationFailed should create error with VALIDATION_FAILED code', () => {
      const error = validationFailed('Invalid payload', { issues: [] });

      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.statusCode).toBe(400);
    });

    it('internalError should create error with INTERNAL_SERVER_ERROR code', () => {
      const error = internalError('Database connection failed');

      expect(error.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('serviceUnavailable should create error with SERVICE_UNAVAILABLE code', () => {
      const error = serviceUnavailable();

      expect(error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
      expect(error.statusCode).toBe(503);
    });

    it('tenantContextMissing should create error with TENANT_CONTEXT_MISSING code', () => {
      const error = tenantContextMissing();

      expect(error.code).toBe(ErrorCodes.TENANT_CONTEXT_MISSING);
      expect(error.statusCode).toBe(401);
    });

    it('tenantContextInvalid should create error with TENANT_CONTEXT_INVALID code', () => {
      const error = tenantContextInvalid('Invalid tenant ID');

      expect(error.code).toBe(ErrorCodes.TENANT_CONTEXT_INVALID);
      expect(error.statusCode).toBe(401);
    });

    it('rateLimitExceeded should create error with RATE_LIMIT_EXCEEDED code', () => {
      const error = rateLimitExceeded({ retryAfterSeconds: 60 });

      expect(error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfterSeconds: 60 });
    });
  });
});

describe('Global Error Handler Integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp(testConfig);

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

    app.get('/test-fastify-validation-error', {
      schema: {
        querystring: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
          },
        },
      },
      handler: async () => {
        return { ok: true };
      },
    });

    app.post('/test-json-body', {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
      handler: async () => {
        return { ok: true };
      },
    });

    app.get('/test-sentry-failure', async () => {
      throw new Error('Test error for Sentry');
    });

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

  describe('normalizeDetails utility', () => {
    it('should return empty object when error has no details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-unhandled-error',
      });

      const body = response.json();
      expect(body.error.details).toEqual({});
    });

    it('should preserve details when error has details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-app-error',
      });

      const body = response.json();
      expect(body.error.details).toEqual({ field: 'test' });
    });
  });

  describe('Sentry capture failure graceful degradation', () => {
    it('should continue processing when Sentry capture throws', async () => {
      vi.mock('@sentry/node', () => {
        return {
          default: {
            captureException: () => {
              throw new Error('Sentry is down');
            },
          },
        };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-sentry-failure',
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.requestId).toBeDefined();
    });
  });
});
