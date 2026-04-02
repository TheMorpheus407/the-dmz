import { describe, expect, it } from 'vitest';

import { sanitizeContext } from './sentry-sanitizer.js';

describe('sanitizeContext', () => {
  it('returns input as-is if not an object', () => {
    expect(sanitizeContext(null as unknown as Record<string, unknown>)).toBe(null);
    expect(sanitizeContext(undefined as unknown as Record<string, unknown>)).toBe(undefined);
    expect(sanitizeContext('string' as unknown as Record<string, unknown>)).toBe('string');
    expect(sanitizeContext(123 as unknown as Record<string, unknown>)).toBe(123);
  });

  it('redacts password fields', () => {
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    const input = { password: 'secret123' }; // nosec
    const result = sanitizeContext(input);
    expect(result).toEqual({ password: '[REDACTED]' });
  });

  it('redacts secret fields', () => {
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    const input = { secret: 'my-secret' }; // nosec
    const result = sanitizeContext(input);
    expect(result).toEqual({ secret: '[REDACTED]' });
  });

  it('redacts token fields', () => {
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    const input = { access_token: 'abc123', refresh_token: 'xyz789' }; // nosec
    const result = sanitizeContext(input);
    expect(result).toEqual({ access_token: '[REDACTED]', refresh_token: '[REDACTED]' });
  });

  it('redacts api_key fields', () => {
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    const input = { api_key: 'key123', apiKey: 'key456' }; // nosec
    const result = sanitizeContext(input);
    expect(result).toEqual({ api_key: '[REDACTED]', apiKey: '[REDACTED]' });
  });

  it('redacts authorization fields', () => {
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    const input = { authorization: 'Bearer token123' }; // nosec
    const result = sanitizeContext(input);
    expect(result).toEqual({ authorization: '[REDACTED]' });
  });

  it('does not redact non-sensitive fields', () => {
    const input = { name: 'John', age: 30 };
    const result = sanitizeContext(input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('sanitizes email addresses in top-level string values', () => {
    const input = { message: 'Contact john@example.com for help' };
    const result = sanitizeContext(input);
    expect(result).toEqual({ message: 'Contact [EMAIL_REDACTED] for help' });
  });

  it('preserves boolean and number values', () => {
    const input = { active: true, count: 42, ratio: 3.14 };
    const result = sanitizeContext(input);
    expect(result).toEqual({ active: true, count: 42, ratio: 3.14 });
  });

  it('sanitizes arrays', () => {
    const input = {
      users: [
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
        { name: 'John', password: 'secret' }, // nosec
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
        { name: 'Jane', password: 'pass123' }, // nosec
      ],
    };
    const result = sanitizeContext(input);
    expect(result).toEqual({
      users: [
        { name: 'John', password: '[REDACTED]' },
        { name: 'Jane', password: '[REDACTED]' },
      ],
    });
  });

  it('truncates long string values', () => {
    const longValue = 'a'.repeat(300);
    const input = { data: longValue };
    const result = sanitizeContext(input);
    expect(result.data).toContain('...[TRUNCATED]');
    expect(result.data.length).toBeLessThan(310);
  });

  it('handles case-insensitive key matching', () => {
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    const input = { PASSWORD: 'secret', Password: 'secret', Secret: 'secret' }; // nosec
    const result = sanitizeContext(input);
    expect(result).toEqual({
      PASSWORD: '[REDACTED]',
      Password: '[REDACTED]',
      Secret: '[REDACTED]',
    });
  });

  it('handles empty objects', () => {
    const input = {};
    const result = sanitizeContext(input);
    expect(result).toEqual({});
  });

  it('handles objects with null values', () => {
    const input = { name: 'John', value: null };
    const result = sanitizeContext(input);
    expect(result).toEqual({ name: 'John', value: null });
  });
});
