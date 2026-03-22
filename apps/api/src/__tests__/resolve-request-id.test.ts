import { describe, expect, it } from 'vitest';

import { resolveRequestId } from '../shared/utils/request-id.js';

describe('resolveRequestId', () => {
  describe('valid input', () => {
    it('accepts simple alphanumeric ID', () => {
      expect(resolveRequestId('abc123')).toBe('abc123');
    });

    it('accepts ID with dashes', () => {
      expect(resolveRequestId('abc-123-def')).toBe('abc-123-def');
    });

    it('accepts ID with underscores', () => {
      expect(resolveRequestId('abc_123_def')).toBe('abc_123_def');
    });

    it('accepts mixed alphanumeric with dashes and underscores', () => {
      expect(resolveRequestId('abc-123_DEF_ghi')).toBe('abc-123_DEF_ghi');
    });

    it('accepts UUID format', () => {
      expect(resolveRequestId('550e8400-e29b-41d4-a716-446655440000')).toBe(
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });

    it('accepts maximum length (128 characters)', () => {
      const maxLengthId = 'a'.repeat(128);
      expect(resolveRequestId(maxLengthId)).toBe(maxLengthId);
    });

    it('accepts single element array with valid ID', () => {
      expect(resolveRequestId(['valid-id'])).toBe('valid-id');
    });

    it('returns first element of multi-element array', () => {
      expect(resolveRequestId(['first-id', 'second-id'])).toBe('first-id');
    });
  });

  describe('invalid input - CRLF injection', () => {
    it('rejects ID with CRLF sequence', () => {
      expect(resolveRequestId('id\r\nwith-crlf')).toBeUndefined();
    });

    it('rejects ID with LF only', () => {
      expect(resolveRequestId('id\nwith-lf')).toBeUndefined();
    });

    it('rejects ID with CR only', () => {
      expect(resolveRequestId('id\rwith-cr')).toBeUndefined();
    });

    it('rejects ID with CRLF in array', () => {
      expect(resolveRequestId(['id\r\nwith-crlf'])).toBeUndefined();
    });
  });

  describe('invalid input - length', () => {
    it('rejects ID exceeding 128 characters', () => {
      const overLengthId = 'a'.repeat(129);
      expect(resolveRequestId(overLengthId)).toBeUndefined();
    });

    it('rejects empty string', () => {
      expect(resolveRequestId('')).toBeUndefined();
    });
  });

  describe('invalid input - special characters', () => {
    it('rejects ID with spaces', () => {
      expect(resolveRequestId('id with spaces')).toBeUndefined();
    });

    it('rejects ID with angle brackets', () => {
      expect(resolveRequestId('id<with>brackets')).toBeUndefined();
    });

    it('rejects ID with quotes', () => {
      expect(resolveRequestId('id"with"quotes')).toBeUndefined();
    });

    it('rejects ID with backticks', () => {
      expect(resolveRequestId('id`with`backticks')).toBeUndefined();
    });

    it('rejects ID with equals sign', () => {
      expect(resolveRequestId('id=with=equals')).toBeUndefined();
    });

    it('rejects ID with ampersand', () => {
      expect(resolveRequestId('id&with&ampersand')).toBeUndefined();
    });

    it('rejects ID with percent', () => {
      expect(resolveRequestId('id%with%percent')).toBeUndefined();
    });

    it('rejects ID with null byte', () => {
      expect(resolveRequestId('id\x00with\x00null')).toBeUndefined();
    });
  });

  describe('invalid input - arrays', () => {
    it('rejects empty array', () => {
      expect(resolveRequestId([])).toBeUndefined();
    });

    it('rejects array with invalid first element', () => {
      expect(resolveRequestId(['invalid\r\n', 'valid'])).toBeUndefined();
    });
  });

  describe('invalid input - undefined/null', () => {
    it('rejects undefined', () => {
      expect(resolveRequestId(undefined)).toBeUndefined();
    });
  });
});
