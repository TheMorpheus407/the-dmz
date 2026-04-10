import { describe, expect, it } from 'vitest';

import { booleanFromString } from './index.js';

describe('booleanFromString', () => {
  it('is exported from the shared package public API', () => {
    expect(typeof booleanFromString).toBe('function');
  });

  describe('string to boolean coercion', () => {
    it('parses string "true" to boolean true', () => {
      const result = booleanFromString.parse('true');
      expect(result).toBe(true);
    });

    it('parses string "false" to boolean false', () => {
      const result = booleanFromString.parse('false');
      expect(result).toBe(false);
    });

    it('is case-insensitive for "true"', () => {
      expect(booleanFromString.parse('TRUE')).toBe(true);
      expect(booleanFromString.parse('True')).toBe(true);
      expect(booleanFromString.parse('tRuE')).toBe(true);
    });

    it('is case-insensitive for "false"', () => {
      expect(booleanFromString.parse('FALSE')).toBe(false);
      expect(booleanFromString.parse('False')).toBe(false);
      expect(booleanFromString.parse('fAlSe')).toBe(false);
    });

    it('trims whitespace before parsing', () => {
      expect(booleanFromString.parse('  true  ')).toBe(true);
      expect(booleanFromString.parse('  false  ')).toBe(false);
      expect(booleanFromString.parse('\ttrue\t')).toBe(true);
      expect(booleanFromString.parse('\nfalse\n')).toBe(false);
    });

    it('returns original value when string is not "true" or "false"', () => {
      expect(booleanFromString.parse('yes')).toBe('yes');
      expect(booleanFromString.parse('no')).toBe('no');
      expect(booleanFromString.parse('1')).toBe('1');
      expect(booleanFromString.parse('0')).toBe('0');
      expect(booleanFromString.parse('enabled')).toBe('enabled');
    });

    it('returns original value when input is not a string', () => {
      expect(booleanFromString.parse(true)).toBe(true);
      expect(booleanFromString.parse(false)).toBe(false);
      expect(booleanFromString.parse(1)).toBe(1);
      expect(booleanFromString.parse(null)).toBe(null);
      expect(booleanFromString.parse(undefined)).toBe(undefined);
    });

    it('parses string with surrounding whitespace that represents boolean', () => {
      expect(booleanFromString.parse('  true')).toBe(true);
      expect(booleanFromString.parse('false ')).toBe(false);
      expect(booleanFromString.parse('  True  ')).toBe(true);
    });
  });

  describe('safeParse behavior', () => {
    it('returns success result for valid boolean string', () => {
      const result = booleanFromString.safeParse('true');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('returns success result for valid false string', () => {
      const result = booleanFromString.safeParse('false');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('returns failure result for non-boolean strings', () => {
      const result = booleanFromString.safeParse('yes');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns failure result for invalid string "no"', () => {
      const result = booleanFromString.safeParse('no');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('callable signature with undefined', () => {
    it('returns a Zod schema when called with undefined', () => {
      const result = booleanFromString(undefined);
      expect(result).toBeTruthy();
      expect(typeof (result as { parse: unknown }).parse).toBe('function');
      expect(typeof (result as { safeParse: unknown }).safeParse).toBe('function');
    });

    it('schema returned from callable with undefined parses correctly', () => {
      const schema = booleanFromString(undefined);
      const result = (schema as { parse: (v: unknown) => boolean }).parse('true');
      expect(result).toBe(true);
    });
  });

  describe('callable signature with non-undefined values', () => {
    it('parses boolean string "true" to boolean true', () => {
      const result = booleanFromString('true');
      expect(result).toBe(true);
    });

    it('parses boolean string "false" to boolean false', () => {
      const result = booleanFromString('false');
      expect(result).toBe(false);
    });

    it('returns original value for non-boolean strings', () => {
      expect(booleanFromString('yes')).toBe('yes');
      expect(booleanFromString('no')).toBe('no');
    });
  });

  describe('default method', () => {
    it('returns a ZodDefault schema that parses correctly', () => {
      const schema = booleanFromString.default('false');
      expect(schema.parse(undefined)).toBe(false);
      expect(schema.parse('true')).toBe(true);
      expect(schema.parse('false')).toBe(false);
    });

    it('default with string "true" returns true for undefined', () => {
      const schema = booleanFromString.default('true');
      expect(schema.parse(undefined)).toBe(true);
    });
  });

  describe('optional method', () => {
    it('returns a ZodOptional schema that accepts undefined', () => {
      const schema = booleanFromString.optional();
      expect(schema.parse(undefined)).toBe(undefined);
      expect(schema.parse('true')).toBe(true);
      expect(schema.parse('false')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('parses empty string as passthrough', () => {
      expect(booleanFromString.parse('')).toBe('');
    });

    it('parses whitespace-only string as passthrough', () => {
      expect(booleanFromString.parse('   ')).toBe('   ');
      expect(booleanFromString.parse('\t')).toBe('\t');
      expect(booleanFromString.parse('\n')).toBe('\n');
    });
  });
});
