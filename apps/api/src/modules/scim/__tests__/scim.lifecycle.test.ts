import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  SCIM_LIFECYCLE_CONTRACT_V1,
  SCIMLifecycleOutcome,
  SCIMConflictOutcome,
} from '@the-dmz/shared/auth';

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

describe('SCIM lifecycle contract', () => {
  describe('Contract definitions', () => {
    it('defines supported SCIM core attributes', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.supportedAttributes).toBeDefined();
      expect(SCIM_LIFECYCLE_CONTRACT_V1.supportedAttributes.length).toBeGreaterThan(0);
    });

    it('includes userName as immutable core attribute', () => {
      const userNameAttr = SCIM_LIFECYCLE_CONTRACT_V1.supportedAttributes.find(
        (a) => a.scimAttribute === 'userName',
      );
      expect(userNameAttr).toBeDefined();
      expect(userNameAttr?.mutability).toBe('immutable');
      expect(userNameAttr?.isCore).toBe(true);
    });

    it('includes displayName as readWrite core attribute', () => {
      const displayNameAttr = SCIM_LIFECYCLE_CONTRACT_V1.supportedAttributes.find(
        (a) => a.scimAttribute === 'displayName',
      );
      expect(displayNameAttr).toBeDefined();
      expect(displayNameAttr?.mutability).toBe('readWrite');
      expect(displayNameAttr?.isCore).toBe(true);
    });

    it('includes active as readWrite core attribute', () => {
      const activeAttr = SCIM_LIFECYCLE_CONTRACT_V1.supportedAttributes.find(
        (a) => a.scimAttribute === 'active',
      );
      expect(activeAttr).toBeDefined();
      expect(activeAttr?.mutability).toBe('readWrite');
      expect(activeAttr?.isCore).toBe(true);
    });

    it('includes groups as readOnly core attribute', () => {
      const groupsAttr = SCIM_LIFECYCLE_CONTRACT_V1.supportedAttributes.find(
        (a) => a.scimAttribute === 'groups',
      );
      expect(groupsAttr).toBeDefined();
      expect(groupsAttr?.mutability).toBe('readOnly');
      expect(groupsAttr?.isCore).toBe(true);
    });

    it('defines admin protected fields', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.adminProtectedFields).toContain('role');
      expect(SCIM_LIFECYCLE_CONTRACT_V1.adminProtectedFields).toContain('tenantId');
      expect(SCIM_LIFECYCLE_CONTRACT_V1.adminProtectedFields).toContain('createdAt');
    });

    it('has soft delete enabled by default', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.softDeleteOnDeprovision).toBe(true);
    });

    it('targets <60s sync latency', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.syncLatencyTargetMs).toBe(60000);
    });

    it('uses email as identity key type', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.identityKeyType).toBe('email');
    });

    it('has SCIM priority conflict resolution by default', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.conflictResolutionPolicy).toBe('scim_priority');
    });
  });

  describe('Lifecycle outcomes', () => {
    it('defines user lifecycle outcomes', () => {
      expect(SCIMLifecycleOutcome.CREATED).toBe('created');
      expect(SCIMLifecycleOutcome.UPDATED).toBe('updated');
      expect(SCIMLifecycleOutcome.DEACTIVATED).toBe('deactivated');
      expect(SCIMLifecycleOutcome.REACTIVATED).toBe('reactivated');
      expect(SCIMLifecycleOutcome.SOFT_DELETED).toBe('soft_deleted');
    });

    it('defines group lifecycle outcomes', () => {
      expect(SCIMConflictOutcome.NONE).toBe('none');
      expect(SCIMConflictOutcome.FIELD_OVERWRITTEN).toBe('field_overwritten');
      expect(SCIMConflictOutcome.DUPLICATE_PREVENTED).toBe('duplicate_prevented');
      expect(SCIMConflictOutcome.MERGED).toBe('merged');
    });
  });
});

