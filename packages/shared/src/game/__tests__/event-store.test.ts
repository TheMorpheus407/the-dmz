import { describe, expect, it } from 'vitest';

import { shouldCreateSnapshot, SNAPSHOT_INTERVAL } from '../event-store.types.js';

describe('shouldCreateSnapshot', () => {
  it('should return true when no previous snapshot and sequence >= 50', () => {
    expect(shouldCreateSnapshot(50, null)).toBe(true);
    expect(shouldCreateSnapshot(51, null)).toBe(true);
    expect(shouldCreateSnapshot(100, null)).toBe(true);
  });

  it('should return false when no previous snapshot and sequence < 50', () => {
    expect(shouldCreateSnapshot(0, null)).toBe(false);
    expect(shouldCreateSnapshot(10, null)).toBe(false);
    expect(shouldCreateSnapshot(49, null)).toBe(false);
  });

  it('should return true when 50+ events since last snapshot', () => {
    expect(shouldCreateSnapshot(60, 10)).toBe(true);
    expect(shouldCreateSnapshot(100, 49)).toBe(true);
    expect(shouldCreateSnapshot(51, 0)).toBe(true);
  });

  it('should return false when < 50 events since last snapshot', () => {
    expect(shouldCreateSnapshot(55, 10)).toBe(false);
    expect(shouldCreateSnapshot(60, 15)).toBe(false);
    expect(shouldCreateSnapshot(59, 10)).toBe(false);
  });

  it('should return false when exactly 50 events since last snapshot', () => {
    expect(shouldCreateSnapshot(60, 10)).toBe(true);
  });
});

describe('SNAPSHOT_INTERVAL', () => {
  it('should be 50', () => {
    expect(SNAPSHOT_INTERVAL).toBe(50);
  });
});
