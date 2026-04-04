import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestConfig } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';

const testConfig = createTestConfig() as AppConfig;

const unique = Date.now();

describe('auth preflight routes', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a test user for preflight route testing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
          displayName: 'Preflight Test',
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('rate limit policy entries exist', () => {
    it('should have rate limit entry for /auth/sso/validation/preflight GET', async () => {
      const { m1RateLimitPolicyManifest } = await import('@the-dmz/shared/contracts');
      const entry = m1RateLimitPolicyManifest.routes.find(
        (r) => r.route === '/auth/sso/validation/preflight' && r.method === 'GET',
      );
      expect(entry).toBeDefined();
      expect(entry?.category).toBe('protected-read');
      expect(entry?.max).toBe(30);
      expect(entry?.windowMs).toBe(60_000);
    });

    it('should have rate limit entry for /auth/sso/validation/run POST', async () => {
      const { m1RateLimitPolicyManifest } = await import('@the-dmz/shared/contracts');
      const entry = m1RateLimitPolicyManifest.routes.find(
        (r) => r.route === '/auth/sso/validation/run' && r.method === 'POST',
      );
      expect(entry).toBeDefined();
      expect(entry?.category).toBe('protected-write');
      expect(entry?.max).toBe(10);
      expect(entry?.windowMs).toBe(60_000);
    });

    it('should have rate limit entry for /auth/scim/validation/run POST', async () => {
      const { m1RateLimitPolicyManifest } = await import('@the-dmz/shared/contracts');
      const entry = m1RateLimitPolicyManifest.routes.find(
        (r) => r.route === '/auth/scim/validation/run' && r.method === 'POST',
      );
      expect(entry).toBeDefined();
      expect(entry?.category).toBe('protected-write');
      expect(entry?.max).toBe(10);
      expect(entry?.windowMs).toBe(60_000);
    });

    it('should have rate limit entry for /auth/sso/validation/summary GET', async () => {
      const { m1RateLimitPolicyManifest } = await import('@the-dmz/shared/contracts');
      const entry = m1RateLimitPolicyManifest.routes.find(
        (r) => r.route === '/auth/sso/validation/summary' && r.method === 'GET',
      );
      expect(entry).toBeDefined();
      expect(entry?.category).toBe('protected-read');
      expect(entry?.max).toBe(50);
      expect(entry?.windowMs).toBe(60_000);
    });

    it('should have rate limit entry for /auth/sso/activation POST', async () => {
      const { m1RateLimitPolicyManifest } = await import('@the-dmz/shared/contracts');
      const entry = m1RateLimitPolicyManifest.routes.find(
        (r) => r.route === '/auth/sso/activation' && r.method === 'POST',
      );
      expect(entry).toBeDefined();
      expect(entry?.category).toBe('protected-write');
      expect(entry?.max).toBe(5);
      expect(entry?.windowMs).toBe(300_000);
    });
  });

  describe('GET /api/v1/auth/sso/validation/preflight/:providerId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/validation/preflight/non-existent-provider`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent provider with valid auth', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/validation/preflight/non-existent-provider`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('includes rate limit headers in response', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/validation/preflight/non-existent-provider`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/sso/validation/summary/:providerId', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/validation/summary/non-existent-provider`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for non-existent provider with valid auth', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/validation/summary/non-existent-provider`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('includes rate limit headers in response', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/sso/validation/summary/non-existent-provider`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/sso/validation/run', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/validation/run',
        payload: {
          providerId: 'test-provider',
          validationType: 'oidc',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/validation/run',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          providerId: 'test-provider',
          validationType: 'oidc',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('includes rate limit headers in response', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/validation/run',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          providerId: 'test-provider',
          validationType: 'oidc',
        },
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/scim/validation/run', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/scim/validation/run',
        payload: {
          baseUrl: 'https://example.com/scim',
          bearerToken: 'test-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/scim/validation/run',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          baseUrl: 'https://example.com/scim',
          bearerToken: 'test-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('includes rate limit headers in response', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/scim/validation/run',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          baseUrl: 'https://example.com/scim',
          bearerToken: 'test-token',
        },
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/sso/activation', () => {
    it('returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/activation',
        payload: {
          providerId: 'test-provider',
          enforceSSOOnly: false,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/activation',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          providerId: 'test-provider',
          enforceSSOOnly: false,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('includes rate limit headers in response', async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `preflight-test-${unique}@archive.test`,
          password: 'test1234',
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const { accessToken } = loginResponse.json() as { accessToken: string };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sso/activation',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          providerId: 'test-provider',
          enforceSSOOnly: false,
        },
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});
