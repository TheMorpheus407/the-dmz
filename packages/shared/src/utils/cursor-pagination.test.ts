import { describe, it, expect } from 'vitest';

import {
  encodeCursor,
  decodeCursor,
  parseCursorPaginationParams,
  buildCursorPaginationMeta,
  validateCursorPaginationMeta,
  clampLimit,
  getLimitFromInput,
  DEFAULT_PAGINATION_LIMIT,
  MAX_PAGINATION_LIMIT,
  MIN_PAGINATION_LIMIT,
} from './cursor-pagination.js';

describe('cursor-pagination', () => {
  describe('encodeCursor', () => {
    it('encodes a simple cursor payload', () => {
      const cursor = encodeCursor({ offset: 0 });
      expect(cursor).toBeTruthy();
      expect(typeof cursor).toBe('string');
    });

    it('encodes cursor with sort values', () => {
      const cursor = encodeCursor({ offset: 20, sortValues: ['2024-01-01', 'uuid-123'] });
      expect(cursor).toBeTruthy();
    });
  });

  describe('decodeCursor', () => {
    it('decodes a valid cursor', () => {
      const encoded = encodeCursor({ offset: 20 });
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual({ offset: 20, sortValues: [] });
    });

    it('decodes cursor with sort values', () => {
      const original = { offset: 40, sortValues: ['2024-01-01', 'abc'] };
      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(original);
    });

    it('returns null for invalid base64', () => {
      const result = decodeCursor('not-valid-base64!!!');
      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const invalid = Buffer.from('not-json').toString('base64url');
      const result = decodeCursor(invalid);
      expect(result).toBeNull();
    });

    it('returns null for negative offset', () => {
      const encoded = encodeCursor({ offset: -1 });
      const result = decodeCursor(encoded);
      expect(result).toBeNull();
    });
  });

  describe('parseCursorPaginationParams', () => {
    it('parses valid pagination params with defaults', () => {
      const result = parseCursorPaginationParams({});
      expect(result.input).toEqual({ cursor: undefined, limit: DEFAULT_PAGINATION_LIMIT });
    });

    it('parses valid pagination params with cursor and limit', () => {
      const result = parseCursorPaginationParams({ cursor: 'abc123', limit: 50 });
      expect(result.input).toEqual({ cursor: 'abc123', limit: 50 });
    });

    it('coerces string limit to number', () => {
      const result = parseCursorPaginationParams({ limit: '25' });
      expect(result.input?.limit).toBe(25);
    });

    it('returns error for invalid params', () => {
      const result = parseCursorPaginationParams({ limit: -1 });
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('PAGINATION_INVALID_PARAMS');
    });

    it('returns error when limit exceeds max', () => {
      const result = parseCursorPaginationParams({ limit: 200 });
      expect(result.error).toBeDefined();
    });
  });

  describe('buildCursorPaginationMeta', () => {
    it('builds meta with hasMore true', () => {
      const meta = buildCursorPaginationMeta(true, 0, 20, 100);
      expect(meta.hasMore).toBe(true);
      expect(meta.nextCursor).toBeTruthy();
      expect(meta.total).toBe(100);
    });

    it('builds meta with hasMore false', () => {
      const meta = buildCursorPaginationMeta(false, 80, 20, 100);
      expect(meta.hasMore).toBe(false);
      expect(meta.nextCursor).toBeNull();
      expect(meta.total).toBe(100);
    });

    it('omits total when not provided', () => {
      const meta = buildCursorPaginationMeta(true, 0, 20);
      expect(meta.total).toBeUndefined();
    });

    it('includes sort values in cursor', () => {
      const meta = buildCursorPaginationMeta(true, 0, 20, undefined, ['2024-01-01']);
      expect(meta.nextCursor).toBeTruthy();
      const decoded = decodeCursor(meta.nextCursor!);
      expect(decoded?.sortValues).toEqual(['2024-01-01']);
    });
  });

  describe('validateCursorPaginationMeta', () => {
    it('validates correct meta', () => {
      const meta = { hasMore: true, nextCursor: 'abc', total: 100 };
      expect(validateCursorPaginationMeta(meta)).toBe(true);
    });

    it('validates meta without total', () => {
      const meta = { hasMore: false, nextCursor: null };
      expect(validateCursorPaginationMeta(meta)).toBe(true);
    });

    it('rejects invalid meta', () => {
      const meta = { hasMore: 'yes', nextCursor: 123 };
      expect(validateCursorPaginationMeta(meta)).toBe(false);
    });
  });

  describe('clampLimit', () => {
    it('returns default limit for undefined', () => {
      expect(clampLimit(20)).toBe(20);
    });

    it('clamps below minimum to minimum', () => {
      expect(clampLimit(0)).toBe(MIN_PAGINATION_LIMIT);
      expect(clampLimit(-5)).toBe(MIN_PAGINATION_LIMIT);
    });

    it('clamps above maximum to maximum', () => {
      expect(clampLimit(200)).toBe(MAX_PAGINATION_LIMIT);
      expect(clampLimit(999)).toBe(MAX_PAGINATION_LIMIT);
    });

    it('returns valid limits unchanged', () => {
      expect(clampLimit(50)).toBe(50);
    });
  });

  describe('getLimitFromInput', () => {
    it('clamps limit from input', () => {
      expect(getLimitFromInput({ limit: 150 })).toBe(MAX_PAGINATION_LIMIT);
      expect(getLimitFromInput({ limit: 0 })).toBe(MIN_PAGINATION_LIMIT);
      expect(getLimitFromInput({ limit: 30 })).toBe(30);
    });
  });
});
