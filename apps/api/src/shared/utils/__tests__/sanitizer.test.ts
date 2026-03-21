import { describe, expect, it } from 'vitest';

import {
  PrototypePollutionError,
  sanitizeForLogging,
  sanitizeHeaderValue,
  sanitizeValue,
} from '../sanitizer.js';

describe('sanitizeValue', () => {
  it('sanitizes nested string values recursively', () => {
    const input = {
      title: '  <b>Hello</b>\u0000 ',
      nested: {
        note: ' javascript:alert(1) ',
        values: ['  <script>alert(1)</script>safe  ', '  <img src=x onerror=alert(1)>ok  '],
      },
    };

    const sanitized = sanitizeValue(input);

    expect(sanitized).toEqual({
      title: 'Hello',
      nested: {
        note: 'alert(1)',
        values: ['safe', 'ok'],
      },
    });

    expect(input.title).toBe('  <b>Hello</b>\u0000 ');
    expect(input.nested.note).toBe(' javascript:alert(1) ');
  });

  it('preserves benign plain text that includes javascript tokens or comparison operators', () => {
    const input = {
      lesson: ' Learn javascript: the hard way ',
      comparison: ' 1 < 2 and 3 > 1 ',
    };

    const sanitized = sanitizeValue(input);

    expect(sanitized).toEqual({
      lesson: 'Learn javascript: the hard way',
      comparison: '1 < 2 and 3 > 1',
    });
  });

  it('supports route-level HTML skip fields while still trimming and stripping null bytes', () => {
    const sanitized = sanitizeValue(
      {
        content: '  <p onclick="alert(1)">Hello</p>\u0000 ',
        metadata: {
          content: '  <em>Nested</em>  ',
          title: '  <b>Title</b>  ',
        },
      },
      { skipHtmlFields: ['content', 'metadata.content'] },
    );

    expect(sanitized).toEqual({
      content: '<p onclick="alert(1)">Hello</p>',
      metadata: {
        content: '<em>Nested</em>',
        title: 'Title',
      },
    });
  });

  it('neutralizes MongoDB-style operator keys recursively', () => {
    const sanitized = sanitizeValue({
      filter: {
        $gt: 18,
        $where: 'sleep(1000)',
        safe: '  yes  ',
      },
      list: [{ $ne: 'admin', value: '  user  ' }],
    });

    expect(sanitized).toEqual({
      filter: {
        safe: 'yes',
      },
      list: [{ value: 'user' }],
    });
  });

  it('rejects payloads that contain __proto__ keys', () => {
    const payload = JSON.parse('{"name":"safe","__proto__":{"polluted":true}}') as Record<
      string,
      unknown
    >;

    let thrown: unknown;
    try {
      sanitizeValue(payload);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(PrototypePollutionError);
    expect((thrown as PrototypePollutionError).field).toBe('__proto__');
  });

  it('rejects nested constructor.prototype payloads', () => {
    const payload = JSON.parse(
      '{"account":{"constructor":{"prototype":{"isAdmin":true}}}}',
    ) as Record<string, unknown>;

    let thrown: unknown;
    try {
      sanitizeValue(payload);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(PrototypePollutionError);
    expect((thrown as PrototypePollutionError).field).toBe('account.constructor');
  });

  it('keeps clean inputs unchanged and does not mutate original objects', () => {
    const input = {
      message: 'hello world',
      count: 42,
      nested: {
        enabled: true,
      },
      values: ['alpha', 'beta'],
    };
    const snapshot = structuredClone(input);

    const sanitized = sanitizeValue(input);

    expect(sanitized).toEqual(input);
    expect(sanitized).not.toBe(input);
    expect(sanitized.nested).not.toBe(input.nested);
    expect(input).toEqual(snapshot);
  });
});

describe('sanitizeHeaderValue', () => {
  it('strips carriage return characters', () => {
    const input = 'value\rwith\rCR';
    expect(sanitizeHeaderValue(input)).toBe('valuewithCR');
  });

  it('strips newline characters', () => {
    const input = 'value\nwith\nLF';
    expect(sanitizeHeaderValue(input)).toBe('valuewithLF');
  });

  it('strips CRLF sequences', () => {
    const input = 'value\r\nwith\r\nCRLF';
    expect(sanitizeHeaderValue(input)).toBe('valuewithCRLF');
  });

  it('returns value unchanged when no CRLF present', () => {
    const input = 'normal value without CRLF';
    expect(sanitizeHeaderValue(input)).toBe('normal value without CRLF');
  });

  it('handles mixed CRLF combinations', () => {
    const input = 'line1\r\nline2\rline3\nline4';
    expect(sanitizeHeaderValue(input)).toBe('line1line2line3line4');
  });
});

describe('sanitizeForLogging', () => {
  it('replaces carriage return characters with spaces', () => {
    const input = 'value\rwith\rCR';
    expect(sanitizeForLogging(input)).toBe('value with CR');
  });

  it('replaces newline characters with spaces', () => {
    const input = 'value\nwith\nLF';
    expect(sanitizeForLogging(input)).toBe('value with LF');
  });

  it('replaces CRLF sequences with spaces', () => {
    const input = 'value\r\nwith\r\nCRLF';
    expect(sanitizeForLogging(input)).toBe('value with CRLF');
  });

  it('returns value unchanged when no CRLF present', () => {
    const input = 'normal value without CRLF';
    expect(sanitizeForLogging(input)).toBe('normal value without CRLF');
  });

  it('handles mixed CRLF combinations', () => {
    const input = 'line1\r\nline2\rline3\nline4';
    expect(sanitizeForLogging(input)).toBe('line1 line2 line3 line4');
  });

  it('preserves whitespace inside values when replacing CRLF', () => {
    const input = 'hello\r\nworld';
    expect(sanitizeForLogging(input)).toBe('hello world');
  });

  it('handles empty strings', () => {
    expect(sanitizeForLogging('')).toBe('');
  });

  it('handles strings with only CRLF', () => {
    expect(sanitizeForLogging('\r\n\r\n')).toBe('  ');
  });

  it('handles strings with only whitespace and CRLF', () => {
    expect(sanitizeForLogging('  \r\n  \n\r  ')).toBe('         ');
  });
});
