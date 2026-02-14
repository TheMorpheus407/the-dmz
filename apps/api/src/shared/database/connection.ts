import postgres, { type Sql } from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { loadConfig, type AppConfig } from '../../config.js';

import * as schema from './schema/index.js';

export type DependencyHealth = {
  ok: boolean;
  message: string;
};

export type DB = DatabaseClient;
export type DatabaseClient = PostgresJsDatabase<typeof schema>;
export type DatabasePool = Sql;

const pools = new Map<string, DatabasePool>();
const clients = new Map<string, DatabaseClient>();

const getConfigKey = (config: AppConfig): string => config.DATABASE_URL;

const createDatabasePool = (config: AppConfig): DatabasePool =>
  postgres(config.DATABASE_URL, {
    max: config.DATABASE_POOL_MAX,
    idle_timeout: config.DATABASE_POOL_IDLE_TIMEOUT,
    connect_timeout: config.DATABASE_POOL_CONNECT_TIMEOUT,
    ssl: config.DATABASE_SSL ? 'require' : false,
  });

export const getDatabasePool = (config: AppConfig = loadConfig()): DatabasePool => {
  const key = getConfigKey(config);

  if (!pools.has(key)) {
    pools.set(key, createDatabasePool(config));
  }

  return pools.get(key)!;
};

export const getDatabaseClient = (config: AppConfig = loadConfig()): DatabaseClient => {
  const key = getConfigKey(config);

  if (!clients.has(key)) {
    const sql = getDatabasePool(config);
    clients.set(key, drizzle(sql, { schema }));
  }

  return clients.get(key)!;
};

export const closeDatabase = async (): Promise<void> => {
  for (const pool of pools.values()) {
    await pool.end({ timeout: 5 });
  }

  pools.clear();
  clients.clear();
};

export async function checkDatabaseHealth(
  config: AppConfig = loadConfig(),
): Promise<DependencyHealth> {
  if (config.NODE_ENV === 'test') {
    return {
      ok: false,
      message: 'Database health check disabled for tests',
    };
  }

  try {
    const sql = getDatabasePool(config);
    await sql`select 1`;
    return { ok: true, message: 'Database connection ok' };
  } catch (_error) {
    return { ok: false, message: 'Database connection failed' };
  }
}
