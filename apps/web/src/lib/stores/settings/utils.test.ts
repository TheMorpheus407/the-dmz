import { describe, expect, it } from 'vitest';

import { deepMerge } from './utils';

describe('deepMerge', () => {
  it('merges two flat objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('does not merge arrays', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [4, 5, 6] };
    const result = deepMerge(target, source);
    expect(result.items).toEqual([4, 5, 6]);
  });

  it('recursively merges nested objects', () => {
    const target: Record<string, unknown> = {
      outer: {
        inner: { a: 1, b: 2 },
        other: 'value',
      },
    };
    const source: Partial<Record<string, unknown>> = {
      outer: {
        inner: { b: 3, c: 4 },
      },
    };
    const result = deepMerge(target, source);
    expect(result['outer']).toEqual({
      inner: { a: 1, b: 3, c: 4 },
      other: 'value',
    });
  });

  it('skips undefined values in source', () => {
    const target = { a: 1, b: 2 };
    const source = { c: 3 } as Partial<typeof target>;
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('handles null values in source', () => {
    const target: Record<string, unknown> = { a: 1 };
    const source: Partial<Record<string, unknown>> = { a: null, b: 2 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: null, b: 2 });
  });

  it('returns target when source is empty', () => {
    const target = { a: 1, b: 2 };
    const source = {} as Partial<typeof target>;
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('returns target when source is undefined', () => {
    const target = { a: 1, b: 2 };
    const result = deepMerge(target, undefined as never);
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
