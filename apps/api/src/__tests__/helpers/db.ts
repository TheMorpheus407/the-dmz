import { getDatabasePool } from '../../shared/database/connection.js';

import type { TransactionSql } from 'postgres';

const rollbackSignal = new Error('ROLLBACK_TEST_TRANSACTION');

export type TestTransaction<T> = (transaction: TransactionSql) => Promise<T> | T;

export async function withTestTransaction<T>(fn: TestTransaction<T>): Promise<T> {
  const pool = getDatabasePool();
  let result: T | undefined;

  try {
    await pool.begin(async (transaction) => {
      result = await fn(transaction);
      throw rollbackSignal;
    });
  } catch (error) {
    if (error !== rollbackSignal) {
      throw error;
    }
  }

  return result as T;
}

export async function resetTestDatabase(): Promise<void> {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('resetTestDatabase can only be used in test environment.');
  }

  const pool = getDatabasePool();
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
