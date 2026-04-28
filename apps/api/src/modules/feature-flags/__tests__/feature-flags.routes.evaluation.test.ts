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

describe('Feature flags evaluation routes', () => {
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

  describe('GET /api/v1/features', () => {
    it('returns active flags as key-value map for authenticated user', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      await createFeatureFlag(app, accessToken, {
        name: 'Enabled Flag 1',
        key: 'enabled_flag_1',
        enabledByDefault: true,
        isActive: true,
      });

      await createFeatureFlag(app, accessToken, {
        name: 'Enabled Flag 2',
        key: 'enabled_flag_2',
        enabledByDefault: false,
        isActive: true,
      });

      await createFeatureFlag(app, accessToken, {
        name: 'Inactive Flag',
        key: 'inactive_flag',
        isActive: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const flags = response.json();
      expect(flags.enabled_flag_1).toBe(true);
      expect(flags.enabled_flag_2).toBe(false);
      expect(flags.inactive_flag).toBeUndefined();
    });

    it('returns empty object when no flags exist', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({});
    });
  });

  describe('GET /api/v1/features/:key', () => {
    it('evaluates a specific flag for authenticated user', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      await createFeatureFlag(app, accessToken, {
        name: 'Test Flag',
        key: 'eval_test_flag',
        enabledByDefault: true,
        isActive: true,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features/eval_test_flag',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.key).toBe('eval_test_flag');
      expect(result.enabled).toBe(true);
    });

    it('returns false for disabled flag', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      await createFeatureFlag(app, accessToken, {
        name: 'Disabled Flag',
        key: 'disabled_flag',
        enabledByDefault: false,
        isActive: true,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features/disabled_flag',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.enabled).toBe(false);
    });

    it('returns false for non-existent flag key', async () => {
      const { accessToken } = await registerUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features/non_existent_flag',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.enabled).toBe(false);
    });

    it('respects rollout percentage', async () => {
      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'admin' }]);

      await createFeatureFlag(app, accessToken, {
        name: 'Partial Rollout Flag',
        key: 'partial_rollout',
        enabledByDefault: false,
        rolloutPercentage: 100,
        isActive: true,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/features/partial_rollout',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.enabled).toBe(true);
    });
  });
});
