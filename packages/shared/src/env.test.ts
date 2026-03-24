import { describe, expect, it } from 'vitest';

import {
  parseBackendEnv,
  parseFrontendEnv,
  validateBackendEnvConsistency,
  validateFrontendEnvConsistency,
} from './env.js';

const validBackendEnv = {
  NODE_ENV: 'development',
  PORT: '3001',
  API_HOST: '0.0.0.0',
  DATABASE_URL: 'postgres://localhost:5432/the_dmz',
  REDIS_URL: 'redis://localhost:6379',
  LOG_LEVEL: 'info',
  JWT_SECRET: 'test-jwt-secret',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGINS: 'http://localhost:5173',
  JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'dev-' + 'encryption-key-change-in-prod',
  TOKEN_HASH_SALT: 'test-token-salt',
} as Record<string, string | undefined>;

describe('parseBackendEnv', () => {
  it('parses a valid complete environment', () => {
    const config = parseBackendEnv(validBackendEnv);

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3001);
    expect(config.API_HOST).toBe('0.0.0.0');
    expect(config.API_VERSION).toBe('0.0.0');
    expect(config.MAX_BODY_SIZE).toBe(1_048_576);
    expect(config.RATE_LIMIT_MAX).toBe(100);
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(60_000);
    expect(config.DATABASE_URL).toBe('postgres://localhost:5432/the_dmz');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.JWT_SECRET).toBe('test-jwt-secret');
    expect(config.JWT_EXPIRES_IN).toBe('7d');
    expect(config.ENABLE_SWAGGER).toBe(true);
    expect(config.CORS_ORIGINS).toBe('http://localhost:5173');
    expect(config.CSP_FRAME_ANCESTORS).toBe('none');
    expect(config.CSP_CONNECT_SRC).toBe('');
    expect(config.CSP_IMG_SRC).toBe('');
    expect(config.COEP_POLICY).toBe('require-corp');
  });

  it('applies defaults for JWT_SECRET, TOKEN_HASH_SALT, and JWT_PRIVATE_KEY_ENCRYPTION_KEY when not provided', () => {
    const config = parseBackendEnv({});
    expect(config.JWT_SECRET).toBe('dev-test-jwt-secret');
    expect(config.TOKEN_HASH_SALT).toBe('token-hash-dev-test-salt');
    expect(config.JWT_PRIVATE_KEY_ENCRYPTION_KEY).toBe('dev-test-encryption-key-32-chars!');
  });

  it('applies production defaults for pool settings', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-jwt-value',
      TOKEN_HASH_SALT: 'prod-salt-value',
      JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
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

  it('accepts configurable MAX_BODY_SIZE', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      MAX_BODY_SIZE: '2097152',
    });

    expect(config.MAX_BODY_SIZE).toBe(2_097_152);
  });

  it('accepts configurable rate limiting values', () => {
    const config = parseBackendEnv({
      ...validBackendEnv,
      RATE_LIMIT_MAX: '150',
      RATE_LIMIT_WINDOW_MS: '90000',
    });

    expect(config.RATE_LIMIT_MAX).toBe(150);
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(90_000);
  });

  describe('AI configuration', () => {
    it('accepts zero AI_MAX_RETRIES to disable extra retries', () => {
      const config = parseBackendEnv({
        ...validBackendEnv,
        AI_MAX_RETRIES: '0',
      });

      expect(config.AI_MAX_RETRIES).toBe(0);
    });

    it('rejects AI_MAX_RETRIES values above the three-retry contract', () => {
      expect(() => parseBackendEnv({ ...validBackendEnv, AI_MAX_RETRIES: '4' })).toThrow(
        /Invalid backend environment configuration/,
      );
    });
  });

  describe('CSP and security headers', () => {
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
  });

  describe('input validation', () => {
    it('rejects non-numeric PORT values', () => {
      expect(() => parseBackendEnv({ ...validBackendEnv, PORT: 'abc' })).toThrow(
        /Invalid backend environment configuration/,
      );
    });

    it('rejects invalid MAX_BODY_SIZE values', () => {
      expect(() => parseBackendEnv({ ...validBackendEnv, MAX_BODY_SIZE: '-1' })).toThrow(
        /Invalid backend environment configuration/,
      );
    });

    it('rejects invalid rate limit values', () => {
      expect(() =>
        parseBackendEnv({
          ...validBackendEnv,
          RATE_LIMIT_MAX: '0',
          RATE_LIMIT_WINDOW_MS: '-1',
        }),
      ).toThrow(/Invalid backend environment configuration/);
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
  });

  describe('JWT_SECRET handling', () => {
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
        TOKEN_HASH_SALT: 'prod-salt-value',
        JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
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
  });

  describe('boolean and default parsing', () => {
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
        TOKEN_HASH_SALT: 'prod-salt-value',
        JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
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

  describe('TENANT_FALLBACK_ENABLED', () => {
    it('defaults to true in development', () => {
      const config = parseBackendEnv(validBackendEnv);

      expect(config.TENANT_FALLBACK_ENABLED).toBe(true);
    });

    it('defaults to true in test', () => {
      const config = parseBackendEnv({
        ...validBackendEnv,
        NODE_ENV: 'test',
      });

      expect(config.TENANT_FALLBACK_ENABLED).toBe(true);
    });

    it('defaults to false in production', () => {
      const config = parseBackendEnv({
        ...validBackendEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt',
        TOKEN_HASH_SALT: 'prod-salt',
        JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
      });

      expect(config.TENANT_FALLBACK_ENABLED).toBe(false);
    });

    it('respects explicit true in test environment', () => {
      const config = parseBackendEnv({
        ...validBackendEnv,
        NODE_ENV: 'test',
        TENANT_FALLBACK_ENABLED: 'true',
      });

      expect(config.TENANT_FALLBACK_ENABLED).toBe(true);
    });

    it('respects explicit false in test environment', () => {
      const config = parseBackendEnv({
        ...validBackendEnv,
        NODE_ENV: 'test',
        TENANT_FALLBACK_ENABLED: 'false',
      });

      expect(config.TENANT_FALLBACK_ENABLED).toBe(false);
    });

    it('respects explicit false in development environment', () => {
      const config = parseBackendEnv({
        ...validBackendEnv,
        TENANT_FALLBACK_ENABLED: 'false',
      });

      expect(config.TENANT_FALLBACK_ENABLED).toBe(false);
    });

    it('respects explicit true in production environment', () => {
      const config = parseBackendEnv({
        ...validBackendEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt',
        TOKEN_HASH_SALT: 'prod-salt',
        JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
        TENANT_FALLBACK_ENABLED: 'true',
      });

      expect(config.TENANT_FALLBACK_ENABLED).toBe(true);
    });
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

describe('validateBackendEnvConsistency', () => {
  const baseBackendEnv = {
    NODE_ENV: 'development',
    PORT: '3001',
    DATABASE_URL: 'postgres://localhost:5432/the_dmz',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-jwt-secret',
    TOKEN_HASH_SALT: 'test-token-salt',
    CORS_ORIGINS: 'http://localhost:5173',
    JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'dev-' + 'encryption-key-change-in-prod',
  } as Record<string, string | undefined>;

  it('returns ok for valid development config', () => {
    const config = parseBackendEnv(baseBackendEnv);
    const result = validateBackendEnvConsistency(config);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags localhost CORS origins in production', () => {
    const config = parseBackendEnv({
      ...baseBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret',
      TOKEN_HASH_SALT: 'prod-salt',
      JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
      CORS_ORIGINS: 'http://localhost:5173',
    });
    const result = validateBackendEnvConsistency(config);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'CORS_ORIGINS contains localhost in production. Configure production domains in CORS_ORIGINS.',
    );
  });

  it('flags swagger enabled in production', () => {
    // Note: ENABLE_SWAGGER explicit override is allowed in production (developer choice)
    // This test is kept for documentation purposes but does not fail validation
    const config = parseBackendEnv({
      ...baseBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret',
      TOKEN_HASH_SALT: 'prod-salt',
      JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
      CORS_ORIGINS: 'https://app.example.com',
      ENABLE_SWAGGER: 'true',
    });
    const result = validateBackendEnvConsistency(config);

    expect(result.ok).toBe(true);
  });

  it('flags debug log level in production', () => {
    const config = parseBackendEnv({
      ...baseBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret',
      TOKEN_HASH_SALT: 'prod-salt',
      JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
      LOG_LEVEL: 'debug',
    });
    const result = validateBackendEnvConsistency(config);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "LOG_LEVEL is set to 'debug' in production. Use 'info' or 'warn' for production.",
    );
  });

  it('flags disabled DATABASE_SSL in production', () => {
    const config = parseBackendEnv({
      ...baseBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret',
      TOKEN_HASH_SALT: 'prod-salt',
      JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
      DATABASE_SSL: 'false',
    });
    const result = validateBackendEnvConsistency(config);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'DATABASE_SSL is not enabled in production. Set DATABASE_SSL=true for production deployments.',
    );
  });

  it('passes production config with correct settings', () => {
    const config = parseBackendEnv({
      ...baseBackendEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret',
      TOKEN_HASH_SALT: 'prod-salt',
      JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'prod-' + 'encryption-key-32-chars-min',
      CORS_ORIGINS: 'https://app.example.com',
      ENABLE_SWAGGER: 'false',
      LOG_LEVEL: 'info',
      DATABASE_SSL: 'true',
    });
    const result = validateBackendEnvConsistency(config);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateFrontendEnvConsistency', () => {
  const baseFrontendEnv = {
    PUBLIC_API_BASE_URL: '/api/v1',
    PUBLIC_ENVIRONMENT: 'development',
  } as Record<string, string | undefined>;

  it('returns ok for valid development config', () => {
    const config = parseFrontendEnv(baseFrontendEnv);
    const result = validateFrontendEnvConsistency(config);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags localhost API URL in production', () => {
    const config = parseFrontendEnv({
      ...baseFrontendEnv,
      PUBLIC_ENVIRONMENT: 'production',
      PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
    });
    const result = validateFrontendEnvConsistency(config);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'PUBLIC_API_BASE_URL contains localhost in production. Configure production API URL.',
    );
  });

  it('passes production config with correct settings', () => {
    const config = parseFrontendEnv({
      ...baseFrontendEnv,
      PUBLIC_ENVIRONMENT: 'production',
      PUBLIC_API_BASE_URL: 'https://api.example.com/api/v1',
    });
    const result = validateFrontendEnvConsistency(config);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
