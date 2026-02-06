import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { beginMock, sqlTagMock, getDatabasePoolMock } = vi.hoisted(() => {
  const beginMock = vi.fn();
  const sqlTagMock = vi.fn();
  const getDatabasePoolMock = vi.fn(() =>
    Object.assign(sqlTagMock, {
      begin: beginMock,
    }),
  );

  return { beginMock, sqlTagMock, getDatabasePoolMock };
});

vi.mock('../../shared/database/connection.js', () => ({
  getDatabasePool: getDatabasePoolMock,
}));

import { resetTestDatabase, withTestTransaction } from './db.js';

import type { TransactionSql } from 'postgres';

const originalNodeEnv = process.env['NODE_ENV'];

beforeEach(() => {
  beginMock.mockReset();
  sqlTagMock.mockReset();
  getDatabasePoolMock.mockClear();
  process.env['NODE_ENV'] = 'test';
});

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env['NODE_ENV'];
    return;
  }

  process.env['NODE_ENV'] = originalNodeEnv;
});

describe('withTestTransaction', () => {
  it('returns callback result from a transaction callback', async () => {
    const transaction = {} as TransactionSql;
    beginMock.mockImplementationOnce(async (fn: (sql: TransactionSql) => Promise<unknown>) => {
      await fn(transaction);
      return [];
    });

    const result = await withTestTransaction(async (sql) => {
      expect(sql).toBe(transaction);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(beginMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-rollback errors from begin', async () => {
    beginMock.mockRejectedValueOnce(new Error('boom'));

    await expect(withTestTransaction(async () => 'never')).rejects.toThrow('boom');
  });
});

describe('resetTestDatabase', () => {
  it('throws when NODE_ENV is not test', async () => {
    process.env['NODE_ENV'] = 'development';

    await expect(resetTestDatabase()).rejects.toThrow(
      'resetTestDatabase can only be used in test environment.',
    );
    expect(sqlTagMock).not.toHaveBeenCalled();
  });

  it('runs truncate in test environment', async () => {
    sqlTagMock.mockResolvedValueOnce([]);

    await resetTestDatabase();

    expect(sqlTagMock).toHaveBeenCalledTimes(1);
    const [template] = sqlTagMock.mock.calls[0] ?? [];
    expect(Array.isArray(template)).toBe(true);
    expect((template as TemplateStringsArray)[0]).toContain('TRUNCATE TABLE tenants');
  });
});
