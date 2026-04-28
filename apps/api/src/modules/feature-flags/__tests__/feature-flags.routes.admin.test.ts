import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedTenantAuthModel } from '../../../shared/database/seed.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';

import {
  testConfig,
  registerUser,
  createFeatureFlag,
  setupApp,
  cleanupApp,
} from './feature-flags.routes.test.js';

describe('Admin feature flags routes', () => {
  let app: Awaited<ReturnType<typeof setupApp>>;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await cleanupApp(app);
  });

  beforeEach(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
  });

  describe('GET /api/v1/admin/features', () => {
    it('returns empty array when no flags exist', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it('returns only active flags by default', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      await createFeatureFlag(app, accessToken, {
        name: 'Active Flag',
        key: 'active_flag',
        isActive: true,
      });

      await createFeatureFlag(app, accessToken, {
        name: 'Inactive Flag',
        key: 'inactive_flag',
        isActive: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const flags = response.json();
      expect(flags).toHaveLength(1);
      expect(flags[0].name).toBe('Active Flag');
    });

    it('returns all flags when includeInactive=true', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      await createFeatureFlag(app, accessToken, {
        name: 'Active Flag',
        key: 'active_flag',
        isActive: true,
      });

      await createFeatureFlag(app, accessToken, {
        name: 'Inactive Flag',
        key: 'inactive_flag',
        isActive: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features?includeInactive=true',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const flags = response.json();
      expect(flags).toHaveLength(2);
    });
  });

  describe('POST /api/v1/admin/features', () => {
    it('creates a new feature flag', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'New Feature',
          key: 'new_feature',
          description: 'A new feature flag',
          enabledByDefault: true,
          rolloutPercentage: 50,
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const flag = response.json();
      expect(flag.name).toBe('New Feature');
      expect(flag.key).toBe('new_feature');
      expect(flag.description).toBe('A new feature flag');
      expect(flag.enabledByDefault).toBe(true);
      expect(flag.rolloutPercentage).toBe(50);
      expect(flag.isActive).toBe(true);
      expect(flag.tenantId).toBe(user.tenantId);
      expect(flag.id).toBeDefined();
      expect(flag.createdAt).toBeDefined();
      expect(flag.updatedAt).toBeDefined();
    });

    it('returns 409 when flag with same key already exists', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      await createFeatureFlag(app, accessToken, {
        name: 'Existing Flag',
        key: 'existing_key',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Duplicate Flag',
          key: 'existing_key',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('returns 400 for invalid payload', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: '',
          key: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when rolloutPercentage is out of range', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Invalid Rollout',
          key: 'invalid_rollout',
          rolloutPercentage: 150,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/admin/features/:id', () => {
    it('returns a feature flag by ID', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const created = await createFeatureFlag(app, accessToken, {
        name: 'Test Flag',
        key: 'test_flag_get',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/features/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const flag = response.json();
      expect(flag.id).toBe(created.id);
      expect(flag.name).toBe('Test Flag');
      expect(flag.key).toBe('test_flag_get');
    });

    it('returns 404 for non-existent flag ID', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features/00000000-0000-0000-0000-000000000099',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid UUID format', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/features/not-a-uuid',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/admin/features/:id', () => {
    it('updates a feature flag', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const created = await createFeatureFlag(app, accessToken, {
        name: 'Original Name',
        key: 'update_test',
        rolloutPercentage: 0,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/features/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated Name',
          rolloutPercentage: 75,
        },
      });

      expect(response.statusCode).toBe(200);
      const flag = response.json();
      expect(flag.name).toBe('Updated Name');
      expect(flag.rolloutPercentage).toBe(75);
    });

    it('returns 404 when updating non-existent flag', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/features/00000000-0000-0000-0000-000000000099',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('allows partial updates', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const created = await createFeatureFlag(app, accessToken, {
        name: 'Original Name',
        key: 'partial_update_test',
        description: 'Original description',
        enabledByDefault: false,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/features/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          name: 'Updated Name Only',
        },
      });

      expect(response.statusCode).toBe(200);
      const flag = response.json();
      expect(flag.name).toBe('Updated Name Only');
      expect(flag.description).toBe('Original description');
      expect(flag.enabledByDefault).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/features/:id', () => {
    it('deletes a feature flag', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const created = await createFeatureFlag(app, accessToken, {
        name: 'To Be Deleted',
        key: 'delete_test',
      });

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/features/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/features/${created.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('returns 404 when deleting non-existent flag', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/features/00000000-0000-0000-0000-000000000099',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/admin/features/:id/override', () => {
    it('sets a tenant override for a feature flag', async () => {
      const { accessToken, user: adminUser } = await registerUser(app);
      await seedTenantAuthModel(testConfig, adminUser.tenantId, [
        { userId: adminUser.id, role: 'admin' },
      ]);

      const targetTenantResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `target-tenant-${Math.random().toString(36).slice(2)}@archive.test`,
          password: 'Valid' + 'Pass123!',
          displayName: 'Target Tenant User',
        },
      });
      const targetUser = targetTenantResponse.json() as { user: { tenantId: string } };

      const created = await createFeatureFlag(app, accessToken, {
        name: 'Override Test Flag',
        key: 'override_test',
        enabledByDefault: false,
        rolloutPercentage: 0,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/features/${created.id}/override`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          tenantId: targetUser.user.tenantId,
          enabled: true,
          rolloutPercentage: 100,
        },
      });

      expect(response.statusCode).toBe(201);
      const override = response.json();
      expect(override.flagId).toBe(created.id);
      expect(override.tenantId).toBe(targetUser.user.tenantId);
      expect(override.enabled).toBe(true);
      expect(override.rolloutPercentage).toBe(100);
    });

    it('updates existing tenant override', async () => {
      const { accessToken, user: adminUser } = await registerUser(app);
      await seedTenantAuthModel(testConfig, adminUser.tenantId, [
        { userId: adminUser.id, role: 'admin' },
      ]);

      const targetTenantResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `target-tenant-2-${Math.random().toString(36).slice(2)}@archive.test`,
          password: 'Valid' + 'Pass123!',
          displayName: 'Target Tenant User 2',
        },
      });
      const targetUser = targetTenantResponse.json() as { user: { tenantId: string } };

      const created = await createFeatureFlag(app, accessToken, {
        name: 'Override Update Test',
        key: 'override_update_test',
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/admin/features/${created.id}/override`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          tenantId: targetUser.user.tenantId,
          enabled: false,
        },
      });

      const updateResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/features/${created.id}/override`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          tenantId: targetUser.user.tenantId,
          enabled: true,
          rolloutPercentage: 50,
        },
      });

      expect(updateResponse.statusCode).toBe(201);
      const override = updateResponse.json();
      expect(override.enabled).toBe(true);
      expect(override.rolloutPercentage).toBe(50);
    });
  });
});
