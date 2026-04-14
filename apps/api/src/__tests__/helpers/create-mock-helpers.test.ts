import { describe, expect, it, vi } from 'vitest';

import { createMockDb, createMockRedis } from './index.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';
import type { RedisRateLimitClient } from '../../../shared/database/redis.js';

describe('createMockDb', () => {
  describe('query table mocking', () => {
    it('returns a mock db with query methods', () => {
      const { mockDb } = createMockDb();

      expect(mockDb.query).toBeDefined();
      expect(typeof mockDb.query).toBe('object');
    });

    it('allows setting findFirst result for a table', () => {
      const { mockDb, setQueryResult } = createMockDb();

      const mockResult = { id: 'test-1', name: 'Test' };
      setQueryResult('socialRelationships', 'findFirst', mockResult);

      expect(mockDb.query.socialRelationships.findFirst()).resolves.toEqual(mockResult);
    });

    it('allows setting findMany result for a table', () => {
      const { mockDb, setQueryResult } = createMockDb();

      const mockResults = [
        { id: 'test-1', name: 'Test 1' },
        { id: 'test-2', name: 'Test 2' },
      ];
      setQueryResult('leaderboards', 'findMany', mockResults);

      expect(mockDb.query.leaderboards.findMany()).resolves.toEqual(mockResults);
    });

    it('returns null for findFirst when no result is set', async () => {
      const { mockDb } = createMockDb();

      const result = await mockDb.query.someTable.findFirst();
      expect(result).toBeNull();
    });

    it('returns empty array for findMany when no result is set', async () => {
      const { mockDb } = createMockDb();

      const result = await mockDb.query.someTable.findMany();
      expect(result).toEqual([]);
    });

    it('supports multiple tables with different mock results', () => {
      const { mockDb, setQueryResult } = createMockDb();

      const leaderboardResult = { id: 'lb-1', scope: 'global' };
      const entryResult = { id: 'entry-1', score: 100 };

      setQueryResult('leaderboards', 'findFirst', leaderboardResult);
      setQueryResult('leaderboardEntries', 'findFirst', entryResult);

      expect(mockDb.query.leaderboards.findFirst()).resolves.toEqual(leaderboardResult);
      expect(mockDb.query.leaderboardEntries.findFirst()).resolves.toEqual(entryResult);
    });
  });

  describe('insert mocking', () => {
    it('allows setting insert result for returning', async () => {
      const { mockDb, setInsertResult } = createMockDb();

      const insertResult = [{ id: 'new-1', name: 'New Record' }];
      setInsertResult(insertResult);

      const result = await mockDb.insert('users').values({}).returning();
      expect(result).toEqual(insertResult);
    });

    it('returns empty array for insert when no result is set', async () => {
      const { mockDb } = createMockDb();

      const result = await mockDb.insert('users').values({}).returning();
      expect(result).toEqual([]);
    });
  });

  describe('update mocking', () => {
    it('provides chainable update pattern', () => {
      const { mockDb } = createMockDb();

      expect(mockDb.update).toBeDefined();
      expect(typeof mockDb.update).toBe('function');
    });

    it('allows update to be called and return chainable methods', () => {
      const { mockDb } = createMockDb();

      const updateChain = mockDb.update('someTable');
      expect(updateChain).toBeDefined();
      expect(typeof updateChain.set).toBe('function');
    });

    it('allows setting update result for returning', async () => {
      const { mockDb, setUpdateResult } = createMockDb();

      const updateResult = [{ id: 'updated-1', name: 'Updated Record' }];
      setUpdateResult(updateResult);

      const result = await mockDb.update('users').set({}).where().returning();
      expect(result).toEqual(updateResult);
    });

    it('returns empty array for update when no result is set', async () => {
      const { mockDb } = createMockDb();

      const result = await mockDb.update('users').set({}).where().returning();
      expect(result).toEqual([]);
    });
  });

  describe('delete mocking', () => {
    it('provides delete method', () => {
      const { mockDb } = createMockDb();

      expect(mockDb.delete).toBeDefined();
      expect(typeof mockDb.delete).toBe('function');
    });

    it('delete returns chainable where method', () => {
      const { mockDb } = createMockDb();

      const deleteChain = mockDb.delete('someTable');
      expect(deleteChain).toBeDefined();
      expect(typeof deleteChain.where).toBe('function');
    });

    it('allows setting delete result for returning', async () => {
      const { mockDb, setDeleteResult } = createMockDb();

      const deleteResult = [{ id: 'deleted-1', name: 'Deleted Record' }];
      setDeleteResult(deleteResult);

      const result = await mockDb.delete('users').where().returning();
      expect(result).toEqual(deleteResult);
    });

    it('returns empty array for delete when no result is set', async () => {
      const { mockDb } = createMockDb();

      const result = await mockDb.delete('users').where().returning();
      expect(result).toEqual([]);
    });
  });

  describe('select mocking', () => {
    it('provides select method', () => {
      const { mockDb } = createMockDb();

      expect(mockDb.select).toBeDefined();
      expect(typeof mockDb.select).toBe('function');
    });

    it('select returns chainable from method', () => {
      const { mockDb } = createMockDb();

      const selectChain = mockDb.select();
      expect(selectChain).toBeDefined();
      expect(typeof selectChain.from).toBe('function');
    });
  });

  describe('reset functionality', () => {
    it('can reset all query results', () => {
      const { mockDb, setQueryResult, resetMockDb } = createMockDb();

      setQueryResult('leaderboards', 'findFirst', { id: 'lb-1' });
      expect(mockDb.query.leaderboards.findFirst()).resolves.toEqual({ id: 'lb-1' });

      resetMockDb();

      expect(mockDb.query.leaderboards.findFirst()).resolves.toBeNull();
    });
  });

  describe('multiple query result overrides', () => {
    it('can override query results multiple times', () => {
      const { mockDb, setQueryResult } = createMockDb();

      setQueryResult('leaderboards', 'findFirst', { id: 'lb-1' });
      expect(mockDb.query.leaderboards.findFirst()).resolves.toEqual({ id: 'lb-1' });

      setQueryResult('leaderboards', 'findFirst', { id: 'lb-2' });
      expect(mockDb.query.leaderboards.findFirst()).resolves.toEqual({ id: 'lb-2' });
    });

    it('can override findMany results multiple times', () => {
      const { mockDb, setQueryResult } = createMockDb();

      const results1 = [{ id: '1' }];
      const results2 = [{ id: '2' }, { id: '3' }];

      setQueryResult('leaderboards', 'findMany', results1);
      expect(mockDb.query.leaderboards.findMany()).resolves.toEqual(results1);

      setQueryResult('leaderboards', 'findMany', results2);
      expect(mockDb.query.leaderboards.findMany()).resolves.toEqual(results2);
    });
  });

  describe('as DatabaseClient type compatibility', () => {
    it('can be used where DatabaseClient is expected', () => {
      const { mockDb } = createMockDb();

      const db: DatabaseClient = mockDb as unknown as DatabaseClient;

      expect(db).toBeDefined();
      expect(db.query).toBeDefined();
    });
  });
});

