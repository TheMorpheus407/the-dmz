import { getDatabasePool, type DatabasePool } from '../../shared/database/connection.js';

const rollbackSignal = new Error('ROLLBACK_TEST_TRANSACTION');

export type TestTransaction<T> = (transaction: DatabasePool) => Promise<T> | T;

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
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetTestDatabase can only be used in test environment.');
  }

  const pool = getDatabasePool();
  await pool`TRUNCATE TABLE tenants RESTART IDENTITY CASCADE`;
}
