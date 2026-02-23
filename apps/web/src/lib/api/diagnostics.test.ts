import { describe, expect, it } from 'vitest';

import {
  extractErrorDiagnostics,
  getDebugInfoForSupport,
  ERROR_DIAGNOSTICS_ATTRIBUTE,
  getRequestIdSelector,
  getRequestIdFromElement,
} from './diagnostics.js';

import type { CategorizedApiError } from './types.js';

describe('extractErrorDiagnostics', () => {
  it('extracts diagnostics from error', () => {
    const error: CategorizedApiError = {
      category: 'authentication',
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Session expired',
      status: 401,
      retryable: false,
      requestId: 'req-123-abc',
    };

    const result = extractErrorDiagnostics(error);

    expect(result).toEqual({
      requestId: 'req-123-abc',
      errorCode: 'AUTH_TOKEN_EXPIRED',
      httpStatus: 401,
      retryAfterSeconds: undefined,
      isRetryable: false,
      category: 'authentication',
    });
  });

  it('extracts retryAfterSeconds for rate limit errors', () => {
    const error: CategorizedApiError = {
      category: 'rate_limiting',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      status: 429,
      retryable: true,
      retryAfterSeconds: 60,
    };

    const result = extractErrorDiagnostics(error);

    expect(result?.retryAfterSeconds).toBe(60);
  });

  it('returns null for undefined error', () => {
    const result = extractErrorDiagnostics(undefined);
    expect(result).toBeNull();
  });

  it('handles missing optional fields', () => {
    const error: CategorizedApiError = {
      category: 'server',
      code: 'INTERNAL_ERROR',
      message: 'Error',
      status: 500,
      retryable: false,
    };

    const result = extractErrorDiagnostics(error);

    expect(result?.requestId).toBeUndefined();
    expect(result?.errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('getDebugInfoForSupport', () => {
  it('formats debug info with request ID', () => {
    const error: CategorizedApiError = {
      category: 'authentication',
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Session expired',
      status: 401,
      retryable: false,
      requestId: 'req-abc-123',
    };

    const result = getDebugInfoForSupport(error);

    expect(result).toBe('Ref: req-abc-123 | Code: AUTH_TOKEN_EXPIRED | Status: 401');
  });

  it('returns empty string for error without requestId', () => {
    const error: CategorizedApiError = {
      category: 'server',
      code: 'INTERNAL_ERROR',
      message: 'Error',
      status: 500,
      retryable: false,
    };

    const result = getDebugInfoForSupport(error);

    expect(result).toBe('');
  });

  it('returns empty string for undefined error', () => {
    const result = getDebugInfoForSupport(undefined);
    expect(result).toBe('');
  });
});

describe('ERROR_DIAGNOSTICS_ATTRIBUTE', () => {
  it('has correct attribute name', () => {
    expect(ERROR_DIAGNOSTICS_ATTRIBUTE).toBe('data-error-request-id');
  });
});

describe('getRequestIdSelector', () => {
  it('returns correct CSS selector', () => {
    expect(getRequestIdSelector()).toBe('[data-error-request-id]');
  });
});

describe('getRequestIdFromElement', () => {
  it('extracts request ID from element', () => {
    const element = {
      getAttribute: (attr: string) => {
        if (attr === ERROR_DIAGNOSTICS_ATTRIBUTE) {
          return 'req-test-123';
        }
        return null;
      },
    } as unknown as Element;

    const result = getRequestIdFromElement(element);

    expect(result).toBe('req-test-123');
  });

  it('returns null for element without attribute', () => {
    const element = {
      getAttribute: () => null,
    } as unknown as Element;

    const result = getRequestIdFromElement(element);

    expect(result).toBeNull();
  });

  it('returns null for null element', () => {
    const result = getRequestIdFromElement(null);
    expect(result).toBeNull();
  });
});
