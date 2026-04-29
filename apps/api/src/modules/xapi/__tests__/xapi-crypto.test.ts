import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { encryptSecret, decryptSecret } from '../xapi-crypto.js';

const TEST_ENCRYPTION_KEY = 'a'.repeat(32);

describe('xapi-crypto', () => {
  beforeEach(() => {
    vi.stubEnv('XAPI_ENCRYPTION_KEY', TEST_ENCRYPTION_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('encryptSecret', () => {
    it('should return a string encrypted with correct format (iv:tag:encrypted)', () => {
      const secret = 'my-secret-token';
      const result = encryptSecret(secret);

      expect(typeof result).toBe('string');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[a-f0-9]{32}$/);
      expect(parts[1]).toMatch(/^[a-f0-9]{32}$/);
      expect(parts[2]).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce different IVs for each encryption', () => {
      const secret = 'my-secret-token';
      const result1 = encryptSecret(secret);
      const result2 = encryptSecret(secret);

      expect(result1).not.toBe(result2);
    });
  });

  describe('decryptSecret', () => {
    it('should return original secret after encryption roundtrip', () => {
      const secret = 'my-secret-token';
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(secret);
    });

    it('should handle various secret formats (base64-like, special chars)', () => {
      const secret = 'sk_live_abc123!@#$%^&*()_+{}[]';
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(secret);
    });

    it('should handle empty string secret', () => {
      const secret = '';
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(secret);
    });

    it('should throw error for malformed input missing colon separators', () => {
      const malformedInput = 'aabbccddeeff00112233445566778899aabbccdd';

      expect(() => decryptSecret(malformedInput)).toThrow('Invalid encrypted secret format');
    });

    it('should throw error for malformed input with only one colon', () => {
      const malformedInput = 'aabbccdd:aabbccdd';

      expect(() => decryptSecret(malformedInput)).toThrow('Invalid encrypted secret format');
    });

    it('should throw error for malformed input with empty parts', () => {
      const malformedInput = ':aabbccdd:aabbccdd';

      expect(() => decryptSecret(malformedInput)).toThrow('Invalid encrypted secret format');
    });

    it('should throw error for malformed input with two colons but empty third part', () => {
      const malformedInput = 'aabbccdd:aabbccdd:';

      expect(() => decryptSecret(malformedInput)).toThrow('Invalid encrypted secret format');
    });

    it('should throw error when key is missing from environment', () => {
      vi.unstubAllEnvs();
      const secret = 'my-secret-token';
      const encrypted = encryptSecret(secret);

      expect(() => decryptSecret(encrypted)).toThrow(
        'XAPI_ENCRYPTION_KEY must be at least 32 characters',
      );
    });

    it('should throw error when key is too short', () => {
      vi.stubEnv('XAPI_ENCRYPTION_KEY', 'short');
      const secret = 'my-secret-token';
      const encrypted = encryptSecret(secret);

      expect(() => decryptSecret(encrypted)).toThrow(
        'XAPI_ENCRYPTION_KEY must be at least 32 characters',
      );
    });
  });
});
