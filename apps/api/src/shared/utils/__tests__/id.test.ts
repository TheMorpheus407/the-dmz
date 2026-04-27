import { describe, expect, it } from 'vitest';

import { generateId } from '../id.js';

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns a valid UUID format (36 characters with hyphens)', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('returns a UUID v7 (version 7) identifier', () => {
    const id = generateId();
    const versionIndex = 14;
    expect(id[versionIndex]).toBe('7');
  });

  it('returns a UUID with RFC 4122 variant (8, 9, a, or b at position 19)', () => {
    const id = generateId();
    const variantIndex = 19;
    const variantChar = id[variantIndex].toLowerCase();
    expect(['8', '9', 'a', 'b']).toContain(variantChar);
  });

  it('returns unique IDs on consecutive calls', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('generates multiple unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('each ID contains 32 hex characters (128 bits)', () => {
    const id = generateId();
    const hexPart = id.replace(/-/g, '');
    expect(hexPart).toMatch(/^[0-9a-f]{32}$/i);
    expect(hexPart.length).toBe(32);
  });

  it('returns lowercase hex characters', () => {
    const id = generateId();
    expect(id).toBe(id.toLowerCase());
  });
});
