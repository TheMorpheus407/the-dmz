import { describe, expect, it, vi } from 'vitest';

import { MOCK_NOW } from './mock-date.js';

const WEBSOCKET_GATEWAY_METHODS = [
  'getConnectionCount',
  'getConnection',
  'getAllConnections',
  'registerConnection',
  'removeConnection',
  'isSubscribed',
  'isUnsubscribed',
  'didSendToConnection',
  'sendToUser',
  'broadcastToChannel',
  'broadcastToTenant',
  'getActiveConnections',
  'didUpdateHeartbeat',
  'getNextSequence',
  'createMessage',
  'parseChannel',
  'isValidChannel',
] as const;

describe('createMockWsGateway', () => {
  it('is exported from the testing index', async () => {
    const { createMockWsGateway } = await import('./index.js');
    expect(typeof createMockWsGateway).toBe('function');
  });

  it('returns an object with wsGateway and WebSocketGateway properties', async () => {
    const { createMockWsGateway } = await import('./index.js');
    const mock = createMockWsGateway();

    expect(mock).toHaveProperty('wsGateway');
    expect(mock).toHaveProperty('WebSocketGateway');
  });

  it('wsGateway has all WebSocketGateway public methods', async () => {
    const { createMockWsGateway } = await import('./index.js');
    const { wsGateway } = createMockWsGateway();

    for (const method of WEBSOCKET_GATEWAY_METHODS) {
      expect(wsGateway).toHaveProperty(method);
      expect(typeof wsGateway[method]).toBe('function');
    }
  });

  it('all wsGateway methods are vitest fn mocks', async () => {
    const { createMockWsGateway } = await import('./index.js');
    const { wsGateway } = createMockWsGateway();

    for (const method of WEBSOCKET_GATEWAY_METHODS) {
      expect(vi.isMockFunction(wsGateway[method])).toBe(true);
    }
  });

  describe('default return values', () => {
    it('getConnectionCount returns 0', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.getConnectionCount()).toBe(0);
    });

    it('getConnection returns null', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.getConnection('any-id')).toBe(null);
    });

    it('getAllConnections returns empty iterator', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      const result = wsGateway.getAllConnections();
      expect(result).toBeDefined();
      expect(typeof result[Symbol.iterator]).toBe('function');
    });

    it('isSubscribed returns true', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.isSubscribed('conn-id', 'channel:id')).toBe(true);
    });

    it('isUnsubscribed returns true', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.isUnsubscribed('conn-id', 'channel:id')).toBe(true);
    });

    it('didSendToConnection returns true', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.didSendToConnection('conn-id', { type: 'TEST', payload: {} })).toBe(true);
    });

    it('sendToUser returns 0', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.sendToUser('user-id', { type: 'TEST', payload: {} })).toBe(0);
    });

    it('broadcastToChannel returns 0', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.broadcastToChannel('channel:id', { type: 'TEST', payload: {} })).toBe(0);
    });

    it('broadcastToTenant returns 0', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.broadcastToTenant('tenant-id', { type: 'TEST', payload: {} })).toBe(0);
    });

    it('getActiveConnections returns empty array', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.getActiveConnections('user-id')).toEqual([]);
    });

    it('didUpdateHeartbeat returns true', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.didUpdateHeartbeat('conn-id')).toBe(true);
    });

    it('getNextSequence returns 1', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.getNextSequence()).toBe(1);
    });

    it('createMessage returns a properly shaped WSServerMessage', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      const result = wsGateway.createMessage('TEST', { foo: 'bar' });

      expect(result).toMatchObject({
        type: 'TEST',
        payload: { foo: 'bar' },
        timestamp: expect.any(Number),
        sequence: 1,
      });
    });

    it('parseChannel returns parsed channel object', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.parseChannel('session:abc123')).toEqual({ type: 'session', id: 'abc123' });
    });

    it('isValidChannel returns true for valid channels', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.isValidChannel('session:abc123')).toBe(true);
    });

    it('isValidChannel returns false for invalid channels', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      expect(wsGateway.isValidChannel('invalid')).toBe(false);
    });
  });

  describe('method overriding', () => {
    it('allows overriding getConnectionCount return value', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      wsGateway.getConnectionCount.mockReturnValue(5);

      expect(wsGateway.getConnectionCount()).toBe(5);
    });

    it('allows overriding getConnection return value', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      const mockConnection = {
        connectionId: 'conn-123',
        userId: 'user-456',
        tenantId: 'tenant-789',
        subscriptions: new Set<string>(),
        connectedAt: MOCK_NOW.getTime(),
        lastHeartbeat: MOCK_NOW.getTime(),
      };

      wsGateway.getConnection.mockReturnValue(mockConnection);

      expect(wsGateway.getConnection('conn-123')).toEqual(mockConnection);
    });

    it('allows overriding sendToUser return value', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      wsGateway.sendToUser.mockReturnValue(3);

      expect(wsGateway.sendToUser('user-id', { type: 'TEST', payload: {} })).toBe(3);
    });

    it('allows overriding createMessage return value', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway } = createMockWsGateway();

      const customMessage = {
        type: 'CUSTOM',
        payload: { custom: true },
        timestamp: 1234567890,
        sequence: 99,
      };
      wsGateway.createMessage.mockReturnValue(customMessage);

      expect(wsGateway.createMessage('TEST', {})).toEqual(customMessage);
    });
  });

  describe('WebSocketGateway constructor mock', () => {
    it('WebSocketGateway is a mock function', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { WebSocketGateway } = createMockWsGateway();

      expect(vi.isMockFunction(WebSocketGateway)).toBe(true);
    });

    it('WebSocketGateway mock implementation returns wsGateway', async () => {
      const { createMockWsGateway } = await import('./index.js');
      const { wsGateway, WebSocketGateway } = createMockWsGateway();

      const instance = new WebSocketGateway();

      expect(instance).toBe(wsGateway);
    });
  });

  describe('multiple calls produce independent mocks', () => {
    it('each call creates a new independent mock', async () => {
      const { createMockWsGateway } = await import('./index.js');

      const mock1 = createMockWsGateway();
      const mock2 = createMockWsGateway();

      mock1.wsGateway.getConnectionCount.mockReturnValue(10);

      expect(mock1.wsGateway.getConnectionCount()).toBe(10);
      expect(mock2.wsGateway.getConnectionCount()).toBe(0);
    });
  });
});
