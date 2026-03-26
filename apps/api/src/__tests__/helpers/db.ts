import { getDatabasePool } from '../../shared/database/connection.js';

import type { AppConfig } from '../../config.js';
import type { TransactionSql } from 'postgres';

const rollbackSignal = new Error('ROLLBACK_TEST_TRANSACTION');

export type TestTransaction<T> = (transaction: TransactionSql) => Promise<T> | T;

export async function withTestTransaction<T>(fn: TestTransaction<T>): Promise<T> {
  const pool = getDatabasePool();
  let result: T | undefined;

  try {
    const reserved = await pool.reserve();
    try {
      await reserved.begin(async (transaction) => {
        result = await fn(transaction);
        throw rollbackSignal;
      });
    } finally {
      reserved.release();
    }
  } catch (error) {
    if (error !== rollbackSignal) {
      throw error;
    }
  }

  return result as T;
}

export const TENANT_COLUMN_DEFS = [
  'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email varchar(255)',
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_state jsonb DEFAULT '{}'::jsonb",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS idp_config jsonb DEFAULT '{}'::jsonb",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_frameworks jsonb DEFAULT '{}'::jsonb",
] as const;

export async function ensureTenantColumns(config?: AppConfig): Promise<void> {
  const pool = getDatabasePool(config);

  for (const columnDef of TENANT_COLUMN_DEFS) {
    try {
      await pool`${pool.unsafe(columnDef)}`;
    } catch {
      // Column may already exist
    }
  }
}

export async function resetTestDatabase(config?: AppConfig): Promise<void> {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('resetTestDatabase can only be used in test environment.');
  }

  await ensureTenantColumns(config);

  const pool = getDatabasePool(config);

  await pool`TRUNCATE TABLE
    auth.role_permissions,
    auth.user_roles,
    auth.sessions,
    auth.sso_connections,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
}
