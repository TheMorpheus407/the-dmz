import { describe, it, expect } from 'vitest';

import {
  IDEMPOTENCY_KEY_FORMAT,
  IDEMPOTENCY_ERROR_CODES,
  IdempotencyOutcome,
  validateIdempotencyKey,
  generateFingerprint,
  isIdempotencyRequiredForMethod,
  m1IdempotencyPolicyManifest,
  idempotencyPolicyManifestSchema,
} from './idempotency-policy.js';

describe('idempotency-policy', () => {
  describe('m1IdempotencyPolicyManifest', () => {
    it('should have valid schema', () => {
      const result = idempotencyPolicyManifestSchema.safeParse(m1IdempotencyPolicyManifest);
      expect(result.success).toBe(true);
    });

    it('should have correct key constraints', () => {
      expect(m1IdempotencyPolicyManifest.keyConstraints.minLength).toBe(16);
      expect(m1IdempotencyPolicyManifest.keyConstraints.maxLength).toBe(64);
      expect(m1IdempotencyPolicyManifest.keyConstraints.requiredForMethods).toContain('POST');
    });

    it('should have correct header contract', () => {
      expect(m1IdempotencyPolicyManifest.headerContract.idempotencyKeyHeader).toBe(
        'Idempotency-Key',
      );
      expect(m1IdempotencyPolicyManifest.headerContract.replayHeader).toBe('X-Idempotency-Replay');
      expect(m1IdempotencyPolicyManifest.headerContract.outcomeHeader).toBe(
        'X-Idempotency-Outcome',
      );
    });

    it('should have all outcome definitions', () => {
      expect(m1IdempotencyPolicyManifest.outcomes.miss).toBeDefined();
      expect(m1IdempotencyPolicyManifest.outcomes.replay).toBeDefined();
      expect(m1IdempotencyPolicyManifest.outcomes.conflict).toBeDefined();
      expect(m1IdempotencyPolicyManifest.outcomes.inProgress).toBeDefined();
    });

    it('should have all error codes defined', () => {
      expect(
        m1IdempotencyPolicyManifest.errorCodes[IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED],
      ).toBeDefined();
      expect(
        m1IdempotencyPolicyManifest.errorCodes[
          IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT
        ],
      ).toBeDefined();
      expect(
        m1IdempotencyPolicyManifest.errorCodes[IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_CONFLICT],
      ).toBeDefined();
      expect(
        m1IdempotencyPolicyManifest.errorCodes[IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_EXPIRED],
      ).toBeDefined();
      expect(
        m1IdempotencyPolicyManifest.errorCodes[IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS],
      ).toBeDefined();
    });
  });

  describe('validateIdempotencyKey', () => {
    it('should accept valid key', () => {
      const result = validateIdempotencyKey('abc123xyz-valid_key16');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept key at min length', () => {
      const key = 'a'.repeat(IDEMPOTENCY_KEY_FORMAT.minLength);
      const result = validateIdempotencyKey(key);
      expect(result.valid).toBe(true);
    });

    it('should accept key at max length', () => {
      const key = 'a'.repeat(IDEMPOTENCY_KEY_FORMAT.maxLength);
      const result = validateIdempotencyKey(key);
      expect(result.valid).toBe(true);
    });

    it('should reject key shorter than min length', () => {
      const key = 'abc';
      const result = validateIdempotencyKey(key);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT);
    });

    it('should reject key longer than max length', () => {
      const key = 'a'.repeat(100);
      const result = validateIdempotencyKey(key);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT);
    });

    it('should reject key with invalid characters', () => {
      const result = validateIdempotencyKey('invalid key with spaces');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT);
    });

    it('should reject key with special characters not in allowed set', () => {
      const result = validateIdempotencyKey('key@with#special$chars!');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_INVALID_FORMAT);
    });

    it('should reject empty key', () => {
      const result = validateIdempotencyKey('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(IDEMPOTENCY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);
    });

    it('should reject null/undefined key', () => {
      expect(validateIdempotencyKey(null as unknown as string).valid).toBe(false);
      expect(validateIdempotencyKey(undefined as unknown as string).valid).toBe(false);
    });

    it('should accept alphanumeric with underscore and hyphen', () => {
      const result = validateIdempotencyKey('ValidKey_123-456');
      expect(result.valid).toBe(true);
    });
  });

  describe('generateFingerprint', () => {
    it('should generate same fingerprint for identical requests', () => {
      const fp1 = generateFingerprint('POST', '/api/users', {
        name: 'John',
        email: 'john@example.com',
      });
      const fp2 = generateFingerprint('POST', '/api/users', {
        name: 'John',
        email: 'john@example.com',
      });
      expect(fp1).toBe(fp2);
    });

    it('should generate same fingerprint for same object with different key order', () => {
      const fp1 = generateFingerprint('POST', '/api/users', {
        name: 'John',
        email: 'john@example.com',
      });
      const fp2 = generateFingerprint('POST', '/api/users', {
        email: 'john@example.com',
        name: 'John',
      });
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprint for different methods', () => {
      const fp1 = generateFingerprint('POST', '/api/users', { name: 'John' });
      const fp2 = generateFingerprint('PUT', '/api/users', { name: 'John' });
      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprint for different routes', () => {
      const fp1 = generateFingerprint('POST', '/api/users', { name: 'John' });
      const fp2 = generateFingerprint('POST', '/api/groups', { name: 'John' });
      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprint for different payloads', () => {
      const fp1 = generateFingerprint('POST', '/api/users', { name: 'John' });
      const fp2 = generateFingerprint('POST', '/api/users', { name: 'Jane' });
      expect(fp1).not.toBe(fp2);
    });

    it('should handle empty body', () => {
      const fp1 = generateFingerprint('POST', '/api/users', null);
      const fp2 = generateFingerprint('POST', '/api/users', null);
      expect(fp1).toBe(fp2);
    });

    it('should handle string body', () => {
      const fp1 = generateFingerprint('POST', '/api/users', 'string body');
      const fp2 = generateFingerprint('POST', '/api/users', 'string body');
      expect(fp1).toBe(fp2);
    });

    it('should normalize case of method', () => {
      const fp1 = generateFingerprint('post', '/api/users', { name: 'John' });
      const fp2 = generateFingerprint('POST', '/api/users', { name: 'John' });
      expect(fp1).toBe(fp2);
    });
  });

  describe('isIdempotencyRequiredForMethod', () => {
    it('should return true for POST', () => {
      expect(isIdempotencyRequiredForMethod('POST')).toBe(true);
    });

    it('should return true for PUT', () => {
      expect(isIdempotencyRequiredForMethod('PUT')).toBe(true);
    });

    it('should return true for PATCH', () => {
      expect(isIdempotencyRequiredForMethod('PATCH')).toBe(true);
    });

    it('should return false for GET', () => {
      expect(isIdempotencyRequiredForMethod('GET')).toBe(false);
    });

    it('should return false for DELETE', () => {
      expect(isIdempotencyRequiredForMethod('DELETE')).toBe(false);
    });

    it('should handle lowercase method', () => {
      expect(isIdempotencyRequiredForMethod('post')).toBe(true);
    });
  });

  describe('IdempotencyOutcome', () => {
    it('should have all expected outcomes', () => {
      expect(IdempotencyOutcome.MISS).toBe('miss');
      expect(IdempotencyOutcome.REPLAY).toBe('replay');
      expect(IdempotencyOutcome.CONFLICT).toBe('conflict');
      expect(IdempotencyOutcome.IN_PROGRESS).toBe('in_progress');
    });
  });
});
