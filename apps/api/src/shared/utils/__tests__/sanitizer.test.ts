import { describe, expect, it } from 'vitest';

import { PrototypePollutionError, sanitizeValue } from '../sanitizer.js';

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
