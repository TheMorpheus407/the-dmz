import { describe, expect, it } from 'vitest';

import { createTestId } from './test-id.js';

describe('createTestId', () => {
  describe('without prefix', () => {
    it('returns a string', () => {
      const id = createTestId();
      expect(typeof id).toBe('string');
    });

    it('returns an 8-character ID', () => {
      const id = createTestId();
      expect(id).toHaveLength(8);
    });

    it('returns only hexadecimal characters', () => {
      const id = createTestId();
      expect(id).toMatch(/^[0-9a-f]{8}$/);
    });

    it('returns unique IDs across multiple calls', () => {
      const ids = new Set(Array.from({ length: 100 }, () => createTestId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('with prefix', () => {
    it('returns a string', () => {
      const id = createTestId('email');
      expect(typeof id).toBe('string');
    });

    it('returns ID with prefix separated by hyphen', () => {
      const id = createTestId('email');
      expect(id).toMatch(/^email-[0-9a-f]{8}$/);
    });

    it('includes the exact prefix provided', () => {
      const id = createTestId('tenant');
      expect(id.startsWith('tenant-')).toBe(true);
    });

    it('returns 8 characters after the hyphen', () => {
      const id = createTestId('prefix');
      const afterHyphen = id.split('-')[1];
      expect(afterHyphen).toHaveLength(8);
    });

    it('generates unique IDs even with the same prefix', () => {
      const ids = new Set(Array.from({ length: 100 }, () => createTestId('same_prefix')));
      expect(ids.size).toBe(100);
    });

    it('handles prefixes with underscores', () => {
      const id = createTestId('test_user');
      expect(id).toMatch(/^test_user-[0-9a-f]{8}$/);
    });

    it('handles numeric-like prefixes', () => {
      const id = createTestId('123');
      expect(id).toMatch(/^123-[0-9a-f]{8}$/);
    });
  });

  describe('format consistency', () => {
    it('does not include full UUID (only first 8 characters)', () => {
      const id = createTestId();
      expect(id).not.toMatch(/-/);
      expect(id).toHaveLength(8);
    });

    it('returns lowercase hexadecimal characters', () => {
      const ids = Array.from({ length: 50 }, () => createTestId());
      ids.forEach((id) => {
        expect(id).toBe(id.toLowerCase());
      });
    });
  });
});
