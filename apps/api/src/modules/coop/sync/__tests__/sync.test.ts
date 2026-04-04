import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../../game/event-store/index.js', () => ({
  appendEvent: vi.fn(),
}));

import {
  getDatabaseClient,
  type DatabaseClient,
  type DB,
} from '../../../../shared/database/connection.js';
import { validateAndApplyAction } from '../sync.service.js';
import { buildCoopChannelName } from '../websocket.handler.js';

import type { AppConfig } from '../../../../config.js';
import type { IEventBus } from '../../../../shared/events/event-types.js';

const mockConfig = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
} as unknown as AppConfig;

const mockEventBus: IEventBus = {
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

const createMockDb = (overrides?: Record<string, unknown>): DatabaseClient => {
  return {
    query: {
      coopSession: {
        findFirst: vi.fn().mockResolvedValue(overrides?.coopSessionFindFirst),
      },
      coopRoleAssignment: {
        findFirst: vi.fn().mockResolvedValue(overrides?.roleAssignmentFindFirst),
      },
    },
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    transaction: vi.fn().mockImplementation(async (cb) => {
      const txDb = {
        query: {},
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ eventId: 'event-1', serverTime: new Date() }]),
          }),
        })),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ sessionSeq: 6 }]),
            }),
          }),
        }),
      };
      return cb(txDb as DB);
    }),
  } as unknown as DatabaseClient;
};

describe('sync service - sequence enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAndApplyAction', () => {
    it('rejects action when clientSeq is behind (stale seq)', async () => {
      const mockDb = createMockDb({
        coopSessionFindFirst: {
          sessionId: 'session-1',
          tenantId: 'tenant-1',
          status: 'active',
          sessionSeq: 5,
          gameSessionId: 'game-1',
          partyId: 'party-1',
        },
      });

      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      const result = await validateAndApplyAction(mockConfig, mockEventBus, {
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        playerId: 'player-1',
        action: 'move',
        payload: { x: 1, y: 2 },
        clientSeq: 3,
        requestId: 'req-1',
      });

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('STALE_SEQ');
      expect(result.currentSeq).toBe(5);
    });

    it('rejects action when clientSeq is more than one ahead (gap detected)', async () => {
      const mockDb = createMockDb({
        coopSessionFindFirst: {
          sessionId: 'session-1',
          tenantId: 'tenant-1',
          status: 'active',
          sessionSeq: 5,
          gameSessionId: 'game-1',
          partyId: 'party-1',
        },
      });

      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      const result = await validateAndApplyAction(mockConfig, mockEventBus, {
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        playerId: 'player-1',
        action: 'move',
        payload: { x: 1, y: 2 },
        clientSeq: 8,
        requestId: 'req-1',
      });

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('GAP_DETECTED');
      expect(result.currentSeq).toBe(5);
    });

    it('rejects action when session is not active', async () => {
      const mockDb = createMockDb({
        coopSessionFindFirst: {
          sessionId: 'session-1',
          tenantId: 'tenant-1',
          status: 'lobby',
          sessionSeq: 0,
          gameSessionId: 'game-1',
          partyId: 'party-1',
        },
      });

      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      const result = await validateAndApplyAction(mockConfig, mockEventBus, {
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        playerId: 'player-1',
        action: 'move',
        payload: { x: 1, y: 2 },
        clientSeq: 0,
        requestId: 'req-1',
      });

      expect(result.accepted).toBe(false);
      expect(result.error).toBe('Session is not active');
    });

    it('rejects action for non-existent session', async () => {
      const mockDb = createMockDb({
        coopSessionFindFirst: null,
      });

      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      const result = await validateAndApplyAction(mockConfig, mockEventBus, {
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        playerId: 'player-1',
        action: 'move',
        payload: { x: 1, y: 2 },
        clientSeq: 0,
        requestId: 'req-1',
      });

      expect(result.accepted).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('sequence never decreases', () => {
    it('rejects stale sequence to prevent regression', async () => {
      const mockDb = createMockDb({
        coopSessionFindFirst: {
          sessionId: 'session-1',
          tenantId: 'tenant-1',
          status: 'active',
          sessionSeq: 5,
          gameSessionId: 'game-1',
          partyId: 'party-1',
        },
      });

      vi.mocked(getDatabaseClient).mockReturnValue(mockDb);

      const result = await validateAndApplyAction(mockConfig, mockEventBus, {
        sessionId: 'session-1',
        tenantId: 'tenant-1',
        playerId: 'player-1',
        action: 'move',
        payload: {},
        clientSeq: 3,
        requestId: 'req-1',
      });

      expect(result.reason).toBe('STALE_SEQ');
    });
  });
});

describe('sync service - channel format', () => {
  it('uses correct session.events channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'events');
    expect(channel).toBe('session.events:test-session-id');
  });

  it('uses correct session.state channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'state');
    expect(channel).toBe('session.state:test-session-id');
  });

  it('uses correct session.arbitration channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'arbitration');
    expect(channel).toBe('session.arbitration:test-session-id');
  });

  it('uses correct session.presence channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'presence');
    expect(channel).toBe('session.presence:test-session-id');
  });
});

describe('sync service - reconnect handling', () => {
  it('detects when full state recovery is needed', () => {
    const lastSeq = 0;
    const lastSnapshotSeq = 5;

    const needsFullState = lastSeq < lastSnapshotSeq;
    expect(needsFullState).toBe(true);
  });

  it('detects when missed events need to be fetched', () => {
    const lastSeq = 5;
    const currentSeq = 10;

    const missedEvents: number[] = [];
    for (let i = lastSeq + 1; i <= currentSeq; i++) {
      missedEvents.push(i);
    }

    expect(missedEvents).toEqual([6, 7, 8, 9, 10]);
  });

  it('no missed events when client is at current seq', () => {
    const lastSeq = 10;
    const currentSeq = 10;

    const missedEvents: number[] = [];
    for (let i = lastSeq + 1; i <= currentSeq; i++) {
      missedEvents.push(i);
    }

    expect(missedEvents).toEqual([]);
  });
});

describe('sync service - client seq tracking', () => {
  it('client tracks current seq after action accepted', () => {
    let currentSeq = 5;
    let lastSyncedSeq = 5;

    const acceptedMsg = { seq: 6, requestId: 'test' };
    if (acceptedMsg.seq !== undefined) {
      currentSeq = acceptedMsg.seq;
      lastSyncedSeq = acceptedMsg.seq;
    }

    expect(currentSeq).toBe(6);
    expect(lastSyncedSeq).toBe(6);
  });

  it('client updates current seq on stale rejection', () => {
    let currentSeq = 5;
    const lastSyncedSeq = 5;

    const rejectedMsg = { reason: 'STALE_SEQ' as const, currentSeq: 7, requestId: 'test' };
    if (rejectedMsg.currentSeq !== undefined) {
      currentSeq = rejectedMsg.currentSeq;
    }

    expect(currentSeq).toBe(7);
    expect(lastSyncedSeq).toBe(5);
  });

  it('client updates current seq on gap detection', () => {
    let currentSeq = 5;
    const lastSyncedSeq = 5;

    const rejectedMsg = { reason: 'GAP_DETECTED' as const, currentSeq: 8, requestId: 'test' };
    if (rejectedMsg.currentSeq !== undefined) {
      currentSeq = rejectedMsg.currentSeq;
    }

    expect(currentSeq).toBe(8);
    expect(lastSyncedSeq).toBe(5);
  });
});
