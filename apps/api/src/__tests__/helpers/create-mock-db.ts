import { vi } from 'vitest';

import type { DatabaseClient } from '../../../shared/database/connection.js';
import type { RedisRateLimitClient } from '../../../shared/database/redis.js';

type QueryResults = Map<string, unknown>;
type InsertResults = Map<string, unknown>;
type UpdateResults = Map<string, unknown>;
type DeleteResults = Map<string, unknown>;

interface _MockDb {
  query: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
}

interface CreateMockDbReturn {
  mockDb: DatabaseClient;
  setQueryResult: (table: string, method: 'findFirst' | 'findMany', result: unknown) => void;
  setInsertResult: (result: unknown[]) => void;
  setUpdateResult: (result: unknown[]) => void;
  setDeleteResult: (result: unknown[]) => void;
  resetMockDb: () => void;
}

export function createMockDb(): CreateMockDbReturn {
  const queryResults: QueryResults = new Map();
  const insertResults: InsertResults = new Map();
  const updateResults: UpdateResults = new Map();
  const deleteResults: DeleteResults = new Map();

  const createQueryTable = (tableName: string) => {
    const findFirstFn = vi.fn().mockImplementation(async () => {
      return queryResults.get(`${tableName}.findFirst`) ?? null;
    });
    const findManyFn = vi.fn().mockImplementation(async () => {
      return queryResults.get(`${tableName}.findMany`) ?? [];
    });
    return {
      findFirst: findFirstFn,
      findMany: findManyFn,
    };
  };

  const tableMocks = new Map<string, ReturnType<typeof createQueryTable>>();

  const mockDb = {
    query: new Proxy({} as Record<string, Record<string, ReturnType<typeof vi.fn>>>, {
      get: (_target, table: string) => {
        if (!tableMocks.has(table as string)) {
          tableMocks.set(table as string, createQueryTable(table as string));
        }
        return tableMocks.get(table as string)!;
      },
    }),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => ({
        returning: vi.fn().mockImplementation(async () => {
          return insertResults.get('returning') ?? [];
        }),
      })),
    })),
    update: vi.fn().mockImplementation((_table: string) => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          returning: vi.fn().mockImplementation(async () => {
            return updateResults.get('returning') ?? [];
          }),
        })),
      })),
    })),
    delete: vi.fn().mockImplementation((_table: string) => ({
      where: vi.fn().mockImplementation(() => ({
        returning: vi.fn().mockImplementation(async () => {
          return deleteResults.get('returning') ?? [];
        }),
      })),
    })),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({})),
        orderBy: vi.fn().mockImplementation(() => ({})),
        limit: vi.fn().mockImplementation(() => ({})),
        offset: vi.fn().mockImplementation(() => ({})),
      })),
    })),
  } as unknown as DatabaseClient;

  const setQueryResult = (table: string, method: 'findFirst' | 'findMany', result: unknown) => {
    queryResults.set(`${table}.${method}`, result);
  };

  const setInsertResult = (result: unknown[]) => {
    insertResults.set('returning', result);
  };

  const setUpdateResult = (result: unknown[]) => {
    updateResults.set('returning', result);
  };

  const setDeleteResult = (result: unknown[]) => {
    deleteResults.set('returning', result);
  };

  const resetMockDb = () => {
    queryResults.clear();
    insertResults.clear();
    updateResults.clear();
    deleteResults.clear();
    tableMocks.clear();
  };

  return {
    mockDb,
    setQueryResult,
    setInsertResult,
    setUpdateResult,
    setDeleteResult,
    resetMockDb,
  };
}

interface CreateMockRedisReturn {
  mockRedis: RedisRateLimitClient;
}

export function createMockRedis(): CreateMockRedisReturn {
  const mockRedis = {
    zadd: vi.fn().mockResolvedValue(1),
    zrevrange: vi.fn().mockImplementation(async () => {
      return [];
    }),
  } as unknown as RedisRateLimitClient;

  return {
    mockRedis,
  };
}
