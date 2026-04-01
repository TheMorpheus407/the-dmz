import { describe, expect, it } from 'vitest';

import { CredentialType } from '@the-dmz/shared/auth/api-key-contract';

import { generateSecret, hashSecret, getKeyPrefix } from '../api-key-crypto.js';

describe('api-key-crypto', () => {
  describe('generateSecret', () => {
    it('should include prefix in generated secret', () => {
      const prefix = 'dmz_ak_';
      const secret = generateSecret(prefix, 20);

      expect(secret.startsWith(prefix)).toBe(true);
    });

    it('should generate secrets of correct length', () => {
      const prefix = 'dmz_ak_';
      const length = 40;
      const secret = generateSecret(prefix, length);

      expect(secret.length).toBe(prefix.length + length * 2);
    });

    it('should generate unique secrets', () => {
      const prefix = 'dmz_ak_';
      const secret1 = generateSecret(prefix);
      const secret2 = generateSecret(prefix);

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('hashSecret', () => {
    it('should produce verifiable hashes', async () => {
      const testValue = 'placeholder';
      const hash = await hashSecret(testValue);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2')).toBe(true);
    });

    it('should produce different hashes for same secret', async () => {
      const testValue = 'placeholder';
      const hash1 = await hashSecret(testValue);
      const hash2 = await hashSecret(testValue);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct secret', async () => {
      const testValue = 'placeholder';
      const hash = await hashSecret(testValue);

      const { default: argon2 } = await import('argon2');
      const isValid = await argon2.verify(hash, testValue);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect secret', async () => {
      const testValue = 'placeholder';
      const hash = await hashSecret(testValue);

      const { default: argon2 } = await import('argon2');
      const isValid = await argon2.verify(hash, 'wrong_value');

      expect(isValid).toBe(false);
    });
  });

  describe('getKeyPrefix', () => {
    it('should return correct prefix for PAT', () => {
      const prefix = getKeyPrefix(CredentialType.PAT);

      expect(prefix).toBe('dmz_pat_');
    });

    it('should return correct prefix for API_KEY', () => {
      const prefix = getKeyPrefix(CredentialType.API_KEY);

      expect(prefix).toBe('dmz_ak_');
    });
  });
});
