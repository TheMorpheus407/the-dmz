import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  };
};

vi.mock('../health/health.service.js', () => ({
  getHealth: vi.fn().mockReturnValue({ status: 'ok' }),
  getReadiness: vi.fn().mockResolvedValue({
    status: 'ok',
    checks: {
      database: { ok: true, message: 'Database connection ok' },
      redis: { ok: true, message: 'Redis connection ok' },
    },
  }),
}));

describe('API Versioning', () => {
  const app = buildApp(createTestConfig());

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Version Discovery Endpoint', () => {
    it('returns version info for /api/version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/version',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.currentVersion).toBe('v1');
      expect(body.supportedVersions).toContain('v1');
      expect(body.deprecationSchedule).toBeDefined();
      expect(body.headers).toBeDefined();
      expect(body.headers.acceptMimeType).toBe('application/vnd.thedmz.v1+json');
      expect(body.headers.responseHeader).toBe('API-Version');
    });
  });

  describe('API-Version Header', () => {
    it('adds API-Version header to /api/v1/ response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['api-version']).toBe('v1');
    });

    it('adds API-Version header to /api/v1/auth/info response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/info',
      });

      expect([401, 404]).toContain(response.statusCode);
      expect(response.headers['api-version']).toBe('v1');
    });

    it('does not add API-Version header to /health', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['api-version']).toBeUndefined();
    });

    it('does not add API-Version header to /api/version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/version',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['api-version']).toBeUndefined();
    });
  });

  describe('Accept Header Versioning', () => {
    it('parses version from Accept header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: {
          Accept: 'application/vnd.thedmz.v1+json',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['api-version']).toBe('v1');
    });

    it('handles Accept header without version gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: {
          Accept: 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['api-version']).toBe('v1');
    });

    it('handles empty Accept header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/',
        headers: {
          Accept: '',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['api-version']).toBe('v1');
    });
  });
});

describe('Version Headers Middleware - Unit Tests', () => {
  describe('parseAcceptHeaderVersion', () => {
    it('parses v1 from Accept header', async () => {
      const { extractVersionFromMimeType } = await import('../version-headers.js');
      expect(extractVersionFromMimeType('application/vnd.thedmz.v1+json')).toBe('v1');
    });

    it('parses v2 from Accept header', async () => {
      const { extractVersionFromMimeType } = await import('../version-headers.js');
      expect(extractVersionFromMimeType('application/vnd.thedmz.v2+json')).toBe('v2');
    });

    it('returns undefined for non-versioned mime type', async () => {
      const { extractVersionFromMimeType } = await import('../version-headers.js');
      expect(extractVersionFromMimeType('application/json')).toBeUndefined();
    });
  });
});
