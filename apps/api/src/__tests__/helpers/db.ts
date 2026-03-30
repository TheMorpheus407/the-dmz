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

  const reserved = await pool.reserve();
  try {
    for (const columnDef of TENANT_COLUMN_DEFS) {
      try {
        await reserved.unsafe(columnDef);
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code !== '42701') {
          throw error;
        }
      }
    }
  } finally {
    reserved.release();
  }
}

export async function resetTestDatabase(config?: AppConfig): Promise<void> {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('resetTestDatabase can only be used in test environment.');
  }

  const pool = getDatabasePool(config);

  const reserved = await pool.reserve();
  try {
    await reserved.unsafe(
      `SELECT set_config('app.current_tenant_id', '', false), set_config('app.tenant_id', '', false), set_config('app.current_user_id', '', false), set_config('app.is_super_admin', '', false)`,
    );

    const tablesToTruncate = [
      'auth.user_profiles',
      'auth.role_permissions',
      'auth.user_roles',
      'auth.sessions',
      'auth.sso_connections',
      'auth.roles',
      'auth.permissions',
      'users',
      'tenants',
    ];

    for (const table of tablesToTruncate) {
      try {
        const tableParts = table.split('.');
        if (tableParts.length === 2) {
          await reserved.unsafe(
            `TRUNCATE TABLE "${tableParts[0]}"."${tableParts[1]}" RESTART IDENTITY CASCADE`,
          );
        } else {
          await reserved.unsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        }
      } catch {
        // Table doesn't exist - skip
      }
    }

    for (const columnDef of TENANT_COLUMN_DEFS) {
      try {
        await reserved.unsafe(columnDef);
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code !== '42701') {
          throw error;
        }
      }
    }
  } finally {
    reserved.release();
  }
}
