import { describe, expect, it } from 'vitest';

import { ErrorCodes } from '@the-dmz/shared/constants';

import { AppError } from '../../../shared/middleware/error-handler.js';
import {
  EmailIntegrationNotFoundError,
  EmailConfigInvalidError,
  EmailAuthPostureInsufficientError,
  EmailDkimKeyTooShortError,
  EmailTenantIsolationViolationError,
  EmailStatusTransitionInvalidError,
  EmailValidationFailedError,
} from '../email.errors.js';

describe('email error classes', () => {
  describe('EmailIntegrationNotFoundError', () => {
    it('extends AppError and Error', () => {
      const error = new EmailIntegrationNotFoundError('test-id');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new EmailIntegrationNotFoundError('test-id');
      expect(error.code).toBe(ErrorCodes.EMAIL_CONFIG_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Email integration with id "test-id" not found');
    });

    it('has correct name', () => {
      const error = new EmailIntegrationNotFoundError('test-id');
      expect(error.name).toBe('EmailIntegrationNotFoundError');
    });

    it('has a stack trace', () => {
      const error = new EmailIntegrationNotFoundError('test-id');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EmailIntegrationNotFoundError');
    });
  });

  describe('EmailConfigInvalidError', () => {
    it('extends AppError and Error', () => {
      const error = new EmailConfigInvalidError('Invalid config');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new EmailConfigInvalidError('Invalid config');
      expect(error.code).toBe(ErrorCodes.EMAIL_CONFIG_INVALID);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid config');
    });

    it('has correct name', () => {
      const error = new EmailConfigInvalidError('Invalid config');
      expect(error.name).toBe('EmailConfigInvalidError');
    });

    it('has a stack trace', () => {
      const error = new EmailConfigInvalidError('Invalid config');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EmailConfigInvalidError');
    });
  });

  describe('EmailAuthPostureInsufficientError', () => {
    it('extends AppError and Error', () => {
      const error = new EmailAuthPostureInsufficientError('Insufficient posture');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new EmailAuthPostureInsufficientError('Insufficient posture');
      expect(error.code).toBe(ErrorCodes.EMAIL_AUTH_POSTURE_INSUFFICIENT);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Insufficient posture');
    });

    it('has correct name', () => {
      const error = new EmailAuthPostureInsufficientError('Insufficient posture');
      expect(error.name).toBe('EmailAuthPostureInsufficientError');
    });

    it('has a stack trace', () => {
      const error = new EmailAuthPostureInsufficientError('Insufficient posture');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EmailAuthPostureInsufficientError');
    });
  });

  describe('EmailDkimKeyTooShortError', () => {
    it('extends AppError and Error', () => {
      const error = new EmailDkimKeyTooShortError(512, 1024);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new EmailDkimKeyTooShortError(512, 1024);
      expect(error.code).toBe(ErrorCodes.EMAIL_DKIM_KEY_TOO_SHORT);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('DKIM key size 512 is below minimum 1024 bits');
    });

    it('has correct name', () => {
      const error = new EmailDkimKeyTooShortError(512, 1024);
      expect(error.name).toBe('EmailDkimKeyTooShortError');
    });

    it('has a stack trace', () => {
      const error = new EmailDkimKeyTooShortError(512, 1024);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EmailDkimKeyTooShortError');
    });
  });

  describe('EmailTenantIsolationViolationError', () => {
    it('extends AppError and Error', () => {
      const error = new EmailTenantIsolationViolationError('Cross-tenant access');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new EmailTenantIsolationViolationError('Cross-tenant access');
      expect(error.code).toBe(ErrorCodes.EMAIL_TENANT_ISOLATION_VIOLATED);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Cross-tenant access');
    });

    it('has correct name', () => {
      const error = new EmailTenantIsolationViolationError('Cross-tenant access');
      expect(error.name).toBe('EmailTenantIsolationViolationError');
    });

    it('has a stack trace', () => {
      const error = new EmailTenantIsolationViolationError('Cross-tenant access');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EmailTenantIsolationViolationError');
    });
  });

  describe('EmailStatusTransitionInvalidError', () => {
    it('extends AppError and Error', () => {
      const error = new EmailStatusTransitionInvalidError('pending', 'active');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new EmailStatusTransitionInvalidError('pending', 'active');
      expect(error.code).toBe(ErrorCodes.EMAIL_STATUS_TRANSITION_INVALID);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Cannot transition from pending to active');
    });

    it('has correct name', () => {
      const error = new EmailStatusTransitionInvalidError('pending', 'active');
      expect(error.name).toBe('EmailStatusTransitionInvalidError');
    });

    it('has a stack trace', () => {
      const error = new EmailStatusTransitionInvalidError('pending', 'active');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EmailStatusTransitionInvalidError');
    });

    it('handles same from/to status', () => {
      const error = new EmailStatusTransitionInvalidError('active', 'active');
      expect(error.message).toBe('Cannot transition from active to active');
    });
  });

  describe('EmailValidationFailedError', () => {
    it('extends AppError and Error', () => {
      const error = new EmailValidationFailedError([
        { reason: 'invalid', message: 'SPF check failed' },
      ]);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct code, statusCode, and message', () => {
      const error = new EmailValidationFailedError([
        { reason: 'invalid', message: 'SPF check failed' },
      ]);
      expect(error.code).toBe(ErrorCodes.EMAIL_VALIDATION_FAILED);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Email validation failed: SPF check failed');
    });

    it('has correct name', () => {
      const error = new EmailValidationFailedError([
        { reason: 'invalid', message: 'SPF check failed' },
      ]);
      expect(error.name).toBe('EmailValidationFailedError');
    });

    it('has a stack trace', () => {
      const error = new EmailValidationFailedError([
        { reason: 'invalid', message: 'SPF check failed' },
      ]);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EmailValidationFailedError');
    });

    it('stores failures in details', () => {
      const failures = [
        { reason: 'invalid', message: 'SPF check failed' },
        { reason: 'missing', message: 'DKIM record not found' },
      ];
      const error = new EmailValidationFailedError(failures);
      expect(error.details).toBeDefined();
      expect(error.details?.failures).toEqual(failures);
    });

    it('handles null failures', () => {
      const error = new EmailValidationFailedError(null);
      expect(error.message).toBe('Email validation failed: ');
      expect(error.details?.failures).toEqual([]);
    });

    it('handles undefined failures', () => {
      const error = new EmailValidationFailedError(undefined);
      expect(error.message).toBe('Email validation failed: ');
      expect(error.details?.failures).toEqual([]);
    });

    it('handles empty failures array', () => {
      const error = new EmailValidationFailedError([]);
      expect(error.message).toBe('Email validation failed: ');
      expect(error.details?.failures).toEqual([]);
    });

    it('handles single failure', () => {
      const error = new EmailValidationFailedError([
        { reason: 'invalid', message: 'SPF check failed' },
      ]);
      expect(error.message).toBe('Email validation failed: SPF check failed');
      expect(error.details?.failures).toHaveLength(1);
    });

    it('handles multiple failures', () => {
      const error = new EmailValidationFailedError([
        { reason: 'invalid', message: 'SPF check failed' },
        { reason: 'missing', message: 'DKIM record not found' },
        { reason: 'invalid', message: 'DMARC policy not found' },
      ]);
      expect(error.message).toBe(
        'Email validation failed: SPF check failed, DKIM record not found, DMARC policy not found',
      );
      expect(error.details?.failures).toHaveLength(3);
    });
  });
});
