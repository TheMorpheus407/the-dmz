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
  CORS_ORIGINS: 'http://localhost:5173',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

describe('security headers', () => {
  describe('production mode', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const config = createTestConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'example-production-secret-key',
      });
      app = buildApp(config);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('sets baseline security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toBe(
        'camera=(), microphone=(), geolocation=()',
      );
    });

    it('uses strict CSP directives in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const csp = response.headers['content-security-policy'] as string;

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    });
  });

  describe('development mode', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const config = createTestConfig({
        NODE_ENV: 'development',
      });
      app = buildApp(config);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('uses relaxed CSP directives in development', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const csp = response.headers['content-security-policy'] as string;

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("'unsafe-inline'");
      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain('ws://localhost:5173');
    });
  });
});
