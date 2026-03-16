import { describe, expect, it } from 'vitest';

import {
  generateSecurePassword,
  validatePasswordStrength,
} from '../../../shared/utils/password.js';

describe('password utilities', () => {
  describe('generateSecurePassword', () => {
    it('generates password of default length', () => {
      const password = generateSecurePassword();
      expect(password.length).toBe(16);
    });

    it('generates password of specified length', () => {
      const password = generateSecurePassword(24);
      expect(password.length).toBe(24);
    });

    it('contains at least one lowercase letter', () => {
      const password = generateSecurePassword();
      expect(password).toMatch(/[a-z]/);
    });

    it('contains at least one uppercase letter', () => {
      const password = generateSecurePassword();
      expect(password).toMatch(/[A-Z]/);
    });

    it('contains at least one number', () => {
      const password = generateSecurePassword();
      expect(password).toMatch(/[0-9]/);
    });

    it('contains at least one special character', () => {
      const password = generateSecurePassword();
      expect(password).toMatch(/[!@#$%^&*]/);
    });

    it('generates unique passwords', () => {
      const passwords = new Set<string>();
      for (let i = 0; i < 100; i++) {
        passwords.add(generateSecurePassword());
      }
      expect(passwords.size).toBe(100);
    });
  });

  describe('validatePasswordStrength', () => {
    it('accepts strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects short password', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('rejects password without lowercase', () => {
      const result = validatePasswordStrength('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('rejects password without uppercase', () => {
      const result = validatePasswordStrength('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('rejects password without numbers', () => {
      const result = validatePasswordStrength('NoNumbers!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('rejects password without special characters', () => {
      const result = validatePasswordStrength('NoSpecial123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('returns multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
