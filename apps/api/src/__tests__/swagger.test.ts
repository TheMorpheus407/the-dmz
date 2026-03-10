import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadConfig, type AppConfig } from '../config.js';

import type { FastifyInstance } from 'fastify';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
  JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
  CORS_ORIGINS: 'http://localhost:5173',
  TOKEN_HASH_SALT: 'test-token-salt',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

describe('swagger docs', () => {
  describe('when Swagger UI is enabled', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(
        createTestConfig({
          ENABLE_SWAGGER: 'true',
          API_VERSION: '1.2.3',
        }),
      );
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('serves interactive docs at /docs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      expect([200, 302, 308]).toContain(response.statusCode);
    });

    it('serves OpenAPI JSON with metadata and health routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json() as {
        openapi: string;
        info: { title: string; version: string };
        paths: {
          '/health': {
            get: { responses: Record<string, unknown> };
          };
          '/ready': {
            get: { responses: Record<string, unknown> };
          };
        };
      };

      expect(payload.openapi).toBe('3.1.0');
      expect(payload.info.title).toBe('The DMZ API');
      expect(payload.info.version).toBe('1.2.3');
      expect(payload.paths['/health'].get.responses).toHaveProperty('200');
      expect(payload.paths['/ready'].get.responses).toHaveProperty('200');
      expect(payload.paths['/ready'].get.responses).toHaveProperty('503');
    });

    it('documents tenant-inactive and permission-denied 403 contracts for protected AI and content routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json() as {
        paths: Record<
          string,
          Record<
            string,
            {
              responses?: Record<
                string,
                {
                  content?: {
                    'application/json'?: {
                      schema?: {
                        oneOf?: Array<{
                          properties?: {
                            error?: {
                              properties?: {
                                code?: {
                                  const?: string;
                                  enum?: string[];
                                };
                              };
                            };
                          };
                        }>;
                      };
                    };
                  };
                }
              >;
            }
          >
        >;
      };

      const expectTenantInactiveAndForbidden403 = (path: string, method: string): void => {
        const responseSchema =
          payload.paths[path]?.[method]?.responses?.['403']?.content?.['application/json']?.schema;

        expect(responseSchema?.oneOf).toHaveLength(2);
        const codes = (responseSchema?.oneOf ?? []).map(
          (schema) => schema.properties?.error?.properties?.code,
        );

        expect(codes).toContainEqual(
          expect.objectContaining({
            enum: expect.arrayContaining(['TENANT_INACTIVE']),
          }),
        );
        expect(codes).toContainEqual(
          expect.objectContaining({
            enum: expect.arrayContaining(['AUTH_FORBIDDEN', 'AUTH_INSUFFICIENT_PERMS']),
          }),
        );
      };

      expectTenantInactiveAndForbidden403('/api/v1/ai/prompt-templates', 'get');
      expectTenantInactiveAndForbidden403('/api/v1/ai/prompt-templates', 'post');
      expectTenantInactiveAndForbidden403('/api/v1/ai/generate/email', 'post');
      expectTenantInactiveAndForbidden403('/api/v1/content/emails', 'get');
      expectTenantInactiveAndForbidden403('/api/v1/content/emails', 'post');
      expectTenantInactiveAndForbidden403('/api/v1/content/scenarios', 'get');
      expectTenantInactiveAndForbidden403('/api/v1/content/templates/{type}', 'get');
      expectTenantInactiveAndForbidden403('/api/v1/content/localized/{id}', 'get');
    });

    it('serves OpenAPI YAML at /docs/yaml', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/yaml',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('openapi: 3.1.0');
      expect(response.body).toContain('title: The DMZ API');
      expect(response.body).toContain('/health:');
      expect(response.body).toContain('/ready:');
    });
  });

  describe('when Swagger UI is disabled in production', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(
        createTestConfig({
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-value',
          CORS_ORIGINS: 'https://portal.archive.test',
          ENABLE_SWAGGER: 'false',
          API_VERSION: '2.0.0',
        }),
        { skipHealthCheck: true },
      );
      await app.ready();
    });

    afterAll(async () => {
      await app?.close();
    });

    it('does not expose Swagger UI at /docs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Route not found',
            details: {},
          }),
        }),
      );
    });

    it('keeps raw OpenAPI JSON for tooling', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json() as { info: { version: string } };
      expect(payload.info.version).toBe('2.0.0');
    });

    it('keeps raw OpenAPI YAML for tooling', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/yaml',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('openapi: 3.1.0');
      expect(response.body).toContain('version: 2.0.0');
    });
  });
});
