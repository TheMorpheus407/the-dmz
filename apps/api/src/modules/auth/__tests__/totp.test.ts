import { describe, it, expect } from 'vitest';
import * as OTPAuth from 'otpauth';
import argon2 from 'argon2';

const TEST_CODES = {
  INVALID_TOTP: '000000',
  BACKUP_CODE: 'AB12CD34',
  TEST_CODES_SET_A: ['CODE1AAA', 'CODE2BBB', 'CODE3CCC', 'CODE4DDD'],
  TEST_CODES_SET_B: ['CODE1AAA', 'CODE2BBB', 'CODE3CCC'],
  TEST_CODES_SET_PARALLEL: ['PARA1AAA', 'PARA2BBB', 'PARA3CCC', 'PARA4DDD', 'PARA5EEE'],
  TEST_CODES_SET_POSITION: ['FIRST1AA', 'SECOND2B', 'THIRD3CC', 'FOURTH4D', 'FIFTH5EE'],
} as const;

const TIMING_THRESHOLD_MS = 500;

describe('TOTP Service Unit Tests', () => {
  describe('TOTP Generation', () => {
    it('should generate valid 6-digit TOTP codes', () => {
      const totp = new OTPAuth.TOTP({
        issuer: 'Test DMZ',
        label: 'test@example.com',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const token = totp.generate();

      expect(token).toHaveLength(6);
      expect(token).toMatch(/^\d{6}$/);
    });

    it('should validate correct TOTP codes within window', () => {
      const totp = new OTPAuth.TOTP({
        issuer: 'Test DMZ',
        label: 'test@example.com',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const token = totp.generate();
      const delta = totp.validate({ token, window: 1 });

      expect(delta).not.toBeNull();
    });

    it('should reject invalid TOTP codes', () => {
      const totp = new OTPAuth.TOTP({
        issuer: 'Test DMZ',
        label: 'test@example.com',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const invalidToken = TEST_CODES.INVALID_TOTP;
      const delta = totp.validate({ token: invalidToken, window: 1 });

      expect(delta).toBeNull();
    });
  });

  describe('Backup Code Generation', () => {
    const generateBackupCode = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      return Array.from(bytes)
        .map((b) => chars[b % chars.length])
        .join('');
    };

    it('should generate 8-character backup codes', () => {
      const code = generateBackupCode();
      expect(code).toHaveLength(8);
    });

    it('should only use allowed characters', () => {
      const code = generateBackupCode();
      expect(code).toMatch(/^[A-Z2-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateBackupCode());
      }
      expect(codes.size).toBe(100);
    });
  });

  describe('TOTP URI Generation', () => {
    it('should generate valid otpauth URI', () => {
      const totp = new OTPAuth.TOTP({
        issuer: 'Test DMZ',
        label: 'test@example.com',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const uri = totp.toString();

      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('test%40example.com');
      expect(uri).toContain('issuer=Test%20DMZ');
    });
  });

  describe('Backup Code Hashing and Verification', () => {
    const testCode = TEST_CODES.BACKUP_CODE;

    it('should hash backup codes with argon2id', async () => {
      const hash = await argon2.hash(testCode, {
        type: argon2.argon2id,
        hashLength: 32,
      });

      expect(hash).toBeDefined();
      expect(hash).not.toBe(testCode);
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should verify correct backup code', async () => {
      const hash = await argon2.hash(testCode, {
        type: argon2.argon2id,
        hashLength: 32,
      });

      const isValid = await argon2.verify(hash, testCode);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect backup code', async () => {
      const hash = await argon2.hash(testCode, {
        type: argon2.argon2id,
        hashLength: 32,
      });

      const isValid = await argon2.verify(hash, 'WRONGCODE');
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same code (salted)', async () => {
      const hash1 = await argon2.hash(testCode, {
        type: argon2.argon2id,
        hashLength: 32,
      });
      const hash2 = await argon2.hash(testCode, {
        type: argon2.argon2id,
        hashLength: 32,
      });

      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct code against multiple stored hashes', async () => {
      const codes = TEST_CODES.TEST_CODES_SET_A;
      const hashes = await Promise.all(
        codes.map((code) =>
          argon2.hash(code, {
            type: argon2.argon2id,
            hashLength: 32,
          }),
        ),
      );

      const storedHashes = hashes.map((codeHash) => ({ codeHash }));

      const targetCode = 'CODE3CCC';
      let matchedIndex = -1;
      for (const stored of storedHashes) {
        const isValid = await argon2.verify(stored.codeHash, targetCode);
        if (isValid) {
          matchedIndex = storedHashes.indexOf(stored);
          break;
        }
      }

      expect(matchedIndex).toBe(2);
    });

    it('should not match wrong code against multiple stored hashes', async () => {
      const codes = TEST_CODES.TEST_CODES_SET_B;
      const hashes = await Promise.all(
        codes.map((code) =>
          argon2.hash(code, {
            type: argon2.argon2id,
            hashLength: 32,
          }),
        ),
      );

      const storedHashes = hashes.map((codeHash) => ({ codeHash }));

      const wrongCode = 'WRONGOOO';
      let matchedIndex = -1;
      for (const stored of storedHashes) {
        const isValid = await argon2.verify(stored.codeHash, wrongCode);
        if (isValid) {
          matchedIndex = storedHashes.indexOf(stored);
          break;
        }
      }

      expect(matchedIndex).toBe(-1);
    });

    it('should verify in parallel when checking multiple codes', async () => {
      const codes = TEST_CODES.TEST_CODES_SET_PARALLEL;
      const hashes = await Promise.all(
        codes.map((code) =>
          argon2.hash(code, {
            type: argon2.argon2id,
            hashLength: 32,
          }),
        ),
      );

      const storedHashes = hashes.map((codeHash) => ({ codeHash }));

      const targetCode = 'PARA3CCC';
      const startTime = Date.now();

      const results = await Promise.all(
        storedHashes.map((stored) => argon2.verify(stored.codeHash, targetCode)),
      );
      const foundIndex = results.indexOf(true);

      const elapsed = Date.now() - startTime;

      expect(foundIndex).toBe(2);
      expect(elapsed).toBeLessThan(TIMING_THRESHOLD_MS);
    });

    it('should find correct code regardless of position with parallel verification', async () => {
      const codes = TEST_CODES.TEST_CODES_SET_POSITION;
      const hashes = await Promise.all(
        codes.map((code) =>
          argon2.hash(code, {
            type: argon2.argon2id,
            hashLength: 32,
          }),
        ),
      );

      for (let i = 0; i < codes.length; i++) {
        const results = await Promise.all(hashes.map((hash) => argon2.verify(hash, codes[i]!)));
        const foundIndex = results.indexOf(true);
        expect(foundIndex).toBe(i);
      }
    });
  });
});
