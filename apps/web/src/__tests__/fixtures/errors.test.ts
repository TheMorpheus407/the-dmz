import { describe, expect, it } from 'vitest';

import type { CategorizedApiError } from '$lib/api/types';

import {
  createTestAuthError,
  createTestNetworkError,
  createTestServerError,
  createTestValidationError,
  createTestAuthorizationError,
} from './errors';

describe('error fixtures', () => {
  describe('createTestAuthError', () => {
    it('returns an error with authentication category', () => {
      const error = createTestAuthError();
      expect(error.category).toBe('authentication');
    });

    it('returns an error with AUTH_TOKEN_EXPIRED code by default', () => {
      const error = createTestAuthError();
      expect(error.code).toBe('AUTH_TOKEN_EXPIRED');
    });

    it('returns an error with status 401 by default', () => {
      const error = createTestAuthError();
      expect(error.status).toBe(401);
    });

    it('returns a non-retryable error by default', () => {
      const error = createTestAuthError();
      expect(error.retryable).toBe(false);
    });

    it('returns an error with Token expired message by default', () => {
      const error = createTestAuthError();
      expect(error.message).toBe('Token expired');
    });

    it('accepts overrides to customize the error', () => {
      const error = createTestAuthError({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Invalid token provided',
        status: 403,
        retryable: true,
      });
      expect(error.category).toBe('authentication');
      expect(error.code).toBe('AUTH_INVALID_TOKEN');
      expect(error.message).toBe('Invalid token provided');
      expect(error.status).toBe(403);
      expect(error.retryable).toBe(true);
    });

    it('accepts partial overrides', () => {
      const error = createTestAuthError({ status: 403 });
      expect(error.status).toBe(403);
      expect(error.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(error.category).toBe('authentication');
    });

    it('returns an object with all required CategorizedApiError fields', () => {
      const error = createTestAuthError();
      expect(error).toHaveProperty('category');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('status');
      expect(error).toHaveProperty('retryable');
    });

    it('can add optional fields via overrides', () => {
      const error = createTestAuthError({
        requestId: 'req-12345',
        retryAfterSeconds: 30,
      });
      expect(error.requestId).toBe('req-12345');
      expect(error.retryAfterSeconds).toBe(30);
    });
  });

  describe('createTestNetworkError', () => {
    it('returns an error with network category', () => {
      const error = createTestNetworkError();
      expect(error.category).toBe('network');
    });

    it('returns an error with NETWORK_ERROR code by default', () => {
      const error = createTestNetworkError();
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('returns an error with status 0 by default', () => {
      const error = createTestNetworkError();
      expect(error.status).toBe(0);
    });

    it('returns a retryable error by default', () => {
      const error = createTestNetworkError();
      expect(error.retryable).toBe(true);
    });

    it('returns an error with Network request failed message by default', () => {
      const error = createTestNetworkError();
      expect(error.message).toBe('Network request failed');
    });

    it('accepts overrides to customize the error', () => {
      const error = createTestNetworkError({
        code: 'TIMEOUT',
        message: 'Request timed out',
        status: 504,
        retryable: false,
      });
      expect(error.category).toBe('network');
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe('Request timed out');
      expect(error.status).toBe(504);
      expect(error.retryable).toBe(false);
    });

    it('accepts partial overrides', () => {
      const error = createTestNetworkError({ code: 'CONNECTION_REFUSED' });
      expect(error.code).toBe('CONNECTION_REFUSED');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
    });

    it('returns an object with all required CategorizedApiError fields', () => {
      const error = createTestNetworkError();
      expect(error).toHaveProperty('category');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('status');
      expect(error).toHaveProperty('retryable');
    });
  });

  describe('createTestServerError', () => {
    it('returns an error with server category', () => {
      const error = createTestServerError();
      expect(error.category).toBe('server');
    });

    it('returns an error with INTERNAL_SERVER_ERROR code by default', () => {
      const error = createTestServerError();
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('returns an error with status 500 by default', () => {
      const error = createTestServerError();
      expect(error.status).toBe(500);
    });

    it('returns a non-retryable error by default', () => {
      const error = createTestServerError();
      expect(error.retryable).toBe(false);
    });

    it('accepts overrides to customize the error', () => {
      const error = createTestServerError({
        status: 503,
        retryable: true,
        retryAfterSeconds: 60,
      });
      expect(error.category).toBe('server');
      expect(error.status).toBe(503);
      expect(error.retryable).toBe(true);
      expect(error.retryAfterSeconds).toBe(60);
    });
  });

  describe('createTestValidationError', () => {
    it('returns an error with validation category', () => {
      const error = createTestValidationError();
      expect(error.category).toBe('validation');
    });

    it('returns an error with VALIDATION_ERROR code by default', () => {
      const error = createTestValidationError();
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('returns an error with status 400 by default', () => {
      const error = createTestValidationError();
      expect(error.status).toBe(400);
    });

    it('returns a non-retryable error by default', () => {
      const error = createTestValidationError();
      expect(error.retryable).toBe(false);
    });

    it('accepts overrides including details', () => {
      const error = createTestValidationError({
        details: { field: 'email', message: 'Invalid format' },
      });
      expect(error.category).toBe('validation');
      expect(error.details).toEqual({ field: 'email', message: 'Invalid format' });
    });
  });

  describe('createTestAuthorizationError', () => {
    it('returns an error with authorization category', () => {
      const error = createTestAuthorizationError();
      expect(error.category).toBe('authorization');
    });

    it('returns an error with ACCESS_DENIED code by default', () => {
      const error = createTestAuthorizationError();
      expect(error.code).toBe('ACCESS_DENIED');
    });

    it('returns an error with status 403 by default', () => {
      const error = createTestAuthorizationError();
      expect(error.status).toBe(403);
    });

    it('returns a non-retryable error by default', () => {
      const error = createTestAuthorizationError();
      expect(error.retryable).toBe(false);
    });

    it('accepts overrides to customize the error', () => {
      const error = createTestAuthorizationError({
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      expect(error.category).toBe('authorization');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('factory function return types', () => {
    it('createTestAuthError returns CategorizedApiError', () => {
      const error = createTestAuthError();
      const _typeCheck: CategorizedApiError = error;
      expect(_typeCheck).toBeTruthy();
    });

    it('createTestNetworkError returns CategorizedApiError', () => {
      const error = createTestNetworkError();
      const _typeCheck: CategorizedApiError = error;
      expect(_typeCheck).toBeTruthy();
    });

    it('createTestServerError returns CategorizedApiError', () => {
      const error = createTestServerError();
      const _typeCheck: CategorizedApiError = error;
      expect(_typeCheck).toBeTruthy();
    });

    it('createTestValidationError returns CategorizedApiError', () => {
      const error = createTestValidationError();
      const _typeCheck: CategorizedApiError = error;
      expect(_typeCheck).toBeTruthy();
    });

    it('createTestAuthorizationError returns CategorizedApiError', () => {
      const error = createTestAuthorizationError();
      const _typeCheck: CategorizedApiError = error;
      expect(_typeCheck).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('empty overrides object returns default error', () => {
      const error = createTestAuthError({});
      expect(error.category).toBe('authentication');
      expect(error.code).toBe('AUTH_TOKEN_EXPIRED');
    });

    it('multiple calls return independent objects', () => {
      const error1 = createTestAuthError();
      const error2 = createTestAuthError();
      expect(error1).not.toBe(error2);
      error1.code = 'MODIFIED';
      expect(error2.code).toBe('AUTH_TOKEN_EXPIRED');
    });

    it('can override to create all error categories', () => {
      const authError = createTestAuthError();
      const networkError = createTestNetworkError();
      const serverError = createTestServerError();
      const validationError = createTestValidationError();
      const authzError = createTestAuthorizationError();

      expect(authError.category).toBe('authentication');
      expect(networkError.category).toBe('network');
      expect(serverError.category).toBe('server');
      expect(validationError.category).toBe('validation');
      expect(authzError.category).toBe('authorization');
    });
  });
});
