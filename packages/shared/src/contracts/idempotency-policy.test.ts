import { describe, it, expect } from 'vitest';

import {
  IDEMPOTENCY_KEY_FORMAT,
  IDEMPOTENCY_ERROR_CODES,
  IdempotencyOutcome,
  validateIdempotencyKey,
  generateFingerprint,
  idempotencyRecordSchema,
  idempotencyReplayResponseSchema,
} from './idempotency-policy.js';

describe('idempotency-policy', () => {
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

    it('should generate different fingerprint for different operations', () => {
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

    it('should normalize case of operation', () => {
      const fp1 = generateFingerprint('post', '/api/users', { name: 'John' });
      const fp2 = generateFingerprint('POST', '/api/users', { name: 'John' });
      expect(fp1).toBe(fp2);
    });

    it('should handle numeric body values', () => {
      const fp1 = generateFingerprint('POST', '/api', { count: 42 });
      const fp2 = generateFingerprint('POST', '/api', { count: 42 });
      expect(fp1).toBe(fp2);
    });

    it('should handle boolean body values', () => {
      const fp1 = generateFingerprint('POST', '/api', { active: true });
      const fp2 = generateFingerprint('POST', '/api', { active: true });
      expect(fp1).toBe(fp2);
    });

    it('should handle nested objects', () => {
      const fp1 = generateFingerprint('POST', '/api', { user: { name: 'John' } });
      const fp2 = generateFingerprint('POST', '/api', { user: { name: 'John' } });
      expect(fp1).toBe(fp2);
    });

    it('should handle array body', () => {
      const fp1 = generateFingerprint('POST', '/api', ['a', 'b', 'c']);
      const fp2 = generateFingerprint('POST', '/api', ['a', 'b', 'c']);
      expect(fp1).toBe(fp2);
    });

    it('should handle empty object body', () => {
      const fp1 = generateFingerprint('POST', '/api', {});
      const fp2 = generateFingerprint('POST', '/api', {});
      expect(fp1).toBe(fp2);
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

  describe('idempotencyRecordSchema', () => {
    it('should validate a valid record', () => {
      const record = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        actorId: '550e8400-e29b-41d4-a716-446655440002',
        route: '/api/users',
        operation: 'POST',
        keyHash: 'abc123',
        keyValue: 'key-123',
        fingerprint: 'fp123',
        status: 'in_progress',
        responseBody: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-01-02T00:00:00.000Z',
      };
      const result = idempotencyRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should reject record without operation field', () => {
      const record = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        route: '/api/users',
        keyHash: 'abc123',
        keyValue: 'key-123',
        fingerprint: 'fp123',
        status: 'in_progress',
        responseBody: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-01-02T00:00:00.000Z',
      };
      const result = idempotencyRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it('should not have responseStatus field', () => {
      const record = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '550e8400-e29b-41d4-a716-446655440001',
        actorId: null,
        route: '/api/users',
        operation: 'POST',
        keyHash: 'abc123',
        keyValue: 'key-123',
        fingerprint: 'fp123',
        status: 'in_progress',
        responseBody: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-01-02T00:00:00.000Z',
        responseStatus: 200,
      };
      const result = idempotencyRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
      if (result.success && result.data && 'responseStatus' in result.data) {
        expect.fail('responseStatus should not be in schema');
      }
    });
  });

  describe('idempotencyReplayResponseSchema', () => {
    it('should validate a valid replay response', () => {
      const replay = {
        replay: true,
        outcome: 'replay' as const,
        originalTimestamp: '2024-01-01T00:00:00.000Z',
      };
      const result = idempotencyReplayResponseSchema.safeParse(replay);
      expect(result.success).toBe(true);
    });

    it('should not have originalStatus field', () => {
      const replay = {
        replay: true,
        outcome: 'replay' as const,
        originalTimestamp: '2024-01-01T00:00:00.000Z',
        originalStatus: 200,
      };
      const result = idempotencyReplayResponseSchema.safeParse(replay);
      expect(result.success).toBe(true);
      if (result.success && result.data && 'originalStatus' in result.data) {
        expect.fail('originalStatus should not be in schema');
      }
    });
  });
});