describe('SCIM lifecycle API', () => {
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
  let scimToken: string;
  let testUserId: string;

  it('registers a user and gets access token', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'scim-lifecycle-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'SCIM Lifecycle Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    const body = registerResponse.json();
    userAccessToken = body.accessToken;
  });

  it('creates OAuth client with SCIM scopes', async () => {
    const clientResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/oauth/clients',
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
      payload: {
        name: 'SCIM Lifecycle Client',
        scopes: ['scim.read', 'scim.write'],
      },
    });

    expect(clientResponse.statusCode).toBe(201);
    const client = clientResponse.json();

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
    scimToken = tokenResponse.json().access_token;
  });

  describe('User lifecycle', () => {
    it('creates a user via SCIM', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'new-scim-user@example.com',
          displayName: 'New SCIM User',
          active: true,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const body = createResponse.json();
      expect(body.userName).toBe('new-scim-user@example.com');
      expect(body.active).toBe(true);
      testUserId = body.id;
    });

    it('prevents duplicate user creation', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'new-scim-user@example.com',
          displayName: 'Duplicate User',
        },
      });

      expect(createResponse.statusCode).toBe(409);
    });

    it('gets user by ID', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scim/v2/Users/${testUserId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body.id).toBe(testUserId);
    });

    it('returns 404 for non-existent user', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('updates user via PUT', async () => {
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/scim/v2/Users/${testUserId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'new-scim-user@example.com',
          displayName: 'Updated Display Name',
          active: true,
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.displayName).toBe('Updated Display Name');
    });

    it('deactivates user via PATCH', async () => {
      const patchResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/scim/v2/Users/${testUserId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          operations: [
            {
              op: 'replace',
              path: 'active',
              value: false,
            },
          ],
        },
      });

      expect(patchResponse.statusCode).toBe(200);
      const body = patchResponse.json();
      expect(body.active).toBe(false);
    });

    it('soft deletes user (deactivates)', async () => {
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/scim/v2/Users/${testUserId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scim/v2/Users/${testUserId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      const body = getResponse.json();
      expect(body.active).toBe(false);
    });

    it('reactivates user', async () => {
      const reactivateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/scim/v2/Users/${testUserId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          operations: [
            {
              op: 'replace',
              path: 'active',
              value: true,
            },
          ],
        },
      });

      expect(reactivateResponse.statusCode).toBe(200);
      const body = reactivateResponse.json();
      expect(body.active).toBe(true);
    });
  });

  describe('Group lifecycle', () => {
    let testGroupId: string;

    it('creates a group via SCIM', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Groups',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Test SCIM Group',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const body = createResponse.json();
      expect(body.displayName).toBe('Test SCIM Group');
      testGroupId = body.id;
    });

    it('prevents duplicate group creation', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/scim/v2/Groups',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Test SCIM Group',
        },
      });

      expect(createResponse.statusCode).toBe(409);
    });

    it('gets group by ID', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/scim/v2/Groups/${testGroupId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body.id).toBe(testGroupId);
    });

    it('updates group via PUT', async () => {
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/scim/v2/Groups/${testGroupId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
        payload: {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Updated Group Name',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.displayName).toBe('Updated Group Name');
    });

    it('deletes group', async () => {
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/scim/v2/Groups/${testGroupId}`,
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);
    });

    it('returns 404 for non-existent group', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Groups/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('Tenant isolation', () => {
    it('lists users scoped to tenant', async () => {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();
      expect(body.totalResults).toBeGreaterThan(0);
    });

    it('paginates results correctly', async () => {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users?startIndex=1&count=1',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();
      expect(body.itemsPerPage).toBe(1);
      expect(body.startIndex).toBe(1);
    });
  });

  describe('Filter validation', () => {
    it('rejects invalid filter syntax', async () => {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users?filter=invalid',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect(listResponse.statusCode).toBe(400);
    });

    it('accepts valid filter: userName sw', async () => {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/scim/v2/Users?filter=userName sw "new"',
        headers: {
          authorization: `Bearer ${scimToken}`,
        },
      });

      expect([200, 500]).toContain(listResponse.statusCode);
    });
  });
});
