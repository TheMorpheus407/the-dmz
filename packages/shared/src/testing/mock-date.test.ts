import { describe, expect, it } from 'vitest';

import { MOCK_NOW, createMockDate, createMockTimestamp } from './mock-date.js';

describe('MOCK_NOW', () => {
  it('is a Date instance', () => {
    expect(MOCK_NOW).toBeInstanceOf(Date);
  });

  it('has a fixed value of 2024-01-15T10:00:00Z', () => {
    expect(MOCK_NOW.toISOString()).toBe('2024-01-15T10:00:00.000Z');
  });
});

describe('createMockDate', () => {
  it('returns a Date instance', () => {
    const date = createMockDate();
    expect(date).toBeInstanceOf(Date);
  });

  it('returns MOCK_NOW when called without overrides', () => {
    const date = createMockDate();
    expect(date.toISOString()).toBe('2024-01-15T10:00:00.000Z');
  });

  describe('with daysFromNow override', () => {
    it('returns a date 1 day in the future', () => {
      const date = createMockDate({ daysFromNow: 1 });
      expect(date.toISOString()).toBe('2024-01-16T10:00:00.000Z');
    });

    it('returns a date 7 days in the future', () => {
      const date = createMockDate({ daysFromNow: 7 });
      expect(date.toISOString()).toBe('2024-01-22T10:00:00.000Z');
    });

    it('returns a date 30 days in the future', () => {
      const date = createMockDate({ daysFromNow: 30 });
      expect(date.toISOString()).toBe('2024-02-14T10:00:00.000Z');
    });

    it('returns a date 1 day in the past (negative)', () => {
      const date = createMockDate({ daysFromNow: -1 });
      expect(date.toISOString()).toBe('2024-01-14T10:00:00.000Z');
    });

    it('returns a date 365 days in the past (negative)', () => {
      const date = createMockDate({ daysFromNow: -365 });
      expect(date.toISOString()).toBe('2023-01-15T10:00:00.000Z');
    });
  });

  describe('with msFromNow override', () => {
    it('returns a date 1 hour in the future', () => {
      const date = createMockDate({ msFromNow: 60 * 60 * 1000 });
      expect(date.toISOString()).toBe('2024-01-15T11:00:00.000Z');
    });

    it('returns a date 1 hour in the past', () => {
      const date = createMockDate({ msFromNow: -60 * 60 * 1000 });
      expect(date.toISOString()).toBe('2024-01-15T09:00:00.000Z');
    });

    it('returns a date 60000ms (1 minute) in the future', () => {
      const date = createMockDate({ msFromNow: 60000 });
      expect(date.toISOString()).toBe('2024-01-15T10:01:00.000Z');
    });

    it('handles very large ms values', () => {
      const date = createMockDate({ msFromNow: 86400000 * 100 });
      expect(date.toISOString()).toBe('2024-04-24T10:00:00.000Z');
    });
  });

  describe('precedence when both overrides are provided', () => {
    it('prefers daysFromNow over msFromNow when both are specified', () => {
      const date = createMockDate({ daysFromNow: 1, msFromNow: 60000 });
      expect(date.toISOString()).toBe('2024-01-16T10:00:00.000Z');
    });
  });

  it('returns consistent values across multiple calls', () => {
    const dates = Array.from({ length: 10 }, () => createMockDate());
    const uniqueDates = new Set(dates.map((d) => d.toISOString()));
    expect(uniqueDates.size).toBe(1);
  });
});

describe('createMockTimestamp', () => {
  it('returns a number', () => {
    const timestamp = createMockTimestamp();
    expect(typeof timestamp).toBe('number');
  });

  it('returns the timestamp for MOCK_NOW', () => {
    const timestamp = createMockTimestamp();
    expect(timestamp).toBe(MOCK_NOW.getTime());
  });

  it('returns a positive number', () => {
    const timestamp = createMockTimestamp();
    expect(timestamp).toBeGreaterThan(0);
  });

  it('returns consistent values across multiple calls', () => {
    const timestamps = Array.from({ length: 10 }, () => createMockTimestamp());
    const uniqueTimestamps = new Set(timestamps);
    expect(uniqueTimestamps.size).toBe(1);
  });
});