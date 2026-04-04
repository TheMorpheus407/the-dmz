import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { resetTestDatabase, ensureTenantColumns } from '../../../__tests__/helpers/db.js';

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
  await resetTestDatabase(testConfig);

  const pool = getDatabasePool(testConfig);
  try {
    await pool.unsafe(
      `TRUNCATE TABLE "integration"."webhook_subscriptions" RESTART IDENTITY CASCADE`,
    );
    await pool.unsafe(`TRUNCATE TABLE "integration"."webhook_deliveries" RESTART IDENTITY CASCADE`);
    await pool.unsafe(
      `TRUNCATE TABLE "integration"."webhook_circuit_breakers" RESTART IDENTITY CASCADE`,
    );
  } catch {
    // Tables don't exist - skip
  }

  await ensureTenantColumns(testConfig);
};

describe('Webhook subscription API', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  afterEach(async () => {
    await resetTestData();
  });

  let userAccessToken: string;
  let webhookToken: string;
  let testTenantId: string;
  let testSubscriptionId: string;

  it('registers a user and gets access token', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'webhook-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'Webhook Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    const body = registerResponse.json();
    userAccessToken = body.accessToken;
  });

  it('gets the tenant ID from the user', async () => {
    const profileResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
    });

    expect(profileResponse.statusCode).toBe(200);
    const body = profileResponse.json();
    testTenantId = body.tenantId;
    expect(testTenantId).toBeDefined();
  });

  it('creates OAuth client with webhooks.manage scope', async () => {
    const clientResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/oauth/clients',
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
      payload: {
        name: 'Webhook Test Client',
        scopes: ['webhooks.manage'],
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
    webhookToken = tokenResponse.json().access_token;
  });

  describe('Webhook subscription CRUD', () => {
    it('creates a webhook subscription', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/subscriptions',
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          name: 'Test Webhook',
          targetUrl: 'https://example.com/webhook',
          eventTypes: ['auth.user.created'],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const body = createResponse.json();
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('Test Webhook');
      expect(body.data.targetUrl).toBe('https://example.com/webhook');
      expect(body.data.status).toBe('test_pending');
      testSubscriptionId = body.data.id;
    });

    it('rejects HTTP URLs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/subscriptions',
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          name: 'Test Webhook',
          targetUrl: 'http://example.com/webhook',
          eventTypes: ['auth.user.created'],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('lists subscriptions', async () => {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/subscriptions',
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('gets subscription by ID', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(testSubscriptionId);
    });

    it('returns 404 for non-existent subscription', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/subscriptions/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('updates subscription', async () => {
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          name: 'Updated Webhook Name',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.data.name).toBe('Updated Webhook Name');
    });

    it('rejects HTTP URL when updating subscription', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          targetUrl: 'http://example.com/webhook',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('updates subscription status', async () => {
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          status: 'disabled',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.data.status).toBe('disabled');
    });
  });

  describe('Webhook subscription delete', () => {
    it('deletes subscription', async () => {
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('Webhook secret rotation', () => {
    it('rotates secret and returns new secret', async () => {
      const rotateResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}/rotate-secret`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(rotateResponse.statusCode).toBe(200);
      const body = rotateResponse.json();
      expect(body.data).toBeDefined();
      expect(body.data.secret).toBeDefined();
      expect(body.data.secret.length).toBeGreaterThan(0);
    });
  });

  describe('Webhook test endpoint', () => {
    it('tests subscription and returns success response', async () => {
      const testResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}/test`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(testResponse.statusCode).toBe(200);
      const body = testResponse.json();
      expect(body.data).toBeDefined();
      expect(body.data.success).toBeDefined();
      expect(body.data.statusCode).toBeDefined();
      expect(body.data.latencyMs).toBeDefined();
    });

    it('returns 404 for non-existent subscription', async () => {
      const testResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/subscriptions/non-existent-id/test',
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(testResponse.statusCode).toBe(404);
    });

    it('rejects test when circuit breaker is open', async () => {
      const pool = getDatabasePool(testConfig);
      await pool.query(
        `INSERT INTO "integration"."webhook_circuit_breakers" 
         (id, subscription_id, total_requests, failed_requests, consecutive_failures, is_open, created_at, updated_at) 
         VALUES ($1, $2, 0, 0, 5, true, NOW(), NOW())`,
        [crypto.randomUUID(), testSubscriptionId],
      );

      const testResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}/test`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(testResponse.statusCode).toBe(503);
      const body = testResponse.json();
      expect(body.message).toContain('Circuit breaker is open');
    });
  });

  describe('Webhook delivery listing', () => {
    it('lists deliveries', async () => {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/deliveries',
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('lists deliveries filtered by subscription', async () => {
      const listResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/webhooks/deliveries?subscriptionId=${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const body = listResponse.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('Authentication and authorization', () => {
    it('returns 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/subscriptions',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/webhooks/subscriptions',
        headers: {
          authorization: 'Bearer invalid_token',
          'x-tenant-id': testTenantId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 with insufficient scope', async () => {
      const clientResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/oauth/clients',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          name: 'Insufficient Scope Client',
          scopes: ['webhooks.read'],
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

      const readOnlyToken = tokenResponse.json().access_token;

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/subscriptions',
        headers: {
          authorization: `Bearer ${readOnlyToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          name: 'Should Fail',
          targetUrl: 'https://example.com/webhook',
          eventTypes: ['auth.user.created'],
        },
      });

      expect(createResponse.statusCode).toBe(403);
    });
  });

  describe('IP allowlist', () => {
    it('creates subscription with IP allowlist', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/subscriptions',
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          name: 'IP Allowlist Webhook',
          targetUrl: 'https://example.com/webhook',
          eventTypes: ['auth.user.created'],
          ipAllowlist: ['192.168.1.1', '10.0.0.1'],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const body = createResponse.json();
      expect(body.data.ipAllowlist).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    it('updates IP allowlist', async () => {
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': testTenantId,
        },
        payload: {
          ipAllowlist: ['192.168.1.100'],
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.data.ipAllowlist).toEqual(['192.168.1.100']);
    });
  });

  describe('Tenant isolation', () => {
    it('rejects subscription for different tenant', async () => {
      const differentTenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/webhooks/subscriptions/${testSubscriptionId}`,
        headers: {
          authorization: `Bearer ${webhookToken}`,
          'x-tenant-id': differentTenantId,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });
});
