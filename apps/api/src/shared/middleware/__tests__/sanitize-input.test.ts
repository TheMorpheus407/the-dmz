import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';

import type { FastifyInstance } from 'fastify';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

describe('sanitizeInputHook', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp(createTestConfig());

    app.post('/test/sanitize/:id', async (request) => ({
      body: request.body,
      query: request.query,
      params: request.params,
    }));

    app.post(
      '/test/validation-trim',
      {
        schema: {
          body: {
            type: 'object',
            additionalProperties: false,
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 1 },
            },
          },
        },
      },
      async () => ({ ok: true }),
    );

    app.post(
      '/test/rich-text',
      {
        config: {
          sanitize: {
            skipHtmlFields: ['content'],
            enforcePrototypePollution: true,
          },
        },
      },
      async (request) => request.body,
    );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sanitizes body, query, and params recursively', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/sanitize/%20%3Cb%3E42%3C%2Fb%3E%20?search=%20%3Ci%3Eterm%3C%2Fi%3E%20&lesson=%20Learn%20javascript%3A%20the%20hard%20way%20',
      payload: {
        title: '  <b>Hello</b>\u0000 ',
        lesson: ' Learn javascript: the hard way ',
        comparison: ' 1 < 2 and 3 > 1 ',
        nested: {
          note: ' javascript:alert(1) ',
          list: ['  <script>alert(1)</script>safe  '],
        },
        filter: {
          $where: 'sleep(1000)',
          safe: '  ok  ',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      body: {
        title: 'Hello',
        lesson: 'Learn javascript: the hard way',
        comparison: '1 < 2 and 3 > 1',
        nested: {
          note: 'alert(1)',
          list: ['safe'],
        },
        filter: {
          safe: 'ok',
        },
      },
      query: {
        search: 'term',
        lesson: 'Learn javascript: the hard way',
      },
      params: {
        id: '42',
      },
    });
  });

  it('runs before AJV validation so trimmed values are validated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/validation-trim',
      payload: {
        name: '   ',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
      },
    });
  });

  it('rejects __proto__ payloads with INVALID_INPUT details', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/sanitize/123?search=ok',
      headers: {
        'content-type': 'application/json',
      },
      payload: '{"title":"safe","__proto__":{"polluted":true}}',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
          message: 'Request payload contains forbidden patterns',
          details: {
            reason: 'Prototype pollution attempt detected',
            field: '__proto__',
          },
        }),
      }),
    );
  });

  it('rejects constructor.prototype payloads with INVALID_INPUT details', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/sanitize/123?search=ok',
      headers: {
        'content-type': 'application/json',
      },
      payload: '{"account":{"constructor":{"prototype":{"admin":true}}}}',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
          message: 'Request payload contains forbidden patterns',
          details: {
            reason: 'Prototype pollution attempt detected',
            field: 'account.constructor',
          },
        }),
      }),
    );
  });

  it('returns VALIDATION_FAILED for malformed JSON payloads', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/sanitize/123?search=ok',
      headers: {
        'content-type': 'application/json',
      },
      payload: '{"title":',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details: {
            reason: "Body is not valid JSON but content-type is set to 'application/json'",
          },
        }),
      }),
    );
  });

  it('supports per-route HTML skip fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/rich-text',
      payload: {
        content: '  <p onclick="alert(1)">Announcement</p>  ',
        title: '  <b>Headline</b>  ',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      content: '<p onclick="alert(1)">Announcement</p>',
      title: 'Headline',
    });
  });
});

describe('buildApp bodyLimit', () => {
  it('sets Fastify bodyLimit from MAX_BODY_SIZE config', async () => {
    const app = buildApp(createTestConfig({ MAX_BODY_SIZE: '2048' }));
    await app.ready();

    expect(app.initialConfig.bodyLimit).toBe(2048);

    await app.close();
  });
});
