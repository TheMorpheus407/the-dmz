import { describe, expect, it } from 'vitest';

import { ErrorCodes, errorCodeMetadata, ErrorCodeCategory, type ErrorCode } from '@the-dmz/shared';

const MAPPED_ERROR_CATEGORIES: readonly ErrorCodeCategory[] = [
  'authentication',
  'authorization',
  'validation',
  'rate_limiting',
  'server',
  'network',
  'not_found',
  'tenant_blocked',
];

describe('Frontend Error Mapping Coverage', () => {
  describe('All shared error codes should have metadata', () => {
    it('should have metadata for every error code in the shared package', () => {
      const allCodes = Object.values(ErrorCodes) as readonly ErrorCode[];
      const uncoveredCodes: string[] = [];

      for (const code of allCodes) {
        const metadata = errorCodeMetadata[code];
        if (!metadata) {
          uncoveredCodes.push(code);
        }
      }

      expect(uncoveredCodes).toEqual([]);
    });
  });

  describe('All mapped error categories should be covered', () => {
    it('should have all 8 error categories defined', () => {
      expect(MAPPED_ERROR_CATEGORIES).toHaveLength(8);
      expect(MAPPED_ERROR_CATEGORIES).toContain('authentication');
      expect(MAPPED_ERROR_CATEGORIES).toContain('authorization');
      expect(MAPPED_ERROR_CATEGORIES).toContain('validation');
      expect(MAPPED_ERROR_CATEGORIES).toContain('rate_limiting');
      expect(MAPPED_ERROR_CATEGORIES).toContain('server');
      expect(MAPPED_ERROR_CATEGORIES).toContain('network');
      expect(MAPPED_ERROR_CATEGORIES).toContain('not_found');
      expect(MAPPED_ERROR_CATEGORIES).toContain('tenant_blocked');
    });
  });

  describe('Error category to codes mapping', () => {
    it('should map authentication codes correctly', () => {
      const authCodes = [
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        ErrorCodes.AUTH_TOKEN_EXPIRED,
        ErrorCodes.AUTH_TOKEN_INVALID,
        ErrorCodes.AUTH_MFA_REQUIRED,
        ErrorCodes.AUTH_MFA_ALREADY_ENABLED,
        ErrorCodes.AUTH_MFA_NOT_ENABLED,
        ErrorCodes.AUTH_MFA_INVALID_CODE,
        ErrorCodes.AUTH_MFA_EXPIRED,
        ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
        ErrorCodes.AUTH_WEBAUTHN_VERIFICATION_FAILED,
        ErrorCodes.AUTH_WEBAUTHN_NOT_SUPPORTED,
        ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND,
        ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_EXISTS,
        ErrorCodes.AUTH_WEBAUTHN_REGISTRATION_FAILED,
        ErrorCodes.AUTH_WEBAUTHN_ASSERTION_FAILED,
        ErrorCodes.AUTH_ACCOUNT_LOCKED,
        ErrorCodes.AUTH_UNAUTHORIZED,
        ErrorCodes.AUTH_SESSION_EXPIRED,
        ErrorCodes.AUTH_SESSION_REVOKED,
        ErrorCodes.AUTH_CSRF_INVALID,
        ErrorCodes.TENANT_CONTEXT_MISSING,
        ErrorCodes.TENANT_CONTEXT_INVALID,
      ];

      for (const code of authCodes) {
        expect(errorCodeMetadata[code].category).toBe(ErrorCodeCategory.AUTHENTICATION);
      }
    });

    it('should map authorization codes correctly', () => {
      const authzCodes = [
        ErrorCodes.AUTH_FORBIDDEN,
        ErrorCodes.AUTH_INSUFFICIENT_PERMS,
        ErrorCodes.AUTH_ACCOUNT_SUSPENDED,
        ErrorCodes.TENANT_SUSPENDED,
        ErrorCodes.TENANT_INACTIVE,
      ];

      for (const code of authzCodes) {
        expect(errorCodeMetadata[code].category).toBe(ErrorCodeCategory.AUTHORIZATION);
      }
    });

    it('should map validation codes correctly', () => {
      const validationCodes = [
        ErrorCodes.VALIDATION_FAILED,
        ErrorCodes.VALIDATION_INVALID_FORMAT,
        ErrorCodes.INVALID_INPUT,
      ];

      for (const code of validationCodes) {
        expect(errorCodeMetadata[code].category).toBe(ErrorCodeCategory.VALIDATION);
      }
    });

    it('should map rate limiting codes correctly', () => {
      expect(errorCodeMetadata[ErrorCodes.RATE_LIMIT_EXCEEDED].category).toBe(
        ErrorCodeCategory.RATE_LIMITING,
      );
    });

    it('should map server codes correctly', () => {
      const serverCodes = [
        ErrorCodes.INTERNAL_ERROR,
        ErrorCodes.SERVICE_UNAVAILABLE,
        ErrorCodes.AI_GENERATION_FAILED,
        ErrorCodes.SYSTEM_INTERNAL_ERROR,
        ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE,
        ErrorCodes.GAME_STATE_INVALID,
        ErrorCodes.CONFLICT,
      ];

      for (const code of serverCodes) {
        expect(errorCodeMetadata[code].category).toBe(ErrorCodeCategory.SERVER);
      }
    });

    it('should map not found codes correctly', () => {
      const notFoundCodes = [
        ErrorCodes.NOT_FOUND,
        ErrorCodes.GAME_NOT_FOUND,
        ErrorCodes.TENANT_NOT_FOUND,
      ];

      for (const code of notFoundCodes) {
        expect(errorCodeMetadata[code].category).toBe(ErrorCodeCategory.NOT_FOUND);
      }
    });
  });

  describe('Retryability rules', () => {
    it('should mark rate limiting as retryable', () => {
      expect(errorCodeMetadata[ErrorCodes.RATE_LIMIT_EXCEEDED].retryable).toBe(true);
    });

    it('should mark service unavailable as retryable', () => {
      expect(errorCodeMetadata[ErrorCodes.SERVICE_UNAVAILABLE].retryable).toBe(true);
      expect(errorCodeMetadata[ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE].retryable).toBe(true);
      expect(errorCodeMetadata[ErrorCodes.AI_GENERATION_FAILED].retryable).toBe(true);
    });

    it('should not mark token expired as retryable', () => {
      expect(errorCodeMetadata[ErrorCodes.AUTH_TOKEN_EXPIRED].retryable).toBe(false);
    });
  });
});
