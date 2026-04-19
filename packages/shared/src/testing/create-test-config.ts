import postgres, { type Sql } from 'postgres';

import { parseBackendEnv, type BackendEnv, type LogLevel } from '../env.js';

export interface CreateIsolatedDatabaseOptions {
  setup?: (pool: Sql) => Promise<void>;
  dbMapper?: (pool: Sql) => Promise<unknown>;
}

export const ADMIN_DATABASE_URL = 'postgresql://dmz:dmz_dev@localhost:5432/postgres';

export function deriveAdminDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

export function createIsolatedTestConfig(databaseName: string): BackendEnv;
export function createIsolatedTestConfig(baseConfig: BackendEnv, databaseName: string): BackendEnv;
export function createIsolatedTestConfig(
  baseConfigOrDatabaseName: BackendEnv | string,
  databaseName?: string,
): BackendEnv {
  const baseConfig: BackendEnv =
    typeof baseConfigOrDatabaseName === 'string' ? createTestConfig() : baseConfigOrDatabaseName;
  const dbName: string =
    typeof baseConfigOrDatabaseName === 'string' ? baseConfigOrDatabaseName : databaseName!;
  const url = new URL(baseConfig.DATABASE_URL);
  url.pathname = `/${dbName}`;
  return {
    ...baseConfig,
    DATABASE_URL: url.toString(),
  };
}

function isValidPostgresIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

function quotePostgresIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function createIsolatedDatabase(config: BackendEnv): Promise<() => Promise<void>>;
export async function createIsolatedDatabase<T>(
  config: BackendEnv,
  options: { setup?: (pool: Sql) => Promise<void>; dbMapper: (pool: Sql) => Promise<T> },
): Promise<{ db: T; cleanup: () => Promise<void> }>;
export async function createIsolatedDatabase<T>(
  config: BackendEnv,
  options?: CreateIsolatedDatabaseOptions,
): Promise<(() => Promise<void>) | { db: T; cleanup: () => Promise<void> }> {
  const databaseName = new URL(config.DATABASE_URL).pathname.replace(/^\//, '');
  if (!isValidPostgresIdentifier(databaseName)) {
    throw new Error(
      `Invalid database name: ${databaseName}. Must match PostgreSQL identifier rules: ^[a-zA-Z_][a-zA-Z0-9_]*$`,
    );
  }
  const adminUrl = deriveAdminDatabaseUrl(config.DATABASE_URL);
  const adminPool = postgres(adminUrl, { max: 1 });
  const quotedDbName = quotePostgresIdentifier(databaseName);
  let databasePool: ReturnType<typeof postgres> | undefined;

  const cleanup = async (): Promise<void> => {
    if (databasePool) {
      await databasePool.end({ timeout: 5 });
    }
    await adminPool.unsafe(
      `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()
    `,
      [databaseName],
    );
    await adminPool.unsafe(`DROP DATABASE IF EXISTS ${quotedDbName}`);
    await adminPool.end({ timeout: 5 });
  };

  try {
    await adminPool.unsafe(`DROP DATABASE IF EXISTS ${quotedDbName}`);
    await adminPool.unsafe(`CREATE DATABASE ${quotedDbName}`);
    databasePool = postgres(config.DATABASE_URL, { max: 1 });

    try {
      if (options?.setup) {
        await options.setup(databasePool);
      }

      if (options?.dbMapper) {
        const db = (await options.dbMapper(databasePool)) as T;
        return { db, cleanup };
      }

      return cleanup;
    } catch (setupError) {
      if (databasePool) {
        await databasePool.end({ timeout: 5 });
        databasePool = undefined;
      }
      throw setupError;
    }
  } catch (error) {
    await adminPool.end({ timeout: 5 });
    throw error;
  }
}

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
