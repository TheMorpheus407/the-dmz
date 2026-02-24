import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';

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

describe('jwks routes', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  describe('GET /.well-known/jwks.json', () => {
    it('returns 200 with JWKS document structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/jwks.json',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toHaveProperty('keys');
      expect(Array.isArray(body.keys)).toBe(true);

      if (body.keys.length > 0) {
        const key = body.keys[0];
        expect(key).toHaveProperty('kty');
        expect(key).toHaveProperty('kid');
        expect(key).toHaveProperty('use', 'sig');
        expect(key).toHaveProperty('alg');
      }
    });

    it('returns cache-control headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/jwks.json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBeDefined();
    });

    it('returns valid RSA key structure when keys exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/jwks.json',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      if (body.keys.length > 0) {
        const key = body.keys[0];
        if (key.kty === 'RSA') {
          expect(key).toHaveProperty('n');
          expect(key).toHaveProperty('e');
          expect(key.n).toBeDefined();
          expect(key.e).toBeDefined();
        }
      }
    });

    it('returns valid EC key structure when EC keys exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/jwks.json',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      const ecKeys = body.keys.filter((k: { kty: string }) => k.kty === 'EC');
      if (ecKeys.length > 0) {
        const key = ecKeys[0];
        expect(key).toHaveProperty('x');
        expect(key).toHaveProperty('y');
        expect(key).toHaveProperty('crv', 'P-256');
        expect(key.x).toBeDefined();
        expect(key.y).toBeDefined();
        expect(key.x).not.toBe('');
        expect(key.y).not.toBe('');
      }
    });
  });
});
