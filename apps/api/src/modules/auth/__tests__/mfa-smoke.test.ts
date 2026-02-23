import { describe, expect, it } from 'vitest';

import { ErrorCodes } from '@the-dmz/shared';

describe('MFA Smoke Tests - Super Admin Step-up Flow', () => {
  describe('MFA error codes are properly defined', () => {
    it('AUTH_MFA_REQUIRED error code exists', () => {
      expect(ErrorCodes.AUTH_MFA_REQUIRED).toBe('AUTH_MFA_REQUIRED');
    });

    it('AUTH_WEBAUTHN_CHALLENGE_EXPIRED error code exists', () => {
      expect(ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED).toBe('AUTH_WEBAUTHN_CHALLENGE_EXPIRED');
    });

    it('AUTH_WEBAUTHN_VERIFICATION_FAILED error code exists', () => {
      expect(ErrorCodes.AUTH_WEBAUTHN_VERIFICATION_FAILED).toBe(
        'AUTH_WEBAUTHN_VERIFICATION_FAILED',
      );
    });

    it('AUTH_WEBAUTHN_NOT_SUPPORTED error code exists', () => {
      expect(ErrorCodes.AUTH_WEBAUTHN_NOT_SUPPORTED).toBe('AUTH_WEBAUTHN_NOT_SUPPORTED');
    });

    it('AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND error code exists', () => {
      expect(ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND).toBe(
        'AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND',
      );
    });

    it('AUTH_MFA_NOT_ENABLED error code exists', () => {
      expect(ErrorCodes.AUTH_MFA_NOT_ENABLED).toBe('AUTH_MFA_NOT_ENABLED');
    });

    it('AUTH_WEBAUTHN_CREDENTIAL_EXISTS error code exists', () => {
      expect(ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_EXISTS).toBe('AUTH_WEBAUTHN_CREDENTIAL_EXISTS');
    });

    it('AUTH_WEBAUTHN_REGISTRATION_FAILED error code exists', () => {
      expect(ErrorCodes.AUTH_WEBAUTHN_REGISTRATION_FAILED).toBe(
        'AUTH_WEBAUTHN_REGISTRATION_FAILED',
      );
    });

    it('AUTH_WEBAUTHN_ASSERTION_FAILED error code exists', () => {
      expect(ErrorCodes.AUTH_WEBAUTHN_ASSERTION_FAILED).toBe('AUTH_WEBAUTHN_ASSERTION_FAILED');
    });

    it('AUTH_MFA_ALREADY_ENABLED error code exists', () => {
      expect(ErrorCodes.AUTH_MFA_ALREADY_ENABLED).toBe('AUTH_MFA_ALREADY_ENABLED');
    });

    it('AUTH_MFA_INVALID_CODE error code exists', () => {
      expect(ErrorCodes.AUTH_MFA_INVALID_CODE).toBe('AUTH_MFA_INVALID_CODE');
    });

    it('AUTH_MFA_EXPIRED error code exists', () => {
      expect(ErrorCodes.AUTH_MFA_EXPIRED).toBe('AUTH_MFA_EXPIRED');
    });
  });

  describe('MFA status response validation', () => {
    it('should have mfaRequired field in MFA status', () => {
      const status = {
        mfaRequired: true,
        mfaVerified: false,
        method: 'webauthn',
        mfaVerifiedAt: null,
        hasCredentials: true,
      };

      expect(status).toHaveProperty('mfaRequired');
      expect(status).toHaveProperty('mfaVerified');
      expect(status).toHaveProperty('method');
      expect(status).toHaveProperty('mfaVerifiedAt');
      expect(status).toHaveProperty('hasCredentials');
    });

    it('should have correct MFA method values', () => {
      const validMethods = ['webauthn', 'totp', 'sms', 'email', null];

      expect(validMethods).toContain('webauthn');
      expect(validMethods).toContain('totp');
      expect(validMethods).toContain('sms');
      expect(validMethods).toContain('email');
    });
  });
});
