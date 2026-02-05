import postgres, { type Sql } from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { loadConfig, type AppConfig } from "../../config.js";
import * as schema from "./schema/index.js";

export type DependencyHealth = {
  ok: boolean;
  message: string;
};

export type DatabaseClient = PostgresJsDatabase<typeof schema>;
export type DatabasePool = Sql;

let pool: DatabasePool | null = null;
let client: DatabaseClient | null = null;

const createDatabasePool = (config: AppConfig): DatabasePool =>
  postgres(config.DATABASE_URL, {
    max: config.DATABASE_POOL_MAX,
    idle_timeout: config.DATABASE_POOL_IDLE_TIMEOUT,
    connect_timeout: config.DATABASE_POOL_CONNECT_TIMEOUT,
    ssl: config.DATABASE_SSL ? "require" : false,
  });

export const getDatabasePool = (config: AppConfig = loadConfig()): DatabasePool => {
  if (!pool) {
    pool = createDatabasePool(config);
  }

  return pool;
};

export const getDatabaseClient = (config: AppConfig = loadConfig()): DatabaseClient => {
  if (!client) {
    const sql = getDatabasePool(config);
    client = drizzle(sql, { schema });
  }

  return client;
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end({ timeout: 5 });
  }

  pool = null;
  client = null;
};

export async function checkDatabaseHealth(
  config: AppConfig = loadConfig(),
): Promise<DependencyHealth> {
  if (config.NODE_ENV === "test") {
    return {
      ok: false,
      message: "Database health check disabled for tests",
    };
  }

  try {
    const sql = getDatabasePool(config);
    await sql`select 1`;
    return { ok: true, message: "Database connection ok" };
  } catch (_error) {
    return { ok: false, message: "Database connection failed" };
  }
}
