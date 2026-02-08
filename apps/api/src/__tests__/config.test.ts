import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz_test',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'info',
  JWT_SECRET: 'test-secret',
} as const;

describe('loadConfig', () => {
  describe('port resolution', () => {
    it('defaults API server port to 3001', () => {
      const config = loadConfig({
        ...baseEnv,
        PORT: undefined,
        API_PORT: undefined,
      });

      expect(config.PORT).toBe(3001);
    });

    it('uses API_PORT when PORT is not set', () => {
      const config = loadConfig({
        ...baseEnv,
        PORT: undefined,
        API_PORT: '3011',
      });

      expect(config.PORT).toBe(3011);
    });

    it('prefers API_PORT when both PORT and API_PORT are provided', () => {
      const config = loadConfig({
        ...baseEnv,
        PORT: '3200',
        API_PORT: '3012',
      });

      expect(config.PORT).toBe(3012);
    });

    it('falls back to PORT when API_PORT is blank', () => {
      const config = loadConfig({
        ...baseEnv,
        PORT: '3200',
        API_PORT: '',
      });

      expect(config.PORT).toBe(3200);
    });

    it('rejects malformed API_PORT values with a clear error', () => {
      expect(() =>
        loadConfig({
          ...baseEnv,
          PORT: '3200',
          API_PORT: '3000abc',
        }),
      ).toThrow(/Invalid backend environment configuration/);
    });

    it('rejects API_PORT=0 (ephemeral port)', () => {
      expect(() =>
        loadConfig({
          ...baseEnv,
          API_PORT: '0',
        }),
      ).toThrow(/API_PORT must be a positive integer/);
    });

    it('honors API_PORT when PORT is empty or invalid', () => {
      const config = loadConfig({
        ...baseEnv,
        PORT: '',
        API_PORT: '3001',
      });

      expect(config.PORT).toBe(3001);
    });

    it('falls back to default when PORT is blank and API_PORT is unset', () => {
      const config = loadConfig({
        ...baseEnv,
        PORT: '',
        API_PORT: undefined,
      });

      expect(config.PORT).toBe(3001);
    });
  });

  describe('API_HOST', () => {
    it('defaults to 0.0.0.0', () => {
      const config = loadConfig({ ...baseEnv });

      expect(config.API_HOST).toBe('0.0.0.0');
    });

    it('accepts custom host', () => {
      const config = loadConfig({ ...baseEnv, API_HOST: '127.0.0.1' });

      expect(config.API_HOST).toBe('127.0.0.1');
    });
  });

  describe('JWT_SECRET', () => {
    it('accepts any secret in test/development', () => {
      const config = loadConfig({
        ...baseEnv,
        JWT_SECRET: 'dev-secret-change-in-production',
      });

      expect(config.JWT_SECRET).toBe('dev-secret-change-in-production');
    });

    it('rejects dev secrets in production', () => {
      expect(() =>
        loadConfig({
          ...baseEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'dev-secret-change-in-production',
        }),
      ).toThrow(/JWT_SECRET must be changed from the default value in production/);
    });

    it('accepts strong secrets in production', () => {
      const config = loadConfig({
        ...baseEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt-value',
      });

      expect(config.JWT_SECRET).toBe('prod-jwt-value');
    });
  });

  describe('JWT_EXPIRES_IN', () => {
    it('defaults to 7d', () => {
      const config = loadConfig({ ...baseEnv });

      expect(config.JWT_EXPIRES_IN).toBe('7d');
    });

    it('accepts custom expiry', () => {
      const config = loadConfig({ ...baseEnv, JWT_EXPIRES_IN: '24h' });

      expect(config.JWT_EXPIRES_IN).toBe('24h');
    });
  });

  describe('API_VERSION', () => {
    it('defaults to package-compatible version', () => {
      const config = loadConfig({ ...baseEnv });

      expect(config.API_VERSION).toBe('0.0.0');
    });

    it('accepts custom version values', () => {
      const config = loadConfig({ ...baseEnv, API_VERSION: '1.0.0' });

      expect(config.API_VERSION).toBe('1.0.0');
    });
  });

  describe('ENABLE_SWAGGER', () => {
    it('defaults to enabled outside production', () => {
      const config = loadConfig({ ...baseEnv, NODE_ENV: 'test' });

      expect(config.ENABLE_SWAGGER).toBe(true);
    });

    it('defaults to disabled in production', () => {
      const config = loadConfig({
        ...baseEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt-value',
      });

      expect(config.ENABLE_SWAGGER).toBe(false);
    });

    it('honors explicit ENABLE_SWAGGER override', () => {
      const config = loadConfig({
        ...baseEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt-value',
        ENABLE_SWAGGER: 'true',
      });

      expect(config.ENABLE_SWAGGER).toBe(true);
    });
  });

  describe('CORS_ORIGINS', () => {
    it('defaults to localhost:5173', () => {
      const config = loadConfig({ ...baseEnv });

      expect(config.CORS_ORIGINS).toBe('http://localhost:5173');
      expect(config.CORS_ORIGINS_LIST).toEqual(['http://localhost:5173']);
    });

    it('parses multiple origins', () => {
      const config = loadConfig({
        ...baseEnv,
        CORS_ORIGINS: 'http://localhost:5173, https://example.com',
      });

      expect(config.CORS_ORIGINS_LIST).toEqual(['http://localhost:5173', 'https://example.com']);
    });
  });

  describe('database pool', () => {
    it('uses development defaults', () => {
      const config = loadConfig({
        ...baseEnv,
        NODE_ENV: 'development',
      });

      expect(config.DATABASE_POOL_MIN).toBe(2);
      expect(config.DATABASE_POOL_MAX).toBe(10);
      expect(config.DATABASE_SSL).toBe(false);
    });

    it('uses production defaults', () => {
      const config = loadConfig({
        ...baseEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt-value',
      });

      expect(config.DATABASE_POOL_MIN).toBe(5);
      expect(config.DATABASE_POOL_MAX).toBe(25);
      expect(config.DATABASE_SSL).toBe(true);
    });

    it('respects explicit pool settings', () => {
      const config = loadConfig({
        ...baseEnv,
        DATABASE_POOL_MIN: '3',
        DATABASE_POOL_MAX: '15',
        DATABASE_SSL: 'true',
      });

      expect(config.DATABASE_POOL_MIN).toBe(3);
      expect(config.DATABASE_POOL_MAX).toBe(15);
      expect(config.DATABASE_SSL).toBe(true);
    });
  });
});