describe('createMockRedis', () => {
  describe('zadd mocking', () => {
    it('returns a mock redis client with zadd method', () => {
      const { mockRedis } = createMockRedis();

      expect(mockRedis.zadd).toBeDefined();
      expect(typeof mockRedis.zadd).toBe('function');
    });

    it('zadd resolves to 1 by default', async () => {
      const { mockRedis } = createMockRedis();

      const result = await mockRedis.zadd('test-key', 100, 'member-1');
      expect(result).toBe(1);
    });

    it('zadd can be configured to return custom value', async () => {
      const { mockRedis } = createMockRedis();

      mockRedis.zadd = vi.fn().mockResolvedValue(5);

      const result = await mockRedis.zadd('test-key', 100, 'member-1');
      expect(result).toBe(5);
    });
  });

  describe('zrevrange mocking', () => {
    it('returns a mock redis client with zrevrange method', () => {
      const { mockRedis } = createMockRedis();

      expect(mockRedis.zrevrange).toBeDefined();
      expect(typeof mockRedis.zrevrange).toBe('function');
    });

    it('zrevrange resolves to empty array by default', async () => {
      const { mockRedis } = createMockRedis();

      const result = await mockRedis.zrevrange('test-key', 0, 10);
      expect(result).toEqual([]);
    });

    it('zrevrange can be configured to return custom value', async () => {
      const { mockRedis } = createMockRedis();

      const customResult = [
        { member: 'player-1', score: 150 },
        { member: 'player-2', score: 140 },
      ];
      mockRedis.zrevrange = vi.fn().mockResolvedValue(customResult);

      const result = await mockRedis.zrevrange('test-key', 0, 10);
      expect(result).toEqual(customResult);
    });
  });

  describe('as RedisRateLimitClient type compatibility', () => {
    it('can be used where RedisRateLimitClient is expected', () => {
      const { mockRedis } = createMockRedis();

      const client: RedisRateLimitClient = mockRedis as unknown as RedisRateLimitClient;

      expect(client).toBeDefined();
      expect(client.zadd).toBeDefined();
      expect(client.zrevrange).toBeDefined();
    });
  });

  describe('multiple operation mocking', () => {
    it('can mock both zadd and zrevrange for same test', async () => {
      const { mockRedis } = createMockRedis();

      mockRedis.zadd = vi.fn().mockResolvedValue(1);
      mockRedis.zrevrange = vi.fn().mockResolvedValue([
        { member: 'player-1', score: 150 },
        { member: 'player-2', score: 140 },
      ]);

      const zaddResult = await mockRedis.zadd('leaderboard:global', 150, 'player-1');
      const rangeResult = await mockRedis.zrevrange('leaderboard:global', 0, 10);

      expect(zaddResult).toBe(1);
      expect(rangeResult).toHaveLength(2);
      expect(rangeResult[0]).toEqual({ member: 'player-1', score: 150 });
    });
  });
});
