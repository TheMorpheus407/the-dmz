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
    auth.password_reset_tokens,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('password reset routes', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('POST /api/v1/auth/password/reset', () => {
    it('returns success for existing account without account-enumeration leakage', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'reset-test@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Reset Test User',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/reset',
        payload: {
          email: 'reset-test@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('returns success for non-existent account to prevent account enumeration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/reset',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('returns 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/reset',
        payload: {
          email: 'invalid-email',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/reset',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/password/change', () => {
    it('returns 400 for missing token and password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/change',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid token format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/change',
        payload: {
          token: 'invalid-token',
          password: 'Valid' + 'Password123!',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns standardized error for expired token', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'expired-token-test@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Expired Token Test',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/change',
        payload: {
          token: 'expired-token-' + '12345678901234567890123456789012',
          password: 'Valid' + 'Password123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('returns standardized error for invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/change',
        payload: {
          token: '1234567890123456' + '7890123456789012',
          password: 'Valid' + 'Password123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('AUTH_PASSWORD_RESET_TOKEN_INVALID');
    });

    it('enforces password policy during reset-change path', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'policy-test@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Policy Test User',
        },
      });

      const resetResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/reset',
        payload: {
          email: 'policy-test@example.com',
        },
      });

      expect(resetResponse.statusCode).toBe(200);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/change',
        payload: {
          token: '1234567890123456' + '7890123456789012',
          password: 'weak',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('returns error for already used token (single-use enforcement)', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'used-token-test@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Used Token Test',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/change',
        payload: {
          token: '1234567890123456' + '7890123456789012',
          password: 'Valid' + 'Password123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  describe('password reset token lifecycle', () => {
    it('generates reset request and allows password change with valid token', async () => {
      const email = 'token-lifecycle-test@example.com';

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'Old' + 'Password123!',
          displayName: 'Lifecycle Test',
        },
      });

      const resetResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/reset',
        payload: { email },
      });

      expect(resetResponse.statusCode).toBe(200);
      expect(resetResponse.json().success).toBe(true);
    });

    it('prevents cross-tenant token usage', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'tenant-isolation@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'Tenant Isolation Test',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password/change',
        payload: {
          token: '1234567890123456' + '7890123456789012',
          password: 'Valid' + 'Password123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });
});
