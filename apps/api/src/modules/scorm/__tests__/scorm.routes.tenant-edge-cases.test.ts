import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';

vi.mock('../../../shared/middleware/authorization.js', async () => {
  const actual = await vi.importActual('../../../shared/middleware/authorization.js');

  return {
    ...actual,
    authGuard: async () => undefined,
    requirePermission: () => async () => undefined,
  };
});

vi.mock('../../../shared/middleware/tenant-context.js', () => ({
  tenantContext: async (request: Record<string, unknown>, _reply: Record<string, unknown>) => {
    request.tenantContext = {
      tenantId: null as unknown as string,
      userId: 'test-user',
      sessionId: 'test-session',
      role: 'user',
      isSuperAdmin: false,
    };
  },
}));

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

describe('SCORM routes - tenant validation edge cases', () => {
  const app = buildApp(createTestConfig());

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  it('returns 500 when tenantContext.tenantId is null', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/scorm/registrations',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        packageId: '00000000-0000-0000-0000-000000000000',
        userId: 'test-user',
      },
    });

    expect(createResponse.statusCode).toBe(500);
    const body = createResponse.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Internal Server Error');
  });

  it('returns 500 when tenantContext is undefined', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/scorm/registrations',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        packageId: '00000000-0000-0000-0000-000000000000',
        userId: 'test-user',
      },
    });

    expect(createResponse.statusCode).toBe(500);
    const body = createResponse.json();
    expect(body.success).toBe(false);
  });
});
