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

const getHeader = (
  headers: Record<string, number | string | string[] | undefined>,
  name: string,
): string | undefined => {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0] !== undefined ? String(value[0]) : undefined;
  }
  if (value === undefined) {
    return undefined;
  }
  return String(value);
};

const getCspDirective = (csp: string, directive: string): string => {
  const entry = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directive} `));

  expect(entry, `Missing CSP directive: ${directive}`).toBeDefined();
  return entry as string;
};

describe('security headers', () => {
  describe('production mode', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const config = createTestConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'example-production-secret-key',
        CORS_ORIGINS: 'https://app.example.com',
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
      expect(getHeader(response.headers, 'x-content-type-options')).toBe('nosniff');
      expect(getHeader(response.headers, 'x-frame-options')).toBe('DENY');
      expect(getHeader(response.headers, 'x-xss-protection')).toBe('0');
      expect(getHeader(response.headers, 'referrer-policy')).toBe(
        'strict-origin-when-cross-origin',
      );
      expect(getHeader(response.headers, 'permissions-policy')).toBe(
        'camera=(), microphone=(), geolocation=(), payment=()',
      );
      expect(getHeader(response.headers, 'cross-origin-opener-policy')).toBe('same-origin');
      expect(getHeader(response.headers, 'cross-origin-embedder-policy')).toBe('require-corp');
      expect(getHeader(response.headers, 'cross-origin-resource-policy')).toBe('same-origin');
      expect(getHeader(response.headers, 'strict-transport-security')).toBe(
        'max-age=63072000; includeSubDomains; preload',
      );
    });

    it('uses strict CSP directives in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const csp = getHeader(response.headers, 'content-security-policy');
      expect(csp).toBeDefined();

      const defaultSrc = getCspDirective(csp as string, 'default-src');
      const scriptSrc = getCspDirective(csp as string, 'script-src');
      const styleSrc = getCspDirective(csp as string, 'style-src');
      const connectSrc = getCspDirective(csp as string, 'connect-src');
      const frameAncestors = getCspDirective(csp as string, 'frame-ancestors');
      const trustedTypes = getCspDirective(csp as string, 'require-trusted-types-for');

      expect(defaultSrc).toBe("default-src 'self'");
      expect(scriptSrc).toBe("script-src 'self'");
      expect(styleSrc).toContain("'unsafe-inline'");
      expect(connectSrc).toContain('https://app.example.com');
      expect(connectSrc).toContain('wss://app.example.com');
      expect(frameAncestors).toBe("frame-ancestors 'none'");
      expect(trustedTypes).toBe("require-trusted-types-for 'script'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    it('keeps headers on not-found responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/missing-route',
      });

      expect(response.statusCode).toBe(404);
      expect(getHeader(response.headers, 'x-frame-options')).toBe('DENY');
      expect(getHeader(response.headers, 'content-security-policy')).toBeDefined();
    });
  });

  describe('production frame-ancestors overrides', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(
        createTestConfig({
          NODE_ENV: 'production',
          JWT_SECRET: 'example-production-secret-key',
          CORS_ORIGINS: 'https://app.example.com',
          CSP_FRAME_ANCESTORS: 'https://lms.example.com,https://canvas.example.com',
        }),
      );
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('uses configured frame-ancestors allowlist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const csp = getHeader(response.headers, 'content-security-policy');
      expect(csp).toBeDefined();

      const frameAncestors = getCspDirective(csp as string, 'frame-ancestors');
      expect(frameAncestors).toContain('https://lms.example.com');
      expect(frameAncestors).toContain('https://canvas.example.com');
      expect(frameAncestors).not.toContain("'none'");
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

      const csp = getHeader(response.headers, 'content-security-policy');
      expect(csp).toBeDefined();

      const scriptSrc = getCspDirective(csp as string, 'script-src');
      const connectSrc = getCspDirective(csp as string, 'connect-src');

      expect(getHeader(response.headers, 'strict-transport-security')).toBeUndefined();
      expect(scriptSrc).toContain("'unsafe-inline'");
      expect(scriptSrc).toContain("'unsafe-eval'");
      expect(connectSrc).toContain('ws://localhost:*');
      expect(connectSrc).toContain('http://localhost:*');
      expect(getHeader(response.headers, 'permissions-policy')).toBe(
        'camera=(), microphone=(), geolocation=(), payment=()',
      );
    });
  });

  describe('test mode', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = buildApp(createTestConfig({ NODE_ENV: 'test' }));
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('uses production-like strict CSP while keeping HSTS disabled', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const csp = getHeader(response.headers, 'content-security-policy');
      expect(csp).toBeDefined();

      const scriptSrc = getCspDirective(csp as string, 'script-src');
      const trustedTypes = getCspDirective(csp as string, 'require-trusted-types-for');

      expect(scriptSrc).toBe("script-src 'self'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
      expect(trustedTypes).toBe("require-trusted-types-for 'script'");
      expect(getHeader(response.headers, 'strict-transport-security')).toBeUndefined();
    });
  });
});
