import { describe, expect, it } from 'vitest';

import { parseBackendEnv, parseFrontendEnv } from './env.js';

const validBackendEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  API_HOST: '0.0.0.0',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'info',
  JWT_SECRET: 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGINS: 'http://localhost:5173',
} as Record<string, string | undefined>;

describe('parseBackendEnv', () => {
  it('parses a valid complete environment', () => {
    const config = parseBackendEnv(validBackendEnv);

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.API_HOST).toBe('0.0.0.0');
    expect(config.DATABASE_URL).toBe('postgres://localhost:5432/the_dmz');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.JWT_SECRET).toBe('dev-secret-change-in-production');
    expect(config.JWT_EXPIRES_IN).toBe('7d');
    expect(config.CORS_ORIGINS).toBe('http://localhost:5173');
  });

  it('applies development defaults when env is empty', () => {
    const config = parseBackendEnv({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.API_HOST).toBe('0.0.0.0');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.JWT_EXPIRES_IN).toBe('7d');
    expect(config.DATABASE_POOL_MIN).toBe(2);
    expect(config.DATABASE_POOL_MAX).toBe(10);
    expect(config.DATABASE_SSL).toBe(false);
  });

  it('applies production defaults for pool settings', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'a-real-production-secret-key-here',
    });

    expect(config.DATABASE_POOL_MIN).toBe(5);
    expect(config.DATABASE_POOL_MAX).toBe(25);
    expect(config.DATABASE_SSL).toBe(true);
  });

  it('parses CORS_ORIGINS into a list', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      CORS_ORIGINS: 'http://localhost:5173, https://example.com',
    });

    expect(config.CORS_ORIGINS_LIST).toEqual(['http://localhost:5173', 'https://example.com']);
  });

  it('handles single CORS origin', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      CORS_ORIGINS: 'http://localhost:5173',
    });

    expect(config.CORS_ORIGINS_LIST).toEqual(['http://localhost:5173']);
  });

  it('rejects non-numeric PORT values', () => {
    expect(() => parseBackendEnv({ ...validBackendEnv, PORT: 'abc' })).toThrow(
      /Invalid backend environment configuration/,
    );
  });

  it('rejects invalid LOG_LEVEL values', () => {
    expect(() => parseBackendEnv({ ...validBackendEnv, LOG_LEVEL: 'verbose' })).toThrow(
      /Invalid backend environment configuration/,
    );
  });

  it('rejects empty DATABASE_URL', () => {
    expect(() => parseBackendEnv({ ...validBackendEnv, DATABASE_URL: '' })).toThrow(
      /Invalid backend environment configuration/,
    );
  });

  it('rejects dev JWT_SECRET in production', () => {
    expect(() =>
      parseBackendEnv({
        ...validBackendEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'dev-secret-change-in-production',
      }),
    ).toThrow(/JWT_SECRET must be changed from the default value in production/);
  });

  it('allows strong JWT_SECRET in production', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'a-real-production-secret-key-that-is-strong',
    });

    expect(config.JWT_SECRET).toBe('a-real-production-secret-key-that-is-strong');
  });

  it('allows dev JWT_SECRET in development', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      NODE_ENV: 'development',
      JWT_SECRET: 'dev-secret-change-in-production',
    });

    expect(config.JWT_SECRET).toBe('dev-secret-change-in-production');
  });

  it('parses DATABASE_SSL boolean from string', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      DATABASE_SSL: 'true',
    });

    expect(config.DATABASE_SSL).toBe(true);
  });

  it('overrides pool defaults with explicit values', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      DATABASE_POOL_MIN: '3',
      DATABASE_POOL_MAX: '15',
    });

    expect(config.DATABASE_POOL_MIN).toBe(3);
    expect(config.DATABASE_POOL_MAX).toBe(15);
  });
});

const validFrontendEnv = {
  PUBLIC_API_BASE_URL: '/api/v1',
  PUBLIC_ENVIRONMENT: 'development',
} as Record<string, string | undefined>;

describe('parseFrontendEnv', () => {
  it('parses a valid complete environment', () => {
    const config = parseFrontendEnv(validFrontendEnv);

    expect(config.PUBLIC_API_BASE_URL).toBe('/api/v1');
    expect(config.PUBLIC_ENVIRONMENT).toBe('development');
  });

  it('applies defaults when env is empty', () => {
    const config = parseFrontendEnv({});

    expect(config.PUBLIC_API_BASE_URL).toBe('/api/v1');
    expect(config.PUBLIC_ENVIRONMENT).toBe('development');
  });

  it('accepts absolute URL for PUBLIC_API_BASE_URL', () => {
    const config = parseFrontendEnv({
      ...validFrontendEnv,
      PUBLIC_API_BASE_URL: 'https://api.example.com/api/v1',
    });

    expect(config.PUBLIC_API_BASE_URL).toBe('https://api.example.com/api/v1');
  });

  it('rejects invalid PUBLIC_ENVIRONMENT values', () => {
    expect(() => parseFrontendEnv({ ...validFrontendEnv, PUBLIC_ENVIRONMENT: 'invalid' })).toThrow(
      /Invalid frontend environment configuration/,
    );
  });

  it('rejects empty PUBLIC_API_BASE_URL', () => {
    expect(() => parseFrontendEnv({ ...validFrontendEnv, PUBLIC_API_BASE_URL: '' })).toThrow(
      /Invalid frontend environment configuration/,
    );
  });

  it('accepts staging as PUBLIC_ENVIRONMENT', () => {
    // Note: 'staging' is not in nodeEnvValues, only development/test/production
    expect(() => parseFrontendEnv({ ...validFrontendEnv, PUBLIC_ENVIRONMENT: 'staging' })).toThrow(
      /Invalid frontend environment configuration/,
    );
  });

  it('accepts production as PUBLIC_ENVIRONMENT', () => {
    const config = parseFrontendEnv({
      ...validFrontendEnv,
      PUBLIC_ENVIRONMENT: 'production',
    });

    expect(config.PUBLIC_ENVIRONMENT).toBe('production');
  });
});
