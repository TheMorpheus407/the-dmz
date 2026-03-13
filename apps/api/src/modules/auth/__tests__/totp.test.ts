import { describe, it, expect } from 'vitest';
import * as OTPAuth from 'otpauth';

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

      const invalidToken = '000000';
      const delta = totp.validate({ token: invalidToken, window: 1 });

      expect(delta).toBeNull();
    });
  });

  describe('Backup Code Generation', () => {
    const generateBackupCode = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
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
});
