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
  TOKEN_HASH_SALT: 'test-token-salt',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

describe('CORS origin handling', () => {
  describe('production mode', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const config = createTestConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt-value',
        CORS_ORIGINS: 'https://app.example.com,https://admin.example.com',
      });
      app = buildApp(config, { skipHealthCheck: true });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('allows configured CORS_ORIGINS in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'https://app.example.com' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('allows second configured origin in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'https://admin.example.com' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://admin.example.com');
    });

    it('rejects origins not in CORS_ORIGINS in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'https://evil.example.com' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('does not auto-add localhost variants in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:5173' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('allows requests with no origin (same-origin, curl, etc.)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('development mode', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const config = createTestConfig({
        NODE_ENV: 'development',
        CORS_ORIGINS: 'http://localhost:5173,https://staging.example.com',
      });
      app = buildApp(config, { skipHealthCheck: true });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('allows configured CORS_ORIGINS in development', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:5173' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('allows non-localhost configured origins in development', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'https://staging.example.com' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://staging.example.com');
    });

    it('auto-adds 127.0.0.1 variant of localhost origins in development', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://127.0.0.1:5173' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173');
    });

    it('rejects origins not in CORS_ORIGINS in development', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'https://evil.example.com' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('production mode with localhost in CORS_ORIGINS', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const config = createTestConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt-value',
        CORS_ORIGINS: 'http://localhost:5173,https://app.example.com',
      });
      app = buildApp(config, { skipHealthCheck: true });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('allows explicitly configured localhost in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:5173' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('does not auto-add 127.0.0.1 variant in production', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://127.0.0.1:5173' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
