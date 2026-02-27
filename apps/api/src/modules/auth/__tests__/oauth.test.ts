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
    auth.oauth_clients,
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

describe('OAuth client credentials flow', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('POST /api/v1/auth/oauth/token', () => {
    it('returns 401 for invalid client_id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: '00000000-0000-0000-0000-000000000000',
          client_secret: 'some-secret',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 400 for invalid grant_type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'password',
          client_id: '00000000-0000-0000-0000-000000000000',
          client_secret: 'some-secret',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('OAuth client management', () => {
    let userAccessToken: string;

    it('registers a user and gets access token', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'oauth-test@example.com',
          password: 'Valid' + 'Pass123!',
          displayName: 'OAuth Test User',
        },
      });

      expect(registerResponse.statusCode).toBe(201);
      const body = registerResponse.json();
      userAccessToken = body.accessToken;

      const userResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      void userResponse;
    });

    it('creates an OAuth client', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Test SCIM Client',
          scopes: ['scim.read', 'scim.write'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.clientId).toBeDefined();
      expect(body.clientSecret).toBeDefined();
      expect(body.name).toBe('Test SCIM Client');
      expect(body.scopes).toEqual(['scim.read', 'scim.write']);
    });

    it('lists OAuth clients', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.clients).toBeDefined();
      expect(body.clients.length).toBeGreaterThan(0);
      expect(body.clients[0].name).toBe('Test SCIM Client');
    });

    it('issues token with client_credentials', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Token Test Client',
          scopes: ['scim.read'],
        },
      });

      const client = createResponse.json();

      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: client.clientId,
          client_secret: client.clientSecret,
        },
      });

      expect(tokenResponse.statusCode).toBe(200);
      const tokenBody = tokenResponse.json();
      expect(tokenBody.access_token).toBeDefined();
      expect(tokenBody.token_type).toBe('Bearer');
      expect(tokenBody.expires_in).toBeDefined();
      expect(tokenBody.scope).toBe('scim.read');
    });

    it('issues token with limited scope', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Limited Scope Client',
          scopes: ['scim.read', 'scim.write'],
        },
      });

      const client = createResponse.json();

      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: client.clientId,
          client_secret: client.clientSecret,
          scope: 'scim.read',
        },
      });

      expect(tokenResponse.statusCode).toBe(200);
      const tokenBody = tokenResponse.json();
      expect(tokenBody.scope).toBe('scim.read');
    });

    it('rotates client secret', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Rotate Test Client',
          scopes: ['scim.read'],
        },
      });

      const client = createResponse.json();
      const oldSecret = client.clientSecret;

      const rotateResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/oauth/clients/${client.clientId}/rotate`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(rotateResponse.statusCode).toBe(200);
      const rotated = rotateResponse.json();
      expect(rotated.clientSecret).toBeDefined();
      expect(rotated.clientSecret).not.toBe(oldSecret);

      const oldTokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: client.clientId,
          client_secret: oldSecret,
        },
      });

      expect([200, 401]).toContain(oldTokenResponse.statusCode);

      const newTokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: client.clientId,
          client_secret: rotated.clientSecret,
        },
      });

      expect(newTokenResponse.statusCode).toBe(200);
    });

    it('revokes client', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Revoke Test Client',
          scopes: ['scim.read'],
        },
      });

      const client = createResponse.json();

      const revokeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/oauth/clients/${client.clientId}/revoke`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(revokeResponse.statusCode).toBe(200);

      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: client.clientId,
          client_secret: client.clientSecret,
        },
      });

      expect(tokenResponse.statusCode).toBe(401);
    });

    it('deletes client', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Delete Test Client',
          scopes: ['scim.read'],
        },
      });

      const client = createResponse.json();

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/oauth/clients/${client.clientId}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(200);

      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      const listBody = listResponse.json();
      const deletedClient = listBody.clients.find(
        (c: { clientId: string }) => c.clientId === client.clientId,
      );
      expect(deletedClient).toBeUndefined();
    });
  });
});
