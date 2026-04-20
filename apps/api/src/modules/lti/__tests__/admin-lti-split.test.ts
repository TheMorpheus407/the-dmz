import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import {
  createIsolatedDatabase,
  createIsolatedTestConfig,
  createTestId,
} from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase } from '../../../shared/database/seed.js';

import type { FastifyInstance } from 'fastify';

const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

vi.mock('../../../shared/middleware/tenant-context.js', () => ({
  tenantContext: vi.fn().mockImplementation(async (request, _reply, next) => {
    request.tenantId = request.headers['x-tenant-id'] as string;
    next();
  }),
}));

const registerAdminUser = async (
  app: FastifyInstance,
  tenantId: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `lti-admin-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'LTI Admin Test User',
    },
  });

  if (registerResponse.statusCode !== 201) {
    throw new Error(
      `Failed to register user: ${registerResponse.statusCode} - ${registerResponse.body}`,
    );
  }

  const accessToken = (registerResponse.json() as { accessToken: string }).accessToken;

  await app.inject({
    method: 'POST',
    url: `/api/v1/admin/users/${(registerResponse.json() as { user: { id: string } }).user.id}/role`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-id': tenantId,
    },
    payload: { role: 'admin' },
  });

  return {
    accessToken,
    user: (registerResponse.json() as { user: { id: string; tenantId: string } }).user,
  };
};

describe('admin-lti routes - split structure', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();

    const databaseName = `dmz_t_lti_${randomUUID().replace(/-/g, '_')}`;
    testConfig = createIsolatedTestConfig(databaseName);
    cleanupDatabase = await createIsolatedDatabase(testConfig);

    const db = getDatabaseClient(testConfig);
    await migrate(db, { migrationsFolder });
    await db.execute(
      sql`ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "device_fingerprint" varchar(128)`,
    );
    await seedDatabase(testConfig);

    app = buildApp(testConfig, { skipHealthCheck: true });
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    app = undefined;
    await closeDatabase();
    if (cleanupDatabase) {
      await cleanupDatabase();
    }
    cleanupDatabase = undefined;
    testConfig = undefined;
  });

  describe('admin-lti-schemas exports', () => {
    it('exports all required platform schemas', async () => {
      const schemas = await import('../admin-lti-schemas.js');

      expect(typeof schemas.createLtiPlatformSchema).toBe('object');
      expect(typeof schemas.updateLtiPlatformSchema).toBe('object');
      expect(typeof schemas.ltiPlatformResponseSchema).toBe('object');
      expect(typeof schemas.ltiPlatformListResponseSchema).toBe('object');
    });

    it('exports all required line item schemas', async () => {
      const schemas = await import('../admin-lti-schemas.js');

      expect(typeof schemas.createLtiLineItemSchema).toBe('object');
      expect(typeof schemas.updateLtiLineItemSchema).toBe('object');
      expect(typeof schemas.ltiLineItemResponseSchema).toBe('object');
      expect(typeof schemas.ltiLineItemListResponseSchema).toBe('object');
    });

    it('exports all required deep link content schemas', async () => {
      const schemas = await import('../admin-lti-schemas.js');

      expect(typeof schemas.createLtiDeepLinkContentSchema).toBe('object');
      expect(typeof schemas.updateLtiDeepLinkContentSchema).toBe('object');
      expect(typeof schemas.ltiDeepLinkContentResponseSchema).toBe('object');
      expect(typeof schemas.ltiDeepLinkContentListResponseSchema).toBe('object');
    });

    it('exports all required score schemas', async () => {
      const schemas = await import('../admin-lti-schemas.js');

      expect(typeof schemas.createLtiScoreSchema).toBe('object');
      expect(typeof schemas.ltiScoreResponseSchema).toBe('object');
      expect(typeof schemas.ltiScoreListResponseSchema).toBe('object');
    });

    it('exports all required session schemas', async () => {
      const schemas = await import('../admin-lti-schemas.js');

      expect(typeof schemas.ltiSessionResponseSchema).toBe('object');
      expect(typeof schemas.ltiSessionListResponseSchema).toBe('object');
    });
  });

  describe('admin-lti-platforms.routes exports', () => {
    it('exports registerAdminLtiPlatforms function', async () => {
      const platforms = await import('../admin-lti-platforms.routes.js');

      expect(typeof platforms.registerAdminLtiPlatforms).toBe('function');
    });

    it('registerAdminLtiPlatforms is a Fastify route registration function', async () => {
      const platforms = await import('../admin-lti-platforms.routes.js');

      expect(platforms.registerAdminLtiPlatforms.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('admin-lti-line-items.routes exports', () => {
    it('exports registerAdminLtiLineItems function', async () => {
      const lineItems = await import('../admin-lti-line-items.routes.js');

      expect(typeof lineItems.registerAdminLtiLineItems).toBe('function');
    });

    it('registerAdminLtiLineItems is a Fastify route registration function', async () => {
      const lineItems = await import('../admin-lti-line-items.routes.js');

      expect(lineItems.registerAdminLtiLineItems.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('admin-lti-deep-links.routes exports', () => {
    it('exports registerAdminLtiDeepLinks function', async () => {
      const deepLinks = await import('../admin-lti-deep-links.routes.js');

      expect(typeof deepLinks.registerAdminLtiDeepLinks).toBe('function');
    });

    it('registerAdminLtiDeepLinks is a Fastify route registration function', async () => {
      const deepLinks = await import('../admin-lti-deep-links.routes.js');

      expect(deepLinks.registerAdminLtiDeepLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('admin-lti-scores.routes exports', () => {
    it('exports registerAdminLtiScores function', async () => {
      const scores = await import('../admin-lti-scores.routes.js');

      expect(typeof scores.registerAdminLtiScores).toBe('function');
    });

    it('registerAdminLtiScores is a Fastify route registration function', async () => {
      const scores = await import('../admin-lti-scores.routes.js');

      expect(scores.registerAdminLtiScores.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('admin-lti-sessions.routes exports', () => {
    it('exports registerAdminLtiSessions function', async () => {
      const sessions = await import('../admin-lti-sessions.routes.js');

      expect(typeof sessions.registerAdminLtiSessions).toBe('function');
    });

    it('registerAdminLtiSessions is a Fastify route registration function', async () => {
      const sessions = await import('../admin-lti-sessions.routes.js');

      expect(sessions.registerAdminLtiSessions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('admin-lti.routes exports', () => {
    it('exports registerAdminLtiRoutes function for backward compatibility', async () => {
      const adminLti = await import('../admin-lti.routes.js');

      expect(typeof adminLti.registerAdminLtiRoutes).toBe('function');
    });
  });

  describe('platforms routes - /admin/lti/platforms', () => {
    it('GET /admin/lti/platforms returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/platforms',
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /admin/lti/platforms returns 200 with valid admin token', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('GET /admin/lti/platforms/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/platforms/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /admin/lti/platforms/:id returns 404 for non-existent platform', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/platforms/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('POST /admin/lti/platforms returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        payload: {
          name: 'Test Platform',
          platformUrl: 'https://test.example.edu',
          clientId: 'test-client',
          publicKeysetUrl: 'https://test.example.edu/.well-known/jwks.json',
          authTokenUrl: 'https://test.example.edu/token',
          authLoginUrl: 'https://test.example.edu/login',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('POST /admin/lti/platforms creates a platform with valid data', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Canvas LMS',
          platformUrl: 'https://canvas.example.edu',
          clientId: 'canvas-client-id',
          publicKeysetUrl: 'https://canvas.example.edu/.well-known/jwks.json',
          authTokenUrl: 'https://canvas.example.edu/login/oauth2/token',
          authLoginUrl: 'https://canvas.example.edu/api/oidc/login',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('platformId');
      expect(body.name).toBe('Canvas LMS');
      expect(body.tenantId).toBe(user.tenantId);
    });

    it('PATCH /admin/lti/platforms/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'PATCH',
        url: '/admin/lti/platforms/00000000-0000-0000-0000-000000000000',
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('DELETE /admin/lti/platforms/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'DELETE',
        url: '/admin/lti/platforms/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('lineitems routes - /admin/lti/lineitems', () => {
    it('GET /admin/lti/lineitems returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/lineitems',
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /admin/lti/lineitems returns 200 with valid admin token', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('GET /admin/lti/lineitems/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/lineitems/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('POST /admin/lti/lineitems returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        payload: {
          platformId: '00000000-0000-0000-0000-000000000000',
          label: 'Test Assignment',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('PATCH /admin/lti/lineitems/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'PATCH',
        url: '/admin/lti/lineitems/00000000-0000-0000-0000-000000000000',
        payload: { label: 'Updated Label' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('DELETE /admin/lti/lineitems/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'DELETE',
        url: '/admin/lti/lineitems/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('deep-link content routes - /admin/lti/deep-link/content', () => {
    it('GET /admin/lti/deep-link/content returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/deep-link/content',
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /admin/lti/deep-link/content returns 200 with valid admin token', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/deep-link/content',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('GET /admin/lti/deep-link/content/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/deep-link/content/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });

    it('POST /admin/lti/deep-link/content returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/deep-link/content',
        payload: {
          platformId: '00000000-0000-0000-0000-000000000000',
          contentType: 'link',
          title: 'Test Content',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('PATCH /admin/lti/deep-link/content/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'PATCH',
        url: '/admin/lti/deep-link/content/00000000-0000-0000-0000-000000000000',
        payload: { title: 'Updated Title' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('DELETE /admin/lti/deep-link/content/:id returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'DELETE',
        url: '/admin/lti/deep-link/content/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('scores routes - /admin/lti/scores', () => {
    it('GET /admin/lti/scores returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/scores',
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /admin/lti/scores returns 200 with valid admin token', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/scores',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('POST /admin/lti/scores returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/scores',
        payload: {
          lineItemId: '00000000-0000-0000-0000-000000000000',
          userId: 'test-user',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('sessions routes - /admin/lti/sessions', () => {
    it('GET /admin/lti/sessions returns 401 without authentication', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/sessions',
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /admin/lti/sessions returns 200 with valid admin token', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('shared preHandler middleware', () => {
    it('all admin LTI routes require admin role', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const routes = [
        { method: 'GET', url: '/admin/lti/platforms' },
        { method: 'GET', url: '/admin/lti/lineitems' },
        { method: 'GET', url: '/admin/lti/deep-link/content' },
        { method: 'GET', url: '/admin/lti/scores' },
        { method: 'GET', url: '/admin/lti/sessions' },
      ];

      for (const route of routes) {
        const response = await app!.inject({
          method: route.method,
          url: route.url,
          headers: {
            authorization: `Bearer ${accessToken}`,
            'x-tenant-id': user.tenantId,
          },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
      }
    });
  });

  describe('platforms CRUD lifecycle', () => {
    const validPlatformPayload = {
      name: 'Canvas LMS',
      platformUrl: 'https://canvas.example.edu',
      clientId: 'canvas-client-id',
      publicKeysetUrl: 'https://canvas.example.edu/.well-known/jwks.json',
      authTokenUrl: 'https://canvas.example.edu/login/oauth2/token',
      authLoginUrl: 'https://canvas.example.edu/api/oidc/login',
    };

    it('POST /admin/lti/platforms creates platform and returns 201 with correct response structure', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: validPlatformPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('platformId');
      expect(body).toHaveProperty('tenantId');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('platformUrl');
      expect(body).toHaveProperty('clientId');
      expect(body).toHaveProperty('deploymentId');
      expect(body).toHaveProperty('publicKeysetUrl');
      expect(body).toHaveProperty('authTokenUrl');
      expect(body).toHaveProperty('authLoginUrl');
      expect(body).toHaveProperty('jwks');
      expect(body).toHaveProperty('toolUrl');
      expect(body).toHaveProperty('isActive');
      expect(body).toHaveProperty('lastValidationStatus');
      expect(body).toHaveProperty('lastValidatedAt');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
      expect(body.platformId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(body.tenantId).toBe(user.tenantId);
      expect(body.name).toBe(validPlatformPayload.name);
      expect(body.platformUrl).toBe(validPlatformPayload.platformUrl);
      expect(typeof body.isActive).toBe('boolean');
    });

    it('GET /admin/lti/platforms/:id returns created platform with correct structure', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: validPlatformPayload,
      });

      const created = createResponse.json();
      const platformId = created.platformId;

      const getResponse = await app!.inject({
        method: 'GET',
        url: `/admin/lti/platforms/${platformId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body.platformId).toBe(platformId);
      expect(body.name).toBe(validPlatformPayload.name);
      expect(body.tenantId).toBe(user.tenantId);
    });

    it('PATCH /admin/lti/platforms/:id updates platform and returns updated data', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: validPlatformPayload,
      });

      const created = createResponse.json();
      const platformId = created.platformId;

      const patchResponse = await app!.inject({
        method: 'PATCH',
        url: `/admin/lti/platforms/${platformId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: { name: 'Updated Canvas LMS' },
      });

      expect(patchResponse.statusCode).toBe(200);
      const body = patchResponse.json();
      expect(body.platformId).toBe(platformId);
      expect(body.name).toBe('Updated Canvas LMS');
    });

    it('DELETE /admin/lti/platforms/:id removes platform and returns 204', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: validPlatformPayload,
      });

      const created = createResponse.json();
      const platformId = created.platformId;

      const deleteResponse = await app!.inject({
        method: 'DELETE',
        url: `/admin/lti/platforms/${platformId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);
    });

    it('GET /admin/lti/platforms/:id returns 404 after deletion', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: validPlatformPayload,
      });

      const created = createResponse.json();
      const platformId = created.platformId;

      await app!.inject({
        method: 'DELETE',
        url: `/admin/lti/platforms/${platformId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      const getResponse = await app!.inject({
        method: 'GET',
        url: `/admin/lti/platforms/${platformId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('platform schema validation', () => {
    const validPayload = {
      name: 'Canvas LMS',
      platformUrl: 'https://canvas.example.edu',
      clientId: 'canvas-client-id',
      publicKeysetUrl: 'https://canvas.example.edu/.well-known/jwks.json',
      authTokenUrl: 'https://canvas.example.edu/login/oauth2/token',
      authLoginUrl: 'https://canvas.example.edu/api/oidc/login',
    };

    it('rejects platform creation with missing required fields', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: { name: 'Test' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects platform creation with invalid UUID for platformUrl', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: { ...validPayload, platformUrl: 'not-a-valid-url' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects platform creation with name exceeding maxLength (255)', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: { ...validPayload, name: 'a'.repeat(256) },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects platform creation with empty string for required minLength field', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: { ...validPayload, name: '' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('lineitems CRUD lifecycle', () => {
    let platformId: string;
    let accessToken: string;
    let tenantId: string;

    beforeEach(async () => {
      const result = await registerAdminUser(app!, '00000000-0000-0000-0000-000000000000');
      accessToken = result.accessToken;
      tenantId = result.user.tenantId;

      const platformResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          name: 'Test Platform',
          platformUrl: 'https://test.example.edu',
          clientId: 'test-client',
          publicKeysetUrl: 'https://test.example.edu/.well-known/jwks.json',
          authTokenUrl: 'https://test.example.edu/token',
          authLoginUrl: 'https://test.example.edu/login',
        },
      });

      platformId = platformResponse.json().platformId;
    });

    const validLineItemPayload = {
      platformId: '', // Will be set in beforeEach
      label: 'Test Assignment',
      scoreMaximum: 100,
    };

    it('POST /admin/lti/lineitems creates line item and returns 201 with correct structure', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: { ...validLineItemPayload, platformId },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('lineItemId');
      expect(body).toHaveProperty('tenantId');
      expect(body).toHaveProperty('platformId');
      expect(body).toHaveProperty('label');
      expect(body).toHaveProperty('scoreMaximum');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
      expect(body.platformId).toBe(platformId);
      expect(body.label).toBe('Test Assignment');
      expect(body.scoreMaximum).toBe(100);
    });

    it('GET /admin/lti/lineitems/:id returns created line item', async () => {
      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: { ...validLineItemPayload, platformId },
      });

      const created = createResponse.json();
      const lineItemId = created.lineItemId;

      const getResponse = await app!.inject({
        method: 'GET',
        url: `/admin/lti/lineitems/${lineItemId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.statusCode).toBe(200);
      const body = getResponse.json();
      expect(body.lineItemId).toBe(lineItemId);
      expect(body.platformId).toBe(platformId);
    });

    it('PATCH /admin/lti/lineitems/:id updates line item', async () => {
      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: { ...validLineItemPayload, platformId },
      });

      const created = createResponse.json();
      const lineItemId = created.lineItemId;

      const patchResponse = await app!.inject({
        method: 'PATCH',
        url: `/admin/lti/lineitems/${lineItemId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: { label: 'Updated Assignment', scoreMaximum: 200 },
      });

      expect(patchResponse.statusCode).toBe(200);
      const body = patchResponse.json();
      expect(body.label).toBe('Updated Assignment');
      expect(body.scoreMaximum).toBe(200);
    });

    it('DELETE /admin/lti/lineitems/:id removes line item and returns 204', async () => {
      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: { ...validLineItemPayload, platformId },
      });

      const created = createResponse.json();
      const lineItemId = created.lineItemId;

      const deleteResponse = await app!.inject({
        method: 'DELETE',
        url: `/admin/lti/lineitems/${lineItemId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);
    });

    it('GET /admin/lti/lineitems/:id returns 404 after deletion', async () => {
      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: { ...validLineItemPayload, platformId },
      });

      const created = createResponse.json();
      const lineItemId = created.lineItemId;

      await app!.inject({
        method: 'DELETE',
        url: `/admin/lti/lineitems/${lineItemId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const getResponse = await app!.inject({
        method: 'GET',
        url: `/admin/lti/lineitems/${lineItemId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('lineitem schema validation', () => {
    let platformId: string;
    let accessToken: string;
    let tenantId: string;

    beforeEach(async () => {
      const result = await registerAdminUser(app!, '00000000-0000-0000-0000-000000000000');
      accessToken = result.accessToken;
      tenantId = result.user.tenantId;

      const platformResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          name: 'Test Platform',
          platformUrl: 'https://test.example.edu',
          clientId: 'test-client',
          publicKeysetUrl: 'https://test.example.edu/.well-known/jwks.json',
          authTokenUrl: 'https://test.example.edu/token',
          authLoginUrl: 'https://test.example.edu/login',
        },
      });

      platformId = platformResponse.json().platformId;
    });

    it('rejects line item with missing required fields (platformId, label)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects line item with invalid UUID for platformId', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId: 'not-a-uuid',
          label: 'Test',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects line item with scoreMaximum exceeding maximum (1000)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId,
          label: 'Test',
          scoreMaximum: 1001,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects line item with scoreMaximum below minimum (1)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId,
          label: 'Test',
          scoreMaximum: 0,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects line item with label exceeding maxLength (255)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId,
          label: 'a'.repeat(256),
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects line item with empty string for minLength field (label)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId,
          label: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('cross-entity integrity', () => {
    let accessToken: string;
    let tenantId: string;

    beforeEach(async () => {
      const result = await registerAdminUser(app!, '00000000-0000-0000-0000-000000000000');
      accessToken = result.accessToken;
      tenantId = result.user.tenantId;
    });

    it('rejects line item creation with non-existent platformId', async () => {
      const nonExistentPlatformId = '00000000-0000-0000-0000-000000000001';

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId: nonExistentPlatformId,
          label: 'Test Assignment',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects deep link content creation with non-existent platformId', async () => {
      const nonExistentPlatformId = '00000000-0000-0000-0000-000000000001';

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/deep-link/content',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId: nonExistentPlatformId,
          contentType: 'link',
          title: 'Test Content',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects score creation with non-existent lineItemId', async () => {
      const nonExistentLineItemId = '00000000-0000-0000-0000-000000000001';

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/scores',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          lineItemId: nonExistentLineItemId,
          userId: 'test-user',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('deep link content schema validation', () => {
    let platformId: string;
    let accessToken: string;
    let tenantId: string;

    beforeEach(async () => {
      const result = await registerAdminUser(app!, '00000000-0000-0000-0000-000000000000');
      accessToken = result.accessToken;
      tenantId = result.user.tenantId;

      const platformResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          name: 'Test Platform',
          platformUrl: 'https://test.example.edu',
          clientId: 'test-client',
          publicKeysetUrl: 'https://test.example.edu/.well-known/jwks.json',
          authTokenUrl: 'https://test.example.edu/token',
          authLoginUrl: 'https://test.example.edu/login',
        },
      });

      platformId = platformResponse.json().platformId;
    });

    it('rejects deep link content with malformed URL (missing scheme)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/deep-link/content',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId,
          contentType: 'link',
          title: 'Test Content',
          url: 'not-a-valid-url',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects deep link content with contentType exceeding maxLength (50)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/deep-link/content',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId,
          contentType: 'a'.repeat(51),
          title: 'Test Content',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('score schema validation', () => {
    let platformId: string;
    let lineItemId: string;
    let accessToken: string;
    let tenantId: string;

    beforeEach(async () => {
      const result = await registerAdminUser(app!, '00000000-0000-0000-0000-000000000000');
      accessToken = result.accessToken;
      tenantId = result.user.tenantId;

      const platformResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          name: 'Test Platform',
          platformUrl: 'https://test.example.edu',
          clientId: 'test-client',
          publicKeysetUrl: 'https://test.example.edu/.well-known/jwks.json',
          authTokenUrl: 'https://test.example.edu/token',
          authLoginUrl: 'https://test.example.edu/login',
        },
      });

      platformId = platformResponse.json().platformId;

      const lineItemResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          platformId,
          label: 'Test Assignment',
          scoreMaximum: 100,
        },
      });

      lineItemId = lineItemResponse.json().lineItemId;
    });

    it('rejects score with scoreMaximum exceeding maximum (1000)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/scores',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          lineItemId,
          userId: 'test-user',
          scoreMaximum: 1001,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects score with invalid UUID for lineItemId', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/scores',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          lineItemId: 'not-a-uuid',
          userId: 'test-user',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts score with scoreGiven of 0 (minimum boundary)', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/admin/lti/scores',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        payload: {
          lineItemId,
          userId: 'test-user',
          scoreGiven: 0,
          scoreMaximum: 100,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('response structure verification', () => {
    it('platform list response contains array of platform objects', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
      for (const platform of body) {
        expect(platform).toHaveProperty('platformId');
        expect(platform).toHaveProperty('tenantId');
        expect(platform).toHaveProperty('name');
        expect(platform).toHaveProperty('platformUrl');
        expect(platform).toHaveProperty('isActive');
        expect(platform).toHaveProperty('createdAt');
        expect(platform).toHaveProperty('updatedAt');
      }
    });

    it('lineitem list response contains array with correct field types', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const response = await app!.inject({
        method: 'GET',
        url: '/admin/lti/lineitems',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
      for (const item of body) {
        expect(item).toHaveProperty('lineItemId');
        expect(item).toHaveProperty('tenantId');
        expect(item).toHaveProperty('platformId');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('scoreMaximum');
        expect(typeof item.scoreMaximum).toBe('number');
      }
    });

    it('nullable fields are correctly null in responses', async () => {
      const { accessToken, user } = await registerAdminUser(
        app!,
        '00000000-0000-0000-0000-000000000000',
      );

      const createResponse = await app!.inject({
        method: 'POST',
        url: '/admin/lti/platforms',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-tenant-id': user.tenantId,
        },
        payload: {
          name: 'Canvas LMS',
          platformUrl: 'https://canvas.example.edu',
          clientId: 'canvas-client-id',
          publicKeysetUrl: 'https://canvas.example.edu/.well-known/jwks.json',
          authTokenUrl: 'https://canvas.example.edu/login/oauth2/token',
          authLoginUrl: 'https://canvas.example.edu/api/oidc/login',
        },
      });

      const created = createResponse.json();
      expect(created.toolUrl).toBeNull();
      expect(created.lastValidatedAt).toBeNull();
      expect(created.lastValidationStatus).toBeNull();
    });
  });
});
