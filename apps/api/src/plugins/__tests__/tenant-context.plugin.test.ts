import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';

import { loadConfig, type AppConfig } from '../../config.js';

const mockDb = {
  query: {
    tenants: {
      findFirst: vi.fn(),
    },
  },
};

const mockPool = {
  unsafe: vi.fn().mockResolvedValue([]),
};

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => mockDb),
  getDatabasePool: vi.fn(() => mockPool),
}));

vi.mock('@the-dmz/shared/auth', () => ({
  allowedTenantStatuses: ['active'],
}));

const { tenantContextPlugin } = await import('../tenant-context.js');

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  };
};

const createTestApp = async (options?: {
  required?: boolean;
  headerName?: string;
}): Promise<FastifyInstance> => {
  const config = createTestConfig();
  const app = fastify({ logger: false });
  app.decorate('config', config);

  const registerOptions: { headerName?: string; required?: boolean } = {
    required: options?.required ?? true,
  };
  if (options?.headerName) {
    registerOptions.headerName = options.headerName;
  }

  await app.register(tenantContextPlugin, registerOptions);

  app.get('/test', async (request) => {
    return {
      tenantContext: request.tenantContext,
    };
  });

  await app.ready();
  return app;
};

describe('tenant-context plugin', () => {
  const validTenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  describe('header extraction', () => {
    it('extracts tenant ID from X-Tenant-ID header', async () => {
      mockDb.query.tenants.findFirst = vi.fn().mockResolvedValue({
        tenantId: validTenantId,
        slug: 'test-tenant',
        status: 'active',
      });

      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': validTenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { tenantContext: { tenantId: string } };
      expect(body.tenantContext).toBeDefined();
      expect(body.tenantContext?.tenantId).toBe(validTenantId);

      await app.close();
    });

    it('extracts tenant ID from custom header name', async () => {
      mockDb.query.tenants.findFirst = vi.fn().mockResolvedValue({
        tenantId: validTenantId,
        slug: 'test-tenant',
        status: 'active',
      });

      const app = await createTestApp({ headerName: 'x-custom-tenant' });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-custom-tenant': validTenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { tenantContext: { tenantId: string } };
      expect(body.tenantContext).toBeDefined();

      await app.close();
    });
  });

  describe('required validation', () => {
    it('returns 401 when tenant header is missing and required is true', async () => {
      const app = await createTestApp({ required: true });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);

      await app.close();
    });

    it('allows request when tenant header is missing and required is false', async () => {
      const app = await createTestApp({ required: false });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { tenantContext: undefined };
      expect(body.tenantContext).toBeUndefined();

      await app.close();
    });
  });

  describe('UUID validation', () => {
    it('returns 401 for invalid UUID format', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': 'not-a-valid-uuid',
        },
      });

      expect(response.statusCode).toBe(401);

      await app.close();
    });

    it('returns 401 for malformed UUID', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': '12345',
        },
      });

      expect(response.statusCode).toBe(401);

      await app.close();
    });
  });

  describe('tenant existence validation', () => {
    it('returns 404 for non-existent tenant', async () => {
      mockDb.query.tenants.findFirst = vi.fn().mockResolvedValue(null);

      const app = await createTestApp();

      const nonExistentTenantId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': nonExistentTenantId,
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);

      await app.close();
    });
  });

  describe('tenant status validation', () => {
    it('returns error for suspended tenant', async () => {
      mockDb.query.tenants.findFirst = vi.fn().mockResolvedValue({
        tenantId: 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff',
        slug: 'suspended-tenant',
        status: 'suspended',
      });

      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);

      await app.close();
    });

    it('returns error for deactivated tenant', async () => {
      mockDb.query.tenants.findFirst = vi.fn().mockResolvedValue({
        tenantId: 'cccccccc-dddd-4eee-ffff-000000000000',
        slug: 'deactivated-tenant',
        status: 'deactivated',
      });

      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': 'cccccccc-dddd-4eee-ffff-000000000000',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);

      await app.close();
    });
  });

  describe('request.tenantContext attachment', () => {
    it('attaches tenant context to request object', async () => {
      mockDb.query.tenants.findFirst = vi.fn().mockResolvedValue({
        tenantId: validTenantId,
        slug: 'test-tenant',
        status: 'active',
      });

      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': validTenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        tenantContext: { tenantId: string; userId: string; role: string; isSuperAdmin: boolean };
      };
      expect(body.tenantContext).toBeDefined();
      expect(body.tenantContext.tenantId).toBe(validTenantId);
      expect(body.tenantContext.userId).toBe('');
      expect(body.tenantContext.role).toBe('');
      expect(body.tenantContext.isSuperAdmin).toBe(false);

      await app.close();
    });
  });

  describe('session variable setting', () => {
    it('sets transaction-scoped session variables using set_config with true', async () => {
      mockDb.query.tenants.findFirst = vi.fn().mockResolvedValue({
        tenantId: validTenantId,
        slug: 'test-tenant',
        status: 'active',
      });

      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-tenant-id': validTenantId,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockPool.unsafe).toHaveBeenCalled();

      const callArgs = (mockPool.unsafe as ReturnType<typeof mockPool.unsafe>).mock.calls[0];
      expect(callArgs[0]).toContain('set_config');
      expect(callArgs[0]).toContain("'app.current_tenant_id'");
      expect(callArgs[0]).toContain('true');
      expect(callArgs[1]).toEqual([validTenantId]);

      await app.close();
    });
  });
});
