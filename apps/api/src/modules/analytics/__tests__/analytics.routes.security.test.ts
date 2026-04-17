import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const phishingMetricsServiceMock = vi.hoisted(() => ({
  computeAggregatedMetrics: vi.fn(),
}));

const decisionQualityServiceMock = vi.hoisted(() => ({
  computePlayerScore: vi.fn(),
  computeAllPlayerScores: vi.fn(),
  computeTrends: vi.fn(),
}));

const analyticsServiceMock = vi.hoisted(() => ({
  getHealth: vi.fn().mockReturnValue({
    status: 'healthy',
    details: {
      circuitBreaker: 'closed',
      queueDepth: 0,
      queueMaxSize: 1000,
      eventsIngested: 0,
      eventsFailed: 0,
      lastProcessedAt: null,
    },
  }),
  getMetrics: vi.fn().mockReturnValue({
    eventsIngested: 0,
    eventsFailed: 0,
    eventsRetried: 0,
    queueDepth: 0,
    processingLatencyMs: 0,
    lastProcessedAt: null,
  }),
}));

vi.mock('../phishing-metrics.service.js', async () => {
  const actual = await vi.importActual('../phishing-metrics.service.js');
  return {
    ...actual,
    PhishingMetricsService: vi.fn().mockImplementation(() => phishingMetricsServiceMock),
  };
});

vi.mock('../decision-quality.service.js', async () => {
  const actual = await vi.importActual('../decision-quality.service.js');
  return {
    ...actual,
    DecisionQualityService: vi.fn().mockImplementation(() => decisionQualityServiceMock),
  };
});

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../../shared/database/seed.js';

import type { FastifyInstance } from 'fastify';
import type { AnalyticsService } from '../analytics.service.js';

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

const createIsolatedTestConfig = (databaseName: string): AppConfig => ({
  ...createTestConfig(),
  DATABASE_URL: `postgresql://dmz:dmz_dev@localhost:5432/${databaseName}`,
});

const adminDatabaseUrl = 'postgresql://dmz:dmz_dev@localhost:5432/postgres';
const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

