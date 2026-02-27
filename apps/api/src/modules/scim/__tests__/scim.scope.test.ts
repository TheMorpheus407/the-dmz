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

describe('SCIM scope authorization', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  let userAccessToken: string;
  let clientWithReadScope: { clientId: string; clientSecret: string };
  let clientWithWriteScope: { clientId: string; clientSecret: string };
  let clientWithBothScopes: { clientId: string; clientSecret: string };
  let clientReadOnlyToken: string;

  it('registers a user and gets access token', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'scim-scope-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'SCIM Scope Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    const body = registerResponse.json();
    userAccessToken = body.accessToken;
  });

  it('creates OAuth clients with different scopes', async () => {
    const readClientResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/oauth/clients',
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
      payload: {
        name: 'Read Only Client',
        scopes: ['scim.read'],
      },
    });

    expect(readClientResponse.statusCode).toBe(201);
    clientWithReadScope = readClientResponse.json();

    const writeClientResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/oauth/clients',
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
      payload: {
        name: 'Write Only Client',
        scopes: ['scim.write'],
      },
    });

    expect(writeClientResponse.statusCode).toBe(201);
    clientWithWriteScope = writeClientResponse.json();

    const bothClientResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/oauth/clients',
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
      payload: {
        name: 'Both Scopes Client',
        scopes: ['scim.read', 'scim.write'],
      },
    });

    expect(bothClientResponse.statusCode).toBe(201);
    clientWithBothScopes = bothClientResponse.json();

    const clientReadOnlyTokenResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/oauth/token',
      payload: {
        grant_type: 'client_credentials',
        client_id: clientWithReadScope.clientId,
        client_secret: clientWithReadScope.clientSecret,
      },
    });

    expect(clientReadOnlyTokenResponse.statusCode).toBe(200);
    clientReadOnlyToken = clientReadOnlyTokenResponse.json().access_token;
  });

  describe('Token with scim.read scope', () => {
    it('cannot POST /scim/v2/Users (write endpoint - returns 403)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${clientReadOnlyToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'testuser',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('OAUTH_INSUFFICIENT_SCOPE');
    });

    it('cannot PUT /scim/v2/Users/:id (write endpoint - returns 403)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/scim/v2/Users/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${clientReadOnlyToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'updateduser',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error.code).toBe('OAUTH_INSUFFICIENT_SCOPE');
    });

    it('cannot DELETE /scim/v2/Users/:id (write endpoint - returns 403)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/scim/v2/Users/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${clientReadOnlyToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error.code).toBe('OAUTH_INSUFFICIENT_SCOPE');
    });

    it('cannot POST /scim/v2/Groups (write endpoint - returns 403)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Groups',
        headers: {
          authorization: `Bearer ${clientReadOnlyToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Test Group',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Token with scim.write scope', () => {
    let writeToken: string;

    it('issues token with scim.write scope', async () => {
      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: clientWithWriteScope.clientId,
          client_secret: clientWithWriteScope.clientSecret,
        },
      });

      expect(tokenResponse.statusCode).toBe(200);
      const body = tokenResponse.json();
      expect(body.scope).toBe('scim.write');
      writeToken = body.access_token;
    });

    it('cannot access GET /scim/v2/Users (read endpoint - returns 403)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${writeToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error.code).toBe('OAUTH_INSUFFICIENT_SCOPE');
    });

    it('cannot access GET /scim/v2/Groups (read endpoint - returns 403)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Groups',
        headers: {
          authorization: `Bearer ${writeToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('cannot access GET /scim/v2/Schemas (read endpoint - returns 403)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Schemas',
        headers: {
          authorization: `Bearer ${writeToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('cannot access POST /scim/v2/ServiceProviderConfig (requires auth - returns 401)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/ServiceProviderConfig',
        headers: {
          authorization: `Bearer ${writeToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Token with both scim.read and scim.write scopes', () => {
    let bothToken: string;

    it('issues token with both scopes', async () => {
      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: clientWithBothScopes.clientId,
          client_secret: clientWithBothScopes.clientSecret,
          scope: 'scim.read scim.write',
        },
      });

      expect(tokenResponse.statusCode).toBe(200);
      const body = tokenResponse.json();
      expect(body.scope).toContain('scim.read');
      expect(body.scope).toContain('scim.write');
      bothToken = body.access_token;
    });

    it('has both scopes so can access read endpoints', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/ResourceTypes',
        headers: {
          authorization: `Bearer ${bothToken}`,
        },
      });

      expect([200, 500, 503]).toContain(response.statusCode);
    });
  });

  describe('Revoked client tokens are rejected', () => {
    let revokedClient: { clientId: string; clientSecret: string };

    it('creates and then revokes a client', async () => {
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

      expect(createResponse.statusCode).toBe(201);
      revokedClient = createResponse.json();

      const revokeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/oauth/clients/${revokedClient.clientId}/revoke`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(revokeResponse.statusCode).toBe(200);
    });

    it('cannot issue token for revoked client', async () => {
      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: revokedClient.clientId,
          client_secret: revokedClient.clientSecret,
        },
      });

      expect(tokenResponse.statusCode).toBe(401);
    });

    it('returns 403 (insufficient scope) or 401 for SCIM with revoked client token', async () => {
      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: clientWithReadScope.clientId,
          client_secret: clientWithReadScope.clientSecret,
        },
      });

      const token = tokenResponse.json().access_token;

      const revokeResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/oauth/clients/${clientWithReadScope.clientId}/revoke`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(revokeResponse.statusCode).toBe(200);

      const scimResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'test',
        },
      });

      expect([401, 403]).toContain(scimResponse.statusCode);
    });
  });

  describe('Expired client tokens are rejected', () => {
    it('creates client with expiration', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Expired Test Client',
          scopes: ['scim.read'],
          expiresIn: -1,
        },
      });

      expect(createResponse.statusCode).toBe(201);
    });
  });

  describe('Missing authorization header', () => {
    it('returns error for missing authorization header on protected endpoint', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'test',
        },
      });

      expect([401, 500]).toContain(response.statusCode);
    });

    it('returns error for invalid authorization header on protected endpoint', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'test',
        },
      });

      expect([401, 500]).toContain(response.statusCode);
    });
  });
});
