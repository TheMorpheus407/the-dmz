import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { beginMock, sqlTagMock, unsafeMock, reserveMock, getDatabasePoolMock } = vi.hoisted(() => {
  const beginMock = vi.fn();
  const sqlTagMock = vi.fn();
  const unsafeMock = vi.fn().mockResolvedValue([]);
  const reserveMock = vi.fn(() => ({
    begin: beginMock,
    release: vi.fn(),
  }));
  const getDatabasePoolMock = vi.fn(() =>
    Object.assign(sqlTagMock, {
      begin: beginMock,
      unsafe: unsafeMock,
      reserve: reserveMock,
    }),
  );

  return { beginMock, sqlTagMock, unsafeMock, reserveMock, getDatabasePoolMock };
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
  unsafeMock.mockReset();
  reserveMock.mockReset();
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
    expect(unsafeMock).not.toHaveBeenCalled();
  });

  it('runs truncate in test environment', async () => {
    await resetTestDatabase();

    expect(unsafeMock).toHaveBeenCalledTimes(12);
    const calls = unsafeMock.mock.calls.map(([sql]) => sql as string);

    const alterTableCalls = calls.filter((sql) => sql.includes('ALTER TABLE'));
    expect(alterTableCalls).toHaveLength(4);
    expect(alterTableCalls.some((sql) => sql.includes('contact_email'))).toBe(true);
    expect(alterTableCalls.some((sql) => sql.includes('onboarding_state'))).toBe(true);
    expect(alterTableCalls.some((sql) => sql.includes('idp_config'))).toBe(true);
    expect(alterTableCalls.some((sql) => sql.includes('compliance_frameworks'))).toBe(true);

    const truncateTableCalls = calls.filter((sql) => sql.includes('TRUNCATE TABLE'));
    expect(truncateTableCalls).toHaveLength(8);
    expect(truncateTableCalls.some((sql) => sql.includes('auth.role_permissions'))).toBe(true);
    expect(truncateTableCalls.some((sql) => sql.includes('auth.permissions'))).toBe(true);
    expect(truncateTableCalls.some((sql) => sql.includes('users'))).toBe(true);
    expect(truncateTableCalls.some((sql) => sql.includes('tenants'))).toBe(true);
  });
});
