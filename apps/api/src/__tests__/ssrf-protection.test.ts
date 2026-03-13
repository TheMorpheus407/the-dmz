import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadConfig, type AppConfig } from '../config.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
  JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'test-' + 'encryption-key-at-least-32-chars',
  CORS_ORIGINS: 'http://localhost:5173',
  TOKEN_HASH_SALT: 'test-token-salt',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

describe('SSRF protection plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config = createTestConfig();
    app = buildApp(config, { skipHealthCheck: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('URL validation', () => {
    it('allows valid public HTTPS URLs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'https://api.example.com/data' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('allows valid public HTTP URLs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://api.example.com/data' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('blocks localhost URLs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://localhost:8080/admin' },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: 'URL validation failed' });
    });

    it('blocks 127.0.0.1 URLs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://127.0.0.1:8080/admin' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks private IP 10.0.0.1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://10.0.0.1:8080/internal' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks private IP range 172.16.0.1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://172.16.0.1:8080/internal' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks private IP range 192.168.0.1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://192.168.0.1:8080/internal' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks AWS metadata endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://169.254.169.254/latest/meta-data/' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks GCP metadata endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://metadata.google.internal/computeMetadata/v1/' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks Kubernetes metadata endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'http://kubernetes.default.svc/' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks file:// protocol', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'file:///etc/passwd' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('blocks data:// protocol', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        query: { url: 'data:text/html,<script>alert(1)</script>' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('allows requests without URL parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(200);
    });

    it('blocks URL in request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/game/state',
        payload: { url: 'http://localhost:8080' },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

import type { FastifyInstance } from 'fastify';
