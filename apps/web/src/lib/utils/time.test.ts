import { describe, expect, it } from 'vitest';

import { toIsoTimestamp } from './time';

describe('toIsoTimestamp', () => {
  it('returns an ISO string for a provided date', () => {
    const date = new Date('2026-02-05T00:00:00.000Z');

    expect(toIsoTimestamp(date)).toBe('2026-02-05T00:00:00.000Z');
  });
});
