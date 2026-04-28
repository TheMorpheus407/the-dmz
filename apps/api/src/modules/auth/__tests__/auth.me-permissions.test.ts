import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestConfig } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { meResponseJsonSchema } from '../auth.schemas.js';

const testConfig = createTestConfig() as AppConfig;

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

describe('GET /api/v1/auth/me permissions and roles', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  const registerAndGetMe = async (email: string) => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'Valid' + 'Pass123!',
        displayName: 'Me Permissions Test',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    const { accessToken } = registerResponse.json() as { accessToken: string };

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    return meResponse;
  };

  it('returns permissions and roles as arrays for user with no roles', async () => {
    const response = await registerAndGetMe('noperms@example.com');

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.permissions).toBeDefined();
    expect(Array.isArray(body.permissions)).toBe(true);

    expect(body.roles).toBeDefined();
    expect(Array.isArray(body.roles)).toBe(true);

    expect(body.permissions).toEqual([]);
    expect(body.roles).toEqual([]);
  });

  it('permissions and roles are never undefined in the response', async () => {
    const response = await registerAndGetMe('defined@example.com');

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.permissions).not.toBeNull();
    expect(body.permissions).not.toBeUndefined();

    expect(body.roles).not.toBeNull();
    expect(body.roles).not.toBeUndefined();
  });

  it('response contains all required fields from meResponseJsonSchema', async () => {
    const response = await registerAndGetMe('schema@example.com');

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.user).toBeDefined();
    expect(body.profile).toBeDefined();
    expect(body.effectivePreferences).toBeDefined();
    expect(body.permissions).toBeDefined();
    expect(body.roles).toBeDefined();
  });

  it('response structure matches meResponseJsonSchema required fields', async () => {
    const response = await registerAndGetMe('required@example.com');

    expect(response.statusCode).toBe(200);
    const body = response.json();

    const requiredFields = meResponseJsonSchema.required as readonly string[];
    for (const field of requiredFields) {
      expect(body).toHaveProperty(field);
      expect(body[field]).toBeDefined();
    }
  });

  it('permissions is an array of strings', async () => {
    const response = await registerAndGetMe('permtype@example.com');

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(Array.isArray(body.permissions)).toBe(true);
    for (const permission of body.permissions) {
      expect(typeof permission).toBe('string');
    }
  });

  it('roles is an array of strings', async () => {
    const response = await registerAndGetMe('roletype@example.com');

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(Array.isArray(body.roles)).toBe(true);
    for (const role of body.roles) {
      expect(typeof role).toBe('string');
    }
  });
});