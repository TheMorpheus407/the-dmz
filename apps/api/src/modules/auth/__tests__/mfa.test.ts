import { afterAll, describe, expect, it } from 'vitest';

import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';

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

describe('MFA database schema', () => {
  const pool = getDatabasePool(testConfig);

  afterAll(async () => {
    await closeDatabase();
  });

  describe('webauthn_credentials table', () => {
    it('exists in auth schema', async () => {
      const tables = await pool`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'webauthn_credentials'
      `;

      expect(tables.length).toBe(1);
    });

    it('has correct columns', async () => {
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
      const policies = await pool`
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'auth' AND tablename = 'webauthn_credentials'
      `;

      expect(policies.length).toBeGreaterThan(0);
    });
  });

  describe('sessions table MFA columns', () => {
    it('has mfa_verified_at column', async () => {
      const columns = await pool`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'mfa_verified_at'
      `;

      expect(columns.length).toBe(1);
    });

    it('has mfa_method column', async () => {
      const columns = await pool`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'mfa_method'
      `;

      expect(columns.length).toBe(1);
    });
  });
});
