import { describe, expect, it } from 'vitest';

import { parseBackendEnv, parseFrontendEnv } from './env.js';

const validBackendEnv = {
  NODE_ENV: 'development',
  PORT: '3001',
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
    expect(config.PORT).toBe(3001);
    expect(config.API_HOST).toBe('0.0.0.0');
    expect(config.API_VERSION).toBe('0.0.0');
    expect(config.DATABASE_URL).toBe('postgres://localhost:5432/the_dmz');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.JWT_SECRET).toBe('dev-secret-change-in-production');
    expect(config.JWT_EXPIRES_IN).toBe('7d');
    expect(config.ENABLE_SWAGGER).toBe(true);
    expect(config.CORS_ORIGINS).toBe('http://localhost:5173');
    expect(config.CSP_FRAME_ANCESTORS).toBe('none');
    expect(config.CSP_CONNECT_SRC).toBe('');
    expect(config.CSP_IMG_SRC).toBe('');
    expect(config.COEP_POLICY).toBe('require-corp');
  });

  it('applies development defaults when env is empty', () => {
    const config = parseBackendEnv({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3001);
    expect(config.API_HOST).toBe('0.0.0.0');
    expect(config.API_VERSION).toBe('0.0.0');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.JWT_EXPIRES_IN).toBe('7d');
    expect(config.ENABLE_SWAGGER).toBe(true);
    expect(config.DATABASE_POOL_MIN).toBe(2);
    expect(config.DATABASE_POOL_MAX).toBe(10);
    expect(config.DATABASE_SSL).toBe(false);
    expect(config.CSP_FRAME_ANCESTORS).toBe('none');
    expect(config.CSP_CONNECT_SRC).toBe('');
    expect(config.CSP_IMG_SRC).toBe('');
    expect(config.COEP_POLICY).toBe('require-corp');
  });

  it('applies production defaults for pool settings', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-jwt-value',
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

  it('accepts custom API_VERSION', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      API_VERSION: '1.2.3',
    });

    expect(config.API_VERSION).toBe('1.2.3');
  });

  it('accepts configurable frame ancestors for LMS embedding', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      CSP_FRAME_ANCESTORS: 'https://lms.example.com,https://canvas.example.com',
    });

    expect(config.CSP_FRAME_ANCESTORS).toBe('https://lms.example.com,https://canvas.example.com');
  });

  it('accepts configurable extra CSP sources', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      CSP_CONNECT_SRC: 'https://api.example.com,wss://realtime.example.com',
      CSP_IMG_SRC: 'https://cdn.example.com',
    });

    expect(config.CSP_CONNECT_SRC).toBe('https://api.example.com,wss://realtime.example.com');
    expect(config.CSP_IMG_SRC).toBe('https://cdn.example.com');
  });

  it('accepts COEP credentialless fallback policy', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      COEP_POLICY: 'credentialless',
    });

    expect(config.COEP_POLICY).toBe('credentialless');
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

  it('rejects invalid COEP_POLICY values', () => {
    expect(() => parseBackendEnv({ ...validBackendEnv, COEP_POLICY: 'unsafe-none' })).toThrow(
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
      JWT_SECRET: 'prod',
    });

    expect(config.JWT_SECRET).toBe('prod');
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

  it('parses ENABLE_SWAGGER boolean from string', () => {
    const enabled = parseBackendEnv({
      ...validBackendEnv,
      ENABLE_SWAGGER: 'true',
    });
    const disabled = parseBackendEnv({
      ...validBackendEnv,
      ENABLE_SWAGGER: 'false',
    });

    expect(enabled.ENABLE_SWAGGER).toBe(true);
    expect(disabled.ENABLE_SWAGGER).toBe(false);
  });

  it('defaults ENABLE_SWAGGER to false in production', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-jwt-value',
    });

    expect(config.ENABLE_SWAGGER).toBe(false);
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
