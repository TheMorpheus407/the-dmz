import { describe, expect, it } from 'vitest';

import { isRecord } from '../type-guards.js';

describe('isRecord', () => {
  it('returns true for a plain object', () => {
    expect(isRecord({})).toBe(true);
  });

  it('returns true for a non-empty object', () => {
    expect(isRecord({ key: 'value' })).toBe(true);
  });

  it('returns true for nested objects', () => {
    expect(isRecord({ nested: { key: 'value' } })).toBe(true);
  });

  it('returns true for object with various value types', () => {
    const obj = {
      string: 'hello',
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      nested: { a: 1 },
    };
    expect(isRecord(obj)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
    expect(isRecord([{ key: 'value' }])).toBe(false);
  });

  it('returns false for strings', () => {
    expect(isRecord('')).toBe(false);
    expect(isRecord('hello')).toBe(false);
  });

  it('returns false for numbers', () => {
    expect(isRecord(0)).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(NaN)).toBe(false);
    expect(isRecord(Infinity)).toBe(false);
  });

  it('returns false for booleans', () => {
    expect(isRecord(true)).toBe(false);
    expect(isRecord(false)).toBe(false);
  });

  it('returns false for symbols', () => {
    expect(isRecord(Symbol('test'))).toBe(false);
  });

  it('returns false for functions', () => {
    expect(isRecord(() => {})).toBe(false);
    expect(isRecord(function () {})).toBe(false);
  });

  it('returns false for class instances', () => {
    class CustomClass {}
    expect(isRecord(new CustomClass())).toBe(false);
    expect(isRecord(new Date())).toBe(false);
  });

  it('returns false for Map', () => {
    expect(isRecord(new Map())).toBe(false);
    expect(isRecord(new Map([['key', 'value']]))).toBe(false);
  });

  it('returns false for Set', () => {
    expect(isRecord(new Set())).toBe(false);
    expect(isRecord(new Set([1, 2, 3]))).toBe(false);
  });

  it('returns false for WeakMap and WeakSet', () => {
    expect(isRecord(new WeakMap())).toBe(false);
    expect(isRecord(new WeakSet())).toBe(false);
  });

  it('returns false for RegExp', () => {
    expect(isRecord(/regex/)).toBe(false);
  });

  it('narrows type to Record<string, unknown> when true', () => {
    const value: unknown = { key: 'value', nested: { a: 1 } };

    if (isRecord(value)) {
      expect(value.key).toBe('value');
      expect(value.nested).toEqual({ a: 1 });
    }
  });

  it('does not narrow type to Record<string, unknown> when false', () => {
    const value: unknown = 'not an object';

    if (!isRecord(value)) {
      expect(typeof value).toBe('string');
    }
  });
});
