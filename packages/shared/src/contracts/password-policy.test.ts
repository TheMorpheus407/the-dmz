import { describe, it, expect } from 'vitest';

import {
  evaluatePasswordPolicy,
  getCharacterClassesInPassword,
  getTenantPolicy,
  m1PasswordPolicyManifest,
  passwordPolicyManifestSchema,
  PASSWORD_ERROR_CODES,
  PasswordRequirement,
} from './password-policy.js';

describe('password-policy', () => {
  describe('m1PasswordPolicyManifest', () => {
    it('should have valid schema', () => {
      const result = passwordPolicyManifestSchema.safeParse(m1PasswordPolicyManifest);
      expect(result.success).toBe(true);
    });

    it('should have correct defaults', () => {
      expect(m1PasswordPolicyManifest.defaults.minLength).toBe(12);
      expect(m1PasswordPolicyManifest.defaults.maxLength).toBe(128);
      expect(m1PasswordPolicyManifest.defaults.characterClassesRequired).toBe(3);
    });

    it('should have compromised credential enabled by default', () => {
      expect(m1PasswordPolicyManifest.compromisedCredential.enabled).toBe(true);
      expect(m1PasswordPolicyManifest.compromisedCredential.mode).toBe('enabled');
      expect(m1PasswordPolicyManifest.compromisedCredential.degradedMode.behavior).toBe('failOpen');
    });
  });

  describe('evaluatePasswordPolicy', () => {
    const policy = m1PasswordPolicyManifest.defaults;

    it('should reject password that is too short', () => {
      const result = evaluatePasswordPolicy('Short1!', policy);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain(PasswordRequirement.MIN_LENGTH);
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(129);
      const result = evaluatePasswordPolicy(longPassword, policy);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain(PasswordRequirement.MAX_LENGTH);
    });

    it('should reject password missing uppercase', () => {
      const result = evaluatePasswordPolicy('password1!', policy);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain(PasswordRequirement.REQUIRE_UPPERCASE);
    });

    it('should reject password missing lowercase', () => {
      const result = evaluatePasswordPolicy('PASSWORD1!', policy);
      expect(result.valid).toBe(false);
    });

    it('should reject password missing number', () => {
      const result = evaluatePasswordPolicy('Password!!', policy);
      expect(result.valid).toBe(false);
    });

    it('should reject password missing special character', () => {
      const result = evaluatePasswordPolicy('Password1', policy);
      expect(result.valid).toBe(false);
    });

    it('should accept password meeting all requirements', () => {
      const result = evaluatePasswordPolicy('Password1!abc', policy);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should accept password with exactly 3 character classes when special is not required', () => {
      const policyWithoutSpecial = { ...policy, requireSpecial: false };
      const result = evaluatePasswordPolicy('Password123abc', policyWithoutSpecial);
      expect(result.valid).toBe(true);
      expect(result.characterClassesMet).toBe(3);
    });

    it('should accept password with all 4 character classes', () => {
      const result = evaluatePasswordPolicy('Password1!abc', policy);
      expect(result.valid).toBe(true);
      expect(result.characterClassesMet).toBe(4);
    });

    it('should reject password that does not meet characterClassesRequired when some requirements are disabled', () => {
      const policyNoSpecial = {
        ...policy,
        requireSpecial: false,
        characterClassesRequired: 3,
      };
      const result = evaluatePasswordPolicy('abc', policyNoSpecial);
      expect(result.valid).toBe(false);
      expect(result.characterClassesMet).toBe(1);
    });
  });

  describe('getCharacterClassesInPassword', () => {
    it('should detect uppercase', () => {
      const classes = getCharacterClassesInPassword('ABC');
      expect(classes.has('uppercase')).toBe(true);
    });

    it('should detect lowercase', () => {
      const classes = getCharacterClassesInPassword('abc');
      expect(classes.has('lowercase')).toBe(true);
    });

    it('should detect numbers', () => {
      const classes = getCharacterClassesInPassword('123');
      expect(classes.has('number')).toBe(true);
    });

    it('should detect special characters', () => {
      const classes = getCharacterClassesInPassword('!@#');
      expect(classes.has('special')).toBe(true);
    });

    it('should detect multiple character classes', () => {
      const classes = getCharacterClassesInPassword('Abc123!');
      expect(classes.size).toBe(4);
    });
  });

  describe('getTenantPolicy', () => {
    it('should return default policy when no overrides', () => {
      const policy = getTenantPolicy(undefined, m1PasswordPolicyManifest);
      expect(policy.minLength).toBe(12);
      expect(policy.maxLength).toBe(128);
    });

    it('should respect tenant overrides within guardrails', () => {
      const policy = getTenantPolicy(
        { minLength: 16, characterClassesRequired: 4 },
        m1PasswordPolicyManifest,
      );
      expect(policy.minLength).toBe(16);
      expect(policy.characterClassesRequired).toBe(4);
    });

    it('should clamp tenant overrides to guardrails', () => {
      const policy = getTenantPolicy({ minLength: 4 }, m1PasswordPolicyManifest);
      expect(policy.minLength).toBe(8);
    });

    it('should clamp max overrides to guardrails', () => {
      const policy = getTenantPolicy({ minLength: 200 }, m1PasswordPolicyManifest);
      expect(policy.minLength).toBe(64);
    });
  });

  describe('PASSWORD_ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(PASSWORD_ERROR_CODES.AUTH_PASSWORD_TOO_SHORT).toBe('AUTH_PASSWORD_TOO_SHORT');
      expect(PASSWORD_ERROR_CODES.AUTH_PASSWORD_TOO_LONG).toBe('AUTH_PASSWORD_TOO_LONG');
      expect(PASSWORD_ERROR_CODES.AUTH_PASSWORD_TOO_WEAK).toBe('AUTH_PASSWORD_TOO_WEAK');
      expect(PASSWORD_ERROR_CODES.AUTH_PASSWORD_COMPROMISED).toBe('AUTH_PASSWORD_COMPROMISED');
      expect(PASSWORD_ERROR_CODES.AUTH_PASSWORD_POLICY_VIOLATION).toBe(
        'AUTH_PASSWORD_POLICY_VIOLATION',
      );
    });
  });
});
