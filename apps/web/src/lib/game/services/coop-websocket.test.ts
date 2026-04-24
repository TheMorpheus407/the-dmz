import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CoopWebSocketClient as CoopWebSocketClientType } from './coop-websocket';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const mockWsInstance = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
};

vi.stubGlobal(
  'WebSocket',
  vi.fn(() => mockWsInstance),
);

describe('CoopWebSocketClient', () => {
  let onEvent: ReturnType<typeof vi.fn>;
  let onResync: ReturnType<typeof vi.fn>;
  let onActionRejected: ReturnType<typeof vi.fn>;
  let CoopWebSocketClient: CoopWebSocketClientType;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockWsInstance.send.mockClear();
    mockWsInstance.close.mockClear();

    const module = await import('./coop-websocket');
    CoopWebSocketClient = module.CoopWebSocketClient;

    onEvent = vi.fn();
    onResync = vi.fn();
    onActionRejected = vi.fn();
  });

  const createClient = () => {
    return new CoopWebSocketClient({
      sessionId: 'test-session',
      userId: 'test-user',
      onEvent,
      onResync,
      onActionRejected,
    });
  };

  describe('handleMessage dispatch', () => {
    it('should dispatch SESSION_EVENT to handleSessionEvent', () => {
      const client = createClient();
      const message = {
        type: 'SESSION_EVENT',
        payload: { eventType: 'test-event', payload: { foo: 'bar' } },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(onEvent).toHaveBeenCalledWith({
        type: 'test-event',
        payload: { foo: 'bar' },
      });
    });

    it('should dispatch coop.session.created to handleSessionCreated', () => {
      const client = createClient();
      const message = {
        type: 'coop.session.created',
        payload: { eventType: 'session-created', payload: { id: '123' } },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(onEvent).toHaveBeenCalledWith({
        type: 'session-created',
        payload: { id: '123' },
      });
    });

    it('should dispatch ACTION_ACCEPTED to handleActionAccepted', () => {
      const client = createClient();
      const message = {
        type: 'ACTION_ACCEPTED',
        payload: { seq: 42 },
        timestamp: Date.now(),
        sequence: 5,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(42);
      expect(client.getLastSyncedSeq()).toBe(42);
    });

    it('should resolve pending message when ACTION_ACCEPTED is received', () => {
      const client = createClient();
      const resolveFn = vi.fn();
      (client as unknown as { pendingMessages: Map<number, () => void> }).pendingMessages.set(
        5,
        resolveFn,
      );

      const message = {
        type: 'ACTION_ACCEPTED',
        payload: { seq: 10 },
        timestamp: Date.now(),
        sequence: 5,
      };

      client.handleMessage(message);

      expect(resolveFn).toHaveBeenCalled();
      expect(
        (client as unknown as { pendingMessages: Map<number, () => void> }).pendingMessages.has(5),
      ).toBe(false);
    });

    it('should dispatch ACTION_REJECTED to handleActionRejected', () => {
      const client = createClient();
      const message = {
        type: 'ACTION_REJECTED',
        payload: { reason: 'STALE_SEQ', currentSeq: 100 },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(100);
      expect(onActionRejected).toHaveBeenCalledWith('STALE_SEQ', 100);
    });

    it('should not call onActionRejected when currentSeq is undefined in ACTION_REJECTED', () => {
      const client = createClient();
      const message = {
        type: 'ACTION_REJECTED',
        payload: { reason: 'STALE_SEQ' },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(onActionRejected).not.toHaveBeenCalled();
    });

    it('should dispatch EVENT to handleEvent', () => {
      const client = createClient();
      const message = {
        type: 'EVENT',
        payload: { seq: 50, event: { eventType: 'threat-detected', data: 'test' } },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(50);
      expect(onEvent).toHaveBeenCalledWith({
        type: 'threat-detected',
        payload: { eventType: 'threat-detected', data: 'test' },
      });
    });

    it('should not call onEvent when EVENT has no event field', () => {
      const client = createClient();
      const message = {
        type: 'EVENT',
        payload: { seq: 50 },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(50);
      expect(onEvent).not.toHaveBeenCalled();
    });

    it('should dispatch STATE_SNAPSHOT to handleStateSnapshot', () => {
      const client = createClient();
      const message = {
        type: 'STATE_SNAPSHOT',
        payload: { seq: 75 },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(75);
      expect(client.getLastSyncedSeq()).toBe(75);
      expect(onResync).toHaveBeenCalledWith(75);
    });

    it('should dispatch RESYNC to handleResyncMessage', () => {
      const client = createClient();
      const message = {
        type: 'RESYNC',
        payload: { currentSeq: 200 },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(200);
      expect(onResync).toHaveBeenCalledWith(200);
    });

    it('should handle ACK message and resolve pending message by ackFor', () => {
      const client = createClient();
      const resolveFn = vi.fn();
      (client as unknown as { pendingMessages: Map<number, () => void> }).pendingMessages.set(
        10,
        resolveFn,
      );

      const message = {
        type: 'ACK',
        payload: {},
        timestamp: Date.now(),
        sequence: 1,
        ackFor: 10,
      };

      client.handleMessage(message);

      expect(resolveFn).toHaveBeenCalled();
      expect(
        (client as unknown as { pendingMessages: Map<number, () => void> }).pendingMessages.has(10),
      ).toBe(false);
    });

    it('should not process ACK when ackFor is undefined', () => {
      const client = createClient();
      const message = {
        type: 'ACK',
        payload: {},
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(0);
    });

    it('should silently ignore unknown message types', () => {
      const client = createClient();
      const message = {
        type: 'UNKNOWN_TYPE',
        payload: { some: 'data' },
        timestamp: Date.now(),
        sequence: 1,
      };

      expect(() => client.handleMessage(message)).not.toThrow();
      expect(onEvent).not.toHaveBeenCalled();
      expect(onResync).not.toHaveBeenCalled();
      expect(onActionRejected).not.toHaveBeenCalled();
    });
  });

  describe('handleSessionCreated delegates to handleSessionEvent', () => {
    it('should call onEvent with correct structure when coop.session.created is received', () => {
      const client = createClient();
      const message = {
        type: 'coop.session.created',
        payload: { eventType: 'created', payload: { sessionId: 'new-session' } },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(onEvent).toHaveBeenCalledWith({
        type: 'created',
        payload: { sessionId: 'new-session' },
      });
    });
  });

  describe('sequence tracking', () => {
    it('should update currentSeq but not lastSyncedSeq for EVENT', () => {
      const client = createClient();
      (client as unknown as { currentSeq: number; lastSyncedSeq: number }).currentSeq = 10;
      (client as unknown as { currentSeq: number; lastSyncedSeq: number }).lastSyncedSeq = 10;

      const message = {
        type: 'EVENT',
        payload: { seq: 15 },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(15);
      expect(client.getLastSyncedSeq()).toBe(10);
    });

    it('should update both currentSeq and lastSyncedSeq for ACTION_ACCEPTED', () => {
      const client = createClient();
      (client as unknown as { currentSeq: number; lastSyncedSeq: number }).currentSeq = 10;
      (client as unknown as { currentSeq: number; lastSyncedSeq: number }).lastSyncedSeq = 10;

      const message = {
        type: 'ACTION_ACCEPTED',
        payload: { seq: 20 },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(20);
      expect(client.getLastSyncedSeq()).toBe(20);
    });

    it('should update both currentSeq and lastSyncedSeq for STATE_SNAPSHOT', () => {
      const client = createClient();
      (client as unknown as { currentSeq: number; lastSyncedSeq: number }).currentSeq = 10;
      (client as unknown as { currentSeq: number; lastSyncedSeq: number }).lastSyncedSeq = 10;

      const message = {
        type: 'STATE_SNAPSHOT',
        payload: { seq: 25 },
        timestamp: Date.now(),
        sequence: 1,
      };

      client.handleMessage(message);

      expect(client.getCurrentSeq()).toBe(25);
      expect(client.getLastSyncedSeq()).toBe(25);
    });
  });
});
