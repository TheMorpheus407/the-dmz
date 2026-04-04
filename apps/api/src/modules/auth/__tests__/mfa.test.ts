import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestConfig } from '@the-dmz/shared/testing';

import { type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabaseClient,
  getDatabasePool,
} from '../../../shared/database/connection.js';

const adminDatabaseUrl = 'postgresql://dmz:dmz_dev@localhost:5432/postgres';
const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

let testConfig = createTestConfig();

const createIsolatedTestConfig = (base: AppConfig, databaseName: string): AppConfig => ({
  ...base,
  DATABASE_URL: `postgresql://dmz:dmz_dev@localhost:5432/${databaseName}`,
});

const createIsolatedDatabase = async (config: AppConfig): Promise<() => Promise<void>> => {
  const databaseName = new URL(config.DATABASE_URL).pathname.replace(/^\//, '');
  const adminPool = postgres(adminDatabaseUrl, { max: 1 });

  const cleanup = async (): Promise<void> => {
    await adminPool.unsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${databaseName}'
        AND pid <> pg_backend_pid()
    `);
    await adminPool.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end({ timeout: 5 });
  };

  try {
    await adminPool.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.unsafe(`CREATE DATABASE "${databaseName}"`);
    return cleanup;
  } catch (error) {
    await adminPool.end({ timeout: 5 });
    throw error;
  }
};

let testConfig: AppConfig;
let cleanupDatabase: (() => Promise<void>) | undefined;

beforeEach(async () => {
  const databaseName = `dmz_t_mfa_${randomUUID().replace(/-/g, '_')}`;
  testConfig = createIsolatedTestConfig(testConfig, databaseName);
  cleanupDatabase = await createIsolatedDatabase(testConfig);

  const db = getDatabaseClient(testConfig);
  await migrate(db, { migrationsFolder });
});

afterEach(async () => {
  await closeDatabase();

  if (cleanupDatabase) {
    await cleanupDatabase();
  }

  cleanupDatabase = undefined;
});

describe('MFA database schema', () => {
  describe('webauthn_credentials table', () => {
    it('exists in auth schema', async () => {
      const pool = getDatabasePool(testConfig);
      const tables = await pool`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'webauthn_credentials'
      `;

      expect(tables.length).toBe(1);
    });

    it('has correct columns', async () => {
      const pool = getDatabasePool(testConfig);
      const columns = await pool`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'webauthn_credentials'
      `;

      const columnNames = columns.map((c) => c['column_name']);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('tenant_id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('credential_id');
      expect(columnNames).toContain('public_key');
      expect(columnNames).toContain('counter');
      expect(columnNames).toContain('transports');
      expect(columnNames).toContain('created_at');
    });

    it('has tenant isolation policy', async () => {
      const pool = getDatabasePool(testConfig);
      const policies = await pool`
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'auth' AND tablename = 'webauthn_credentials'
      `;

      expect(policies.length).toBeGreaterThan(0);
    });
  });

  describe('sessions table MFA columns', () => {
    it('has mfa_verified_at column', async () => {
      const pool = getDatabasePool(testConfig);
      const columns = await pool`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'mfa_verified_at'
      `;

      expect(columns.length).toBe(1);
    });

    it('has mfa_method column', async () => {
      const pool = getDatabasePool(testConfig);
      const columns = await pool`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'mfa_method'
      `;

      expect(columns.length).toBe(1);
    });
  });
});