const createIsolatedDatabase = async (config: AppConfig): Promise<() => Promise<void>> => {
  const databaseName = new URL(config.DATABASE_URL).pathname.replace(/^\//, '');
  const adminPool = postgres(adminDatabaseUrl, { max: 1 });

  const cleanup = async (): Promise<void> => {
    await adminPool.unsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${databaseName}'
        AND pid <> pg_backend_pid()
    `);
    await adminPool.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end({ timeout: 5 });
  };

  try {
    await adminPool.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.unsafe(`CREATE DATABASE "${databaseName}"`);
    return cleanup;
  } catch (error) {
    await adminPool.end({ timeout: 5 });
    throw error;
  }
};

const registerUser = async (
  app: FastifyInstance,
  email?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = email ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `analytics-security-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Analytics Security Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register analytics security test user: ${response.statusCode}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

const analyticsEndpoints = [
  {
    method: 'POST' as const,
    url: '/api/v1/analytics/phishing',
    hasInvalidToken: true,
    hasTargetTenantId: true,
  },
  {
    method: 'POST' as const,
    url: '/api/v1/analytics/scoring',
    hasInvalidToken: true,
    hasTargetTenantId: false,
  },
  {
    method: 'POST' as const,
    url: '/api/v1/analytics/trends',
    hasInvalidToken: true,
    hasTargetTenantId: false,
  },
  {
    method: 'GET' as const,
    url: '/api/v1/analytics/health',
    hasInvalidToken: true,
    hasTargetTenantId: false,
  },
  {
    method: 'GET' as const,
    url: '/api/v1/analytics/metrics',
    hasInvalidToken: true,
    hasTargetTenantId: false,
  },
] as const;

describe('analytics routes security', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const databaseName = `dmz_t_ars_${randomUUID().replace(/-/g, '_')}`;
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

    app.decorate('analytics', analyticsServiceMock as unknown as AnalyticsService);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
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

  describe.each(analyticsEndpoints)(
    'analytics security ($method $url)',
    ({ method, url, hasInvalidToken, hasTargetTenantId }) => {
      it('returns 401 without authorization header', async () => {
        if (!app) {
          throw new Error('App was not initialized');
        }

        const response = await app.inject({
          method,
          url,
          payload: method === 'POST' ? {} : undefined,
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'AUTH_UNAUTHORIZED',
            }),
          }),
        );
      });

      if (hasInvalidToken) {
        it('returns 401 with invalid bearer token', async () => {
          if (!app) {
            throw new Error('App was not initialized');
          }

          const response = await app.inject({
            method,
            url,
            headers: {
              authorization: 'Bearer invalid-token',
            },
            payload: method === 'POST' ? {} : undefined,
          });

          expect(response.statusCode).toBe(401);
          expect(response.json()).toEqual(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: 'AUTH_INVALID_TOKEN',
              }),
            }),
          );
        });
      }

      it('returns 403 when user lacks analytics:read permission', async () => {
        if (!app) {
          throw new Error('App was not initialized');
        }

        const { accessToken } = await registerUser(app);

        const response = await app.inject({
          method,
          url,
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          payload: method === 'POST' ? {} : undefined,
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'AUTH_INSUFFICIENT_PERMS',
            }),
          }),
        );
      });

      if (hasTargetTenantId) {
        it('returns 403 when non-super-admin tries to use targetTenantId', async () => {
          if (!app) {
            throw new Error('App was not initialized');
          }
          if (!testConfig) {
            throw new Error('Test config was not initialized');
          }

          const { accessToken, user } = await registerUser(app);
          await seedTenantAuthModel(testConfig, user.tenantId, [
            { userId: user.id, role: 'player' },
          ]);

          const otherTenantId = randomUUID();

          const response = await app.inject({
            method,
            url: `${url}?targetTenantId=${otherTenantId}`,
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
            payload: method === 'POST' ? {} : undefined,
          });

          expect(response.statusCode).toBe(403);
          expect(response.json()).toEqual(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: 'AUTH_FORBIDDEN',
                message: 'Target tenant override not permitted',
              }),
            }),
          );
        });
      }
    },
  );

  describe('POST /api/v1/analytics/phishing', () => {
    it('returns 200 with valid authentication and analytics:read permission', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      phishingMetricsServiceMock.computeAggregatedMetrics.mockResolvedValue({
        clickRate: 0.1,
        reportRate: 0.5,
        falsePositiveRate: 0.05,
        meanTimeToReportSeconds: 120,
        meanTimeToDecisionSeconds: 60,
        suspiciousIndicatorFlaggingRate: 0.8,
        period: { start: new Date().toISOString(), end: new Date().toISOString() },
        sampleSize: 100,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/phishing',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          clickRate: 0.1,
          reportRate: 0.5,
        }),
      );
    });
  });

  describe('POST /api/v1/analytics/scoring', () => {
    it('returns 200 with valid authentication and analytics:read permission', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      decisionQualityServiceMock.computeAllPlayerScores.mockResolvedValue([]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/scoring',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/analytics/trends', () => {
    it('returns 200 with valid authentication and analytics:read permission', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      decisionQualityServiceMock.computeTrends.mockResolvedValue({
        weeklyTrends: [],
        monthlyTrends: [],
        improvementRate: 0,
        decliningRate: 0,
        stableRate: 0,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/trends',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/analytics/health', () => {
    it('returns 200 with valid authentication and analytics:read permission', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/health',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        }),
      );
    });
  });

  describe('GET /api/v1/analytics/metrics', () => {
    it('returns 200 with valid authentication and analytics:read permission', async () => {
      if (!app) {
        throw new Error('App was not initialized');
      }
      if (!testConfig) {
        throw new Error('Test config was not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/metrics',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          eventsIngested: expect.any(Number),
        }),
      );
    });
  });
});
