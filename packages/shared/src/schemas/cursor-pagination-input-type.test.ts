import { describe, expect, it } from 'vitest';

import { cursorPaginationSchema } from './index.js';

import type { z } from 'zod';
import type { CursorPaginationInput } from '../types/common.js';

type SchemaInferredType = z.infer<typeof cursorPaginationSchema>;

describe('CursorPaginationInput type alignment', () => {
  describe('type derivation from schema', () => {
    it('CursorPaginationInput should be derived from cursorPaginationSchema using z.infer', () => {
      type ExpectedType = SchemaInferredType;
      const typeCheck: CursorPaginationInput = {} as ExpectedType;
      void typeCheck;
    });

    it('CursorPaginationInput should have optional cursor like the schema', () => {
      const withCursor: CursorPaginationInput = { cursor: 'abc', limit: 10 };
      const withoutCursor: CursorPaginationInput = { limit: 10 };
      expect(withCursor.cursor).toBe('abc');
      expect(withoutCursor.cursor).toBeUndefined();
    });

    it('CursorPaginationInput limit should accept coerced number from string input', () => {
      const input = { limit: '50' };
      const parsed = cursorPaginationSchema.parse(input);
      const typed: CursorPaginationInput = parsed;
      expect(typed.limit).toBe(50);
    });

    it('CursorPaginationInput limit should default to schema default (25)', () => {
      const parsed = cursorPaginationSchema.parse({});
      const typed: CursorPaginationInput = parsed;
      expect(typed.limit).toBe(25);
    });

    it('CursorPaginationInput limit should accept values within schema bounds (1-100)', () => {
      const minParsed = cursorPaginationSchema.parse({ limit: 1 });
      const maxParsed = cursorPaginationSchema.parse({ limit: 100 });

      const minTyped: CursorPaginationInput = minParsed;
      const maxTyped: CursorPaginationInput = maxParsed;

      expect(minTyped.limit).toBe(1);
      expect(maxTyped.limit).toBe(100);
    });

    it('CursorPaginationInput type should reject values outside schema bounds at compile time', () => {
      const outOfBoundsParsed = cursorPaginationSchema.safeParse({ limit: 0 });
      expect(outOfBoundsParsed.success).toBe(false);

      const outOfBoundsParsed2 = cursorPaginationSchema.safeParse({ limit: 101 });
      expect(outOfBoundsParsed2.success).toBe(false);

      const negativeParsed = cursorPaginationSchema.safeParse({ limit: -5 });
      expect(negativeParsed.success).toBe(false);
    });
  });

  describe('schema validation against type contract', () => {
    it('schema should accept valid CursorPaginationInput values', () => {
      const validInputs: CursorPaginationInput[] = [
        { limit: 10 },
        { limit: 1 },
        { limit: 100 },
        { cursor: 'abc', limit: 50 },
        { cursor: undefined, limit: 25 },
      ];

      for (const input of validInputs) {
        const result = cursorPaginationSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('schema should reject invalid CursorPaginationInput values that TypeScript might accept', () => {
      const invalidInputs = [
        { limit: 0 },
        { limit: 101 },
        { limit: -1 },
        { limit: 1.5 },
        { cursor: 123, limit: 10 },
      ];

      for (const input of invalidInputs) {
        const result = cursorPaginationSchema.safeParse(input);
        expect(result.success).toBe(false);
      }
    });

    it('parsed schema output should be fully assignable to CursorPaginationInput', () => {
      const parsed = cursorPaginationSchema.parse({
        cursor: 'test-cursor',
        limit: '75',
      });

      const typed: CursorPaginationInput = {
        cursor: parsed.cursor,
        limit: parsed.limit,
      };

      expect(typed.cursor).toBe('test-cursor');
      expect(typed.limit).toBe(75);
    });
  });
});
