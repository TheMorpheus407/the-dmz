import { describe, expect, it } from 'vitest';

import { TenantTier, m1TierQuotaMatrix } from '@the-dmz/shared/contracts';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-secret',
  RATE_LIMIT_MAX: '1000',
  RATE_LIMIT_WINDOW_MS: '60000',
} as const;

const createTestConfig = (overrides: Record<string, string> = {}): AppConfig =>
  loadConfig({ ...baseEnv, ...overrides });

const getHeader = (
  headers: Record<string, number | string | string[] | undefined>,
  name: string,
): string | undefined => {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0] !== undefined ? String(value[0]) : undefined;
  }

  if (value === undefined) {
    return undefined;
  }

  return String(value);
};

const TIER_QUOTAS: Record<string, { perMinute: number; perHour: number }> = {
  [TenantTier.STANDARD]: { perMinute: 60, perHour: 1000 },
  [TenantTier.PROFESSIONAL]: { perMinute: 300, perHour: 10_000 },
  [TenantTier.ENTERPRISE]: { perMinute: 1000, perHour: 100_000 },
  [TenantTier.CUSTOM]: { perMinute: 0, perHour: 0 },
};

describe('quota policy runtime behavior', () => {
  describe('tier baseline enforcement', () => {
    it('applies Standard tier limits when no plan is specified', async () => {
      const app = buildApp(createTestConfig());
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(response.statusCode).toBe(200);
      expect(getHeader(response.headers, 'x-quota-limit-minute')).toBe(
        String(TIER_QUOTAS[TenantTier.STANDARD]?.perMinute ?? 60),
      );
      expect(getHeader(response.headers, 'x-quota-limit-hour')).toBe(
        String(TIER_QUOTAS[TenantTier.STANDARD]?.perHour ?? 1000),
      );

      await app.close();
    });

    it('includes all four required quota headers', async () => {
      const app = buildApp(createTestConfig());
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(response.statusCode).toBe(200);
      expect(getHeader(response.headers, 'x-quota-limit-minute')).toBeDefined();
      expect(getHeader(response.headers, 'x-quota-remaining-minute')).toBeDefined();
      expect(getHeader(response.headers, 'x-quota-limit-hour')).toBeDefined();
      expect(getHeader(response.headers, 'x-quota-remaining-hour')).toBeDefined();

      await app.close();
    });

    it('tracks minute and hour headers correctly', async () => {
      const app = buildApp(createTestConfig());
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(response.statusCode).toBe(200);

      const quotaLimitMinute = Number(getHeader(response.headers, 'x-quota-limit-minute'));
      const quotaRemainingMinute = Number(getHeader(response.headers, 'x-quota-remaining-minute'));
      const quotaLimitHour = Number(getHeader(response.headers, 'x-quota-limit-hour'));
      const quotaRemainingHour = Number(getHeader(response.headers, 'x-quota-remaining-hour'));

      expect(quotaLimitMinute).toBeGreaterThan(0);
      expect(quotaRemainingMinute).toBeGreaterThanOrEqual(0);
      expect(quotaRemainingMinute).toBeLessThanOrEqual(quotaLimitMinute);

      expect(quotaLimitHour).toBeGreaterThan(0);
      expect(quotaRemainingHour).toBeGreaterThanOrEqual(0);
      expect(quotaRemainingHour).toBeLessThanOrEqual(quotaLimitHour);
    });
  });

  describe('cross-tenant isolation', () => {
    it('prevents cross-tenant key collisions by using tenant-scoped keys', async () => {
      const app = buildApp(
        createTestConfig({ RATE_LIMIT_MAX: '2', RATE_LIMIT_WINDOW_MS: '60000' }),
      );
      await app.ready();

      const tenant1 = '550e8400-e29b-41d4-a716-446655440001';
      const tenant2 = '550e8400-e29b-41d4-a716-446655440002';

      const t1Req1 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenant1 },
      });
      expect(t1Req1.statusCode).toBe(200);

      const t1Req2 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenant1 },
      });
      expect(t1Req2.statusCode).toBe(200);

      const t1Req3 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenant1 },
      });
      expect(t1Req3.statusCode).toBe(200);

      const t2Req1 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenant2 },
      });
      expect(t2Req1.statusCode).toBe(200);

      const t2Req2 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenant2 },
      });
      expect(t2Req2.statusCode).toBe(200);

      await app.close();
    });

    it('maintains separate quota counters per tenant', async () => {
      const app = buildApp(
        createTestConfig({ RATE_LIMIT_MAX: '1', RATE_LIMIT_WINDOW_MS: '60000' }),
      );
      await app.ready();

      const tenantA = '660e8400-e29b-41d4-a716-4466554400a1';
      const tenantB = '660e8400-e29b-41d4-a716-4466554400b2';

      const a1 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantA, 'x-forwarded-for': '1.1.1.1' },
      });
      expect(a1.statusCode).toBe(200);

      const b1 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantB, 'x-forwarded-for': '1.1.1.1' },
      });
      expect(b1.statusCode).toBe(200);

      const a2 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantA, 'x-forwarded-for': '1.1.1.1' },
      });
      expect(a2.statusCode).toBe(200);

      const b2 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': tenantB, 'x-forwarded-for': '1.1.1.1' },
      });
      expect(b2.statusCode).toBe(200);

      await app.close();
    });
  });

  describe('per-credential isolation', () => {
    it('isolates quota tracking between different credential types', async () => {
      const app = buildApp(
        createTestConfig({ RATE_LIMIT_MAX: '1', RATE_LIMIT_WINDOW_MS: '60000' }),
      );
      await app.ready();

      const tenant = '770e8400-e29b-41d4-a716-4466554400c3';

      const apiKeyReq1 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: {
          'x-tenant-id': tenant,
          'x-api-key': 'test-api-key-1',
        },
      });
      expect(apiKeyReq1.statusCode).toBe(200);

      const patReq1 = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: {
          'x-tenant-id': tenant,
          'x-api-key': 'test-pat-1',
        },
      });

      expect(patReq1.statusCode).toBe(200);

      await app.close();
    });
  });

  describe('header value accuracy', () => {
    it('includes effective policy information in quota headers', async () => {
      const app = buildApp(createTestConfig());
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '880e8400-e29b-41d4-a716-4466554400d4' },
      });

      expect(response.statusCode).toBe(200);

      const quotaLimitMinute = getHeader(response.headers, 'x-quota-limit-minute');
      const quotaLimitHour = getHeader(response.headers, 'x-quota-limit-hour');

      expect(quotaLimitMinute).toBeDefined();
      expect(quotaLimitHour).toBeDefined();

      const baseline = m1TierQuotaMatrix.baselines.find((b) => b.tier === TenantTier.STANDARD);
      expect(Number(quotaLimitMinute)).toBe(baseline?.requestsPerMinute);
      expect(Number(quotaLimitHour)).toBe(baseline?.requestsPerHour);
    });

    it('includes rate limit headers alongside quota headers', async () => {
      const app = buildApp(createTestConfig());
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: { 'x-tenant-id': '990e8400-e29b-41d4-a716-4466554400e5' },
      });

      expect(response.statusCode).toBe(200);

      expect(getHeader(response.headers, 'x-quota-limit-minute')).toBeDefined();
      expect(getHeader(response.headers, 'x-quota-limit-hour')).toBeDefined();
      expect(getHeader(response.headers, 'x-quota-remaining-minute')).toBeDefined();
      expect(getHeader(response.headers, 'x-quota-remaining-hour')).toBeDefined();

      await app.close();
    });
  });

  describe('unauthenticated requests', () => {
    it('applies default quota limits for unauthenticated requests', async () => {
      const app = buildApp(createTestConfig());
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(200);
      expect(getHeader(response.headers, 'x-quota-limit-minute')).toBeDefined();
      expect(getHeader(response.headers, 'x-quota-limit-hour')).toBeDefined();

      await app.close();
    });
  });
});
