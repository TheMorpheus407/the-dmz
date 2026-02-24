import { describe, expect, it } from 'vitest';

import {
  cursorPaginationMetaSchema,
  cursorPaginationSchema,
  dateRangeJsonSchema,
  dateRangeSchema,
  paginationJsonSchema,
  paginationSchema,
} from './index.js';

type JsonSchemaShape = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

describe('common schemas', () => {
  it('coerces and defaults pagination values', () => {
    const result = paginationSchema.parse({
      page: '2',
      limit: '5',
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.sortOrder).toBe('desc');
  });

  it('rejects invalid pagination values', () => {
    expect(() =>
      paginationSchema.parse({
        page: 0,
        limit: 500,
      }),
    ).toThrow();
  });

  it('accepts valid date ranges', () => {
    const result = dateRangeSchema.parse({
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-02T00:00:00.000Z',
    });

    expect(result.start).toBe('2024-01-01T00:00:00.000Z');
  });

  it('rejects invalid date ranges', () => {
    expect(() =>
      dateRangeSchema.parse({
        start: 'not-a-date',
        end: '2024-01-02T00:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('cursor pagination schemas', () => {
  it('parses valid cursor pagination params with defaults', () => {
    const result = cursorPaginationSchema.parse({});
    expect(result.cursor).toBeUndefined();
    expect(result.limit).toBe(20);
  });

  it('parses cursor pagination params with values', () => {
    const result = cursorPaginationSchema.parse({
      cursor: 'abc123xyz',
      limit: '50',
    });
    expect(result.cursor).toBe('abc123xyz');
    expect(result.limit).toBe(50);
  });

  it('rejects invalid cursor pagination params', () => {
    expect(() =>
      cursorPaginationSchema.parse({
        cursor: 123,
        limit: -1,
      }),
    ).toThrow();
  });

  it('rejects limit exceeding maximum', () => {
    expect(() =>
      cursorPaginationSchema.parse({
        limit: 200,
      }),
    ).toThrow();
  });

  it('validates cursor pagination meta', () => {
    const meta = cursorPaginationMetaSchema.parse({
      hasMore: true,
      nextCursor: 'next123',
      total: 100,
    });
    expect(meta.hasMore).toBe(true);
    expect(meta.nextCursor).toBe('next123');
    expect(meta.total).toBe(100);
  });

  it('validates cursor pagination meta without total', () => {
    const meta = cursorPaginationMetaSchema.parse({
      hasMore: false,
      nextCursor: null,
    });
    expect(meta.hasMore).toBe(false);
    expect(meta.nextCursor).toBeNull();
  });

  it('rejects invalid cursor pagination meta', () => {
    expect(() =>
      cursorPaginationMetaSchema.parse({
        hasMore: 'yes',
        nextCursor: 123,
      }),
    ).toThrow();
  });
});

describe('common json schemas', () => {
  it('creates a pagination json schema', () => {
    const schema = paginationJsonSchema as JsonSchemaShape;
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeTruthy();
    const keys = Object.keys(schema.properties ?? {});
    expect(keys).toEqual(expect.arrayContaining(['page', 'limit', 'sortOrder']));
    expect(schema.additionalProperties).toBe(false);
  });

  it('creates a date range json schema', () => {
    const schema = dateRangeJsonSchema as JsonSchemaShape;
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeTruthy();
    expect(schema.required).toEqual(expect.arrayContaining(['start', 'end']));
    expect(schema.additionalProperties).toBe(false);
  });
});
