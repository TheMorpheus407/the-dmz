import { describe, expect, it } from 'vitest';

import { isAllowedEntity } from '../allowlist-validator.js';

describe('allowlist-validator', () => {
  describe('isAllowedEntity', () => {
    it('returns true for entities on the allowlist', () => {
      expect(isAllowedEntity('morpheus')).toBe(true);
      expect(isAllowedEntity('Nexion Industries')).toBe(true);
      expect(isAllowedEntity('kade morrow')).toBe(true);
    });

    it('returns true for generic title case words', () => {
      expect(isAllowedEntity('Security Team')).toBe(true);
      expect(isAllowedEntity('Records Desk')).toBe(true);
      expect(isAllowedEntity('Relay Office')).toBe(true);
    });

    it('returns false for real-world entities not on allowlist', () => {
      expect(isAllowedEntity('John Smith')).toBe(false);
      expect(isAllowedEntity('Google')).toBe(false);
    });

    it('returns true for empty string', () => {
      expect(isAllowedEntity('')).toBe(true);
    });

    it('is case insensitive for allowlist matching', () => {
      expect(isAllowedEntity('MORPHEUS')).toBe(true);
      expect(isAllowedEntity('KADE MORROW')).toBe(true);
    });
  });
});
