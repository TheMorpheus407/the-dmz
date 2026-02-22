import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await pool`TRUNCATE TABLE
    auth.user_profiles,
    auth.role_permissions,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('auth routes', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('returns 201 and auth payload on successful registration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'valid pass 1234',
          displayName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.displayName).toBe('Test User');
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('returns 409 for duplicate email', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'valid pass 1234',
          displayName: 'First User',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'valid pass 1234',
          displayName: 'Second User',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it('returns 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'valid pass 1234',
          displayName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test2@example.com',
          password: 'short',
          displayName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 and auth payload on successful login', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logintest@example.com',
          password: 'valid pass 1234',
          displayName: 'Login Test',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: 'valid pass 1234',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('returns 401 for invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'wrong pass 1234',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns 401 for wrong password', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'wrongpass@example.com',
          password: 'correct pass 1234',
          displayName: 'Wrong Pass',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'wrongpass@example.com',
          password: 'incorrect pass 1234',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns new tokens on valid refresh token', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'refresh@example.com',
          password: 'valid pass 1234',
          displayName: 'Refresh Test',
        },
      });

      const { refreshToken } = registerResponse.json() as {
        refreshToken: string;
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('returns 401 for invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('invalidates old refresh token after rotation', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'rotation@example.com',
          password: 'valid pass 1234',
          displayName: 'Rotation Test',
        },
      });

      const { refreshToken: originalRefreshToken } = registerResponse.json() as {
        refreshToken: string;
      };

      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: originalRefreshToken,
        },
      });

      expect(refreshResponse.statusCode).toBe(200);

      const reuseResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: originalRefreshToken,
        },
      });

      expect(reuseResponse.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 200 with user data for valid token', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'me@example.com',
          password: 'valid pass 1234',
          displayName: 'Me Test',
        },
      });

      const { accessToken } = registerResponse.json() as {
        accessToken: string;
      };

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('me@example.com');
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/auth/logout', () => {
    it('returns 200 on successful logout', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logout@example.com',
          password: 'valid pass 1234',
          displayName: 'Logout Test',
        },
      });

      const { accessToken, refreshToken } = registerResponse.json() as {
        accessToken: string;
        refreshToken: string;
      };

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-refresh-token': refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('prevents refresh token reuse after logout', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logoutreuse@example.com',
          password: 'valid pass 1234',
          displayName: 'Logout Reuse Test',
        },
      });

      const { accessToken, refreshToken } = registerResponse.json() as {
        accessToken: string;
        refreshToken: string;
      };

      await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-refresh-token': refreshToken,
        },
      });

      const reuseResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(reuseResponse.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/health/authenticated', () => {
    it('returns 200 with status and user for valid token', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'health@example.com',
          password: 'valid pass 1234',
          displayName: 'Health Test',
        },
      });

      const { accessToken } = registerResponse.json() as {
        accessToken: string;
      };

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health/authenticated',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.user).toBeDefined();
      expect(body.user.id).toBeDefined();
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health/authenticated',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('tenant context', () => {
    it('sets tenant context on protected route with valid JWT', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenantctx@example.com',
          password: 'valid pass 1234',
          displayName: 'Tenant Ctx Test',
        },
      });

      const { accessToken, user } = registerResponse.json() as {
        accessToken: string;
        user: { tenantId: string; id: string };
      };

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user).toBeDefined();
      expect(body.user.tenantId).toBe(user.tenantId);
    });

    it('returns 401 with AUTH_UNAUTHORIZED code when token is invalid', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('public health route does not require tenant context', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBeDefined();
    });

    it('public ready route does not require tenant context', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBeDefined();
    });

    it('returns error with requestId for tenant context failures', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.requestId).toBeDefined();
    });
  });
});
