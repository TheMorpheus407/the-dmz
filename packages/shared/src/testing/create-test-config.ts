import { parseBackendEnv, type BackendEnv, type LogLevel } from '../env.js';

export interface TestConfigOverrides {
  LOG_LEVEL?: LogLevel;
  DATABASE_URL?: string;
  RATE_LIMIT_MAX?: string;
  TENANT_RESOLVER_ENABLED?: string;
  TENANT_HEADER_NAME?: string;
  TENANT_FALLBACK_ENABLED?: string;
  [key: string]: string | undefined;
}

export interface TestConfigFactoryOptions {
  logLevel?: LogLevel;
  overrides?: TestConfigOverrides;
}

export function createTestConfig(options: TestConfigFactoryOptions = {}): BackendEnv {
  const { logLevel = 'silent', overrides = {} } = options;

  const testEnv: Record<string, string | undefined> = {
    NODE_ENV: 'test',
    PORT: '3001',
    API_HOST: '0.0.0.0',
    API_VERSION: 'v1',
    MAX_BODY_SIZE: '1048576',
    RATE_LIMIT_MAX: '10000',
    RATE_LIMIT_WINDOW_MS: '60000',
    DATABASE_URL: overrides.DATABASE_URL ?? 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: logLevel,
    CORS_ORIGINS: 'http://localhost:5173,http://localhost:3001',
    TENANT_RESOLVER_ENABLED: String(overrides.TENANT_RESOLVER_ENABLED ?? false),
    TENANT_HEADER_NAME: overrides.TENANT_HEADER_NAME ?? 'x-tenant-id',
    TENANT_FALLBACK_ENABLED: String(overrides.TENANT_FALLBACK_ENABLED ?? false),
    ...overrides,
  };

  return parseBackendEnv(testEnv);
}
