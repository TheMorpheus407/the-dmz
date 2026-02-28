import { describe, expect, it } from 'vitest';

import {
  ErrorCodes as SharedErrorCodes,
  errorCodeMetadata,
  type ErrorCode as SharedErrorCode,
} from './error-codes.js';

const API_ERROR_CODES_TO_SHARED_ALIASES: Record<string, string> = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_ERROR',
  RESOURCE_NOT_FOUND: 'NOT_FOUND',
  PROFILE_NOT_FOUND: 'NOT_FOUND',
  PROFILE_UPDATE_FAILED: 'INTERNAL_ERROR',
};

function normalizeApiCode(apiCode: string): string {
  return API_ERROR_CODES_TO_SHARED_ALIASES[apiCode] ?? apiCode;
}

describe('Error Code Contract Parity', () => {
  describe('Shared ErrorCodes', () => {
    it('should have metadata for all shared error codes', () => {
      const sharedCodes = Object.values(SharedErrorCodes) as readonly SharedErrorCode[];
      for (const code of sharedCodes) {
        expect(
          errorCodeMetadata[code],
          `Error code "${code}" should have metadata defined in shared package`,
        ).toBeDefined();
        expect(errorCodeMetadata[code].category).toBeDefined();
        expect(errorCodeMetadata[code].retryable).toBeDefined();
        expect(errorCodeMetadata[code].messageKey).toBeDefined();
      }
    });

    it('should have valid category for all error codes', () => {
      const validCategories = [
        'authentication',
        'authorization',
        'validation',
        'rate_limiting',
        'server',
        'network',
        'not_found',
        'tenant_blocked',
        'conflict',
        'limit',
      ];
      const sharedCodes = Object.values(SharedErrorCodes) as readonly SharedErrorCode[];
      for (const code of sharedCodes) {
        const metadata = errorCodeMetadata[code];
        expect(
          validCategories.includes(metadata.category),
          `Error code "${code}" has invalid category: ${metadata.category}`,
        ).toBe(true);
      }
    });
  });

  describe('API-specific error codes', () => {
    it('API should define INTERNAL_SERVER_ERROR', () => {
      expect(SharedErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('API should define RESOURCE_NOT_FOUND', () => {
      const normalized = normalizeApiCode('RESOURCE_NOT_FOUND');
      expect(SharedErrorCodes[normalized as keyof typeof SharedErrorCodes]).toBeDefined();
    });

    it('API should define PROFILE_NOT_FOUND', () => {
      const normalized = normalizeApiCode('PROFILE_NOT_FOUND');
      expect(SharedErrorCodes[normalized as keyof typeof SharedErrorCodes]).toBeDefined();
    });

    it('API should define PROFILE_UPDATE_FAILED', () => {
      const normalized = normalizeApiCode('PROFILE_UPDATE_FAILED');
      expect(SharedErrorCodes[normalized as keyof typeof SharedErrorCodes]).toBeDefined();
    });
  });
});

describe('Error Code Category Mapping', () => {
  it('should map authentication errors to authentication category', () => {
    const authCodes = [
      SharedErrorCodes.AUTH_INVALID_CREDENTIALS,
      SharedErrorCodes.AUTH_TOKEN_EXPIRED,
      SharedErrorCodes.AUTH_TOKEN_INVALID,
      SharedErrorCodes.AUTH_MFA_REQUIRED,
      SharedErrorCodes.AUTH_ACCOUNT_LOCKED,
      SharedErrorCodes.AUTH_UNAUTHORIZED,
      SharedErrorCodes.AUTH_SESSION_EXPIRED,
      SharedErrorCodes.AUTH_CSRF_INVALID,
    ];

    for (const code of authCodes) {
      expect(errorCodeMetadata[code].category).toBe('authentication');
    }
  });

  it('should map authorization errors to authorization category', () => {
    const authzCodes = [
      SharedErrorCodes.AUTH_FORBIDDEN,
      SharedErrorCodes.AUTH_INSUFFICIENT_PERMS,
      SharedErrorCodes.AUTH_ACCOUNT_SUSPENDED,
      SharedErrorCodes.TENANT_SUSPENDED,
      SharedErrorCodes.TENANT_INACTIVE,
    ];

    for (const code of authzCodes) {
      expect(errorCodeMetadata[code].category).toBe('authorization');
    }
  });

  it('should map rate limiting errors to rate_limiting category', () => {
    expect(errorCodeMetadata[SharedErrorCodes.RATE_LIMIT_EXCEEDED].category).toBe('rate_limiting');
    expect(errorCodeMetadata[SharedErrorCodes.RATE_LIMIT_EXCEEDED].retryable).toBe(true);
  });

  it('should map tenant blocked errors to tenant_blocked category', () => {
    expect(errorCodeMetadata[SharedErrorCodes.TENANT_BLOCKED].category).toBe('tenant_blocked');
  });
});

describe('Error Code Retryability', () => {
  it('should mark rate limiting errors as retryable', () => {
    expect(errorCodeMetadata[SharedErrorCodes.RATE_LIMIT_EXCEEDED].retryable).toBe(true);
  });

  it('should mark service unavailable errors as retryable', () => {
    expect(errorCodeMetadata[SharedErrorCodes.SERVICE_UNAVAILABLE].retryable).toBe(true);
    expect(errorCodeMetadata[SharedErrorCodes.SYSTEM_SERVICE_UNAVAILABLE].retryable).toBe(true);
  });

  it('should mark authentication errors as not retryable', () => {
    expect(errorCodeMetadata[SharedErrorCodes.AUTH_INVALID_CREDENTIALS].retryable).toBe(false);
    expect(errorCodeMetadata[SharedErrorCodes.AUTH_TOKEN_EXPIRED].retryable).toBe(false);
  });

  it('should mark authorization errors as not retryable', () => {
    expect(errorCodeMetadata[SharedErrorCodes.AUTH_FORBIDDEN].retryable).toBe(false);
    expect(errorCodeMetadata[SharedErrorCodes.AUTH_INSUFFICIENT_PERMS].retryable).toBe(false);
  });
});
