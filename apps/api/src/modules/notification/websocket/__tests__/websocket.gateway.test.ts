import { describe, it, expect, beforeEach, vi } from 'vitest';

import { WebSocketGateway } from '../websocket.gateway.js';

import type { JWTAuthPayload } from '../websocket.types.js';

describe('WebSocketGateway', () => {
  let gateway: WebSocketGateway;

  beforeEach(() => {
    gateway = new WebSocketGateway();
  });

  describe('registerConnection', () => {
    it('should register a new WebSocket connection', () => {
      const mockSocket = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const authPayload: JWTAuthPayload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
      };

      const connectionInfo = gateway.registerConnection(mockSocket, authPayload);

      expect(connectionInfo.userId).toBe('user-123');
      expect(connectionInfo.tenantId).toBe('tenant-456');
      expect(connectionInfo.connectionId).toBeDefined();
      expect(connectionInfo.subscriptions).toEqual(new Set());
    });

    it('should track connection count', () => {
      const mockSocket1 = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const mockSocket2 = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      gateway.registerConnection(mockSocket1, { userId: 'user-1', tenantId: 'tenant-1' });
      gateway.registerConnection(mockSocket2, { userId: 'user-2', tenantId: 'tenant-2' });

      expect(gateway.getConnectionCount()).toBe(2);
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection and clean up subscriptions', () => {
      const mockSocket = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const authPayload: JWTAuthPayload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
      };

      const connectionInfo = gateway.registerConnection(mockSocket, authPayload);
      gateway.isSubscribed(connectionInfo.connectionId, 'session:abc');
      gateway.isSubscribed(connectionInfo.connectionId, 'notifications:user-123');

      gateway.removeConnection(connectionInfo.connectionId);

      expect(gateway.getConnectionCount()).toBe(0);
      expect(gateway.getActiveConnections('user-123')).toEqual([]);
    });
  });

  describe('isSubscribed', () => {
    it('should return true when successfully subscribing to a channel', () => {
      const mockSocket = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const connectionInfo = gateway.registerConnection(mockSocket, {
        userId: 'user-123',
        tenantId: 'tenant-456',
      });

      const result = gateway.isSubscribed(connectionInfo.connectionId, 'session:abc');

      expect(result).toBe(true);
      expect(connectionInfo.subscriptions.has('session:abc')).toBe(true);
    });

    it('should return false when connection does not exist', () => {
      const result = gateway.isSubscribed('non-existent-connection', 'session:abc');
      expect(result).toBe(false);
    });
  });

  describe('isUnsubscribed', () => {
    it('should return true when successfully unsubscribing from a channel', () => {
      const mockSocket = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const connectionInfo = gateway.registerConnection(mockSocket, {
        userId: 'user-123',
        tenantId: 'tenant-456',
      });

      gateway.isSubscribed(connectionInfo.connectionId, 'session:abc');
      const result = gateway.isUnsubscribed(connectionInfo.connectionId, 'session:abc');

      expect(result).toBe(true);
      expect(connectionInfo.subscriptions.has('session:abc')).toBe(false);
    });

    it('should return false when connection does not exist', () => {
      const result = gateway.isUnsubscribed('non-existent-connection', 'session:abc');
      expect(result).toBe(false);
    });
  });

  describe('didSendToConnection', () => {
    it('should return true and send message to open connection', () => {
      const mockSocket = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const connectionInfo = gateway.registerConnection(mockSocket, {
        userId: 'user-123',
        tenantId: 'tenant-456',
      });

      const message = gateway.createMessage('NOTIFICATION', { message: 'test' });
      const result = gateway.didSendToConnection(connectionInfo.connectionId, message);

      expect(result).toBe(true);
      expect(mockSocket.send).toHaveBeenCalled();
    });

    it('should return false when connection does not exist', () => {
      const message = gateway.createMessage('NOTIFICATION', { message: 'test' });
      const result = gateway.didSendToConnection('non-existent-connection', message);
      expect(result).toBe(false);
    });

    it('should return false when socket is not open', () => {
      const mockSocket = {
        readyState: 3,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const connectionInfo = gateway.registerConnection(mockSocket, {
        userId: 'user-123',
        tenantId: 'tenant-456',
      });

      const message = gateway.createMessage('NOTIFICATION', { message: 'test' });
      const result = gateway.didSendToConnection(connectionInfo.connectionId, message);
      expect(result).toBe(false);
    });
  });

  describe('sendToUser', () => {
    it('should send message to user connections', () => {
      const mockSocket1 = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const mockSocket2 = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      gateway.registerConnection(mockSocket1, { userId: 'user-123', tenantId: 'tenant-456' });
      gateway.registerConnection(mockSocket2, { userId: 'user-123', tenantId: 'tenant-456' });

      const message = gateway.createMessage('NOTIFICATION', { message: 'test' });
      const sentCount = gateway.sendToUser('user-123', message);

      expect(sentCount).toBe(2);
      expect(mockSocket1.send).toHaveBeenCalled();
      expect(mockSocket2.send).toHaveBeenCalled();
    });

    it('should return 0 for unknown users', () => {
      const message = gateway.createMessage('NOTIFICATION', { message: 'test' });
      const sentCount = gateway.sendToUser('unknown-user', message);

      expect(sentCount).toBe(0);
    });
  });

  describe('broadcastToChannel', () => {
    it('should broadcast to channel subscribers', () => {
      const mockSocket1 = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const mockSocket2 = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const conn1 = gateway.registerConnection(mockSocket1, {
        userId: 'user-1',
        tenantId: 'tenant-1',
      });
      const conn2 = gateway.registerConnection(mockSocket2, {
        userId: 'user-2',
        tenantId: 'tenant-1',
      });

      gateway.isSubscribed(conn1.connectionId, 'session:abc');
      gateway.isSubscribed(conn2.connectionId, 'session:abc');

      const message = gateway.createMessage('GAME_STATE', { state: 'playing' });
      const sentCount = gateway.broadcastToChannel('session:abc', message);

      expect(sentCount).toBe(2);
    });
  });

  describe('parseChannel', () => {
    it('should parse valid channel names', () => {
      expect(gateway.parseChannel('session:abc')).toEqual({ type: 'session', id: 'abc' });
      expect(gateway.parseChannel('notifications:user-123')).toEqual({
        type: 'notifications',
        id: 'user-123',
      });
      expect(gateway.parseChannel('threats:game-456')).toEqual({ type: 'threats', id: 'game-456' });
    });

    it('should return null for invalid channel names', () => {
      expect(gateway.parseChannel('invalid')).toBeNull();
      expect(gateway.parseChannel('session:')).toBeNull();
      expect(gateway.parseChannel(':id')).toBeNull();
    });
  });

  describe('isValidChannel', () => {
    it('should validate correct channel types', () => {
      expect(gateway.isValidChannel('session:abc')).toBe(true);
      expect(gateway.isValidChannel('notifications:user-123')).toBe(true);
      expect(gateway.isValidChannel('threats:game-456')).toBe(true);
      expect(gateway.isValidChannel('global')).toBe(true);
    });

    it('should reject invalid channel types', () => {
      expect(gateway.isValidChannel('invalid:abc')).toBe(false);
      expect(gateway.isValidChannel('session:')).toBe(false);
    });
  });

  describe('sequence numbering', () => {
    it('should generate unique sequence numbers', () => {
      const msg1 = gateway.createMessage('NOTIFICATION', { data: 1 });
      const msg2 = gateway.createMessage('NOTIFICATION', { data: 2 });
      const msg3 = gateway.createMessage('NOTIFICATION', { data: 3 });

      expect(msg1.sequence).toBe(1);
      expect(msg2.sequence).toBe(2);
      expect(msg3.sequence).toBe(3);
    });
  });

  describe('heartbeat', () => {
    it('should update heartbeat timestamp', () => {
      const mockSocket = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      const connectionInfo = gateway.registerConnection(mockSocket, {
        userId: 'user-123',
        tenantId: 'tenant-456',
      });

      const initialHeartbeat = connectionInfo.lastHeartbeat;
      gateway.didUpdateHeartbeat(connectionInfo.connectionId);

      const updatedConnection = gateway.getConnection(connectionInfo.connectionId);
      expect(updatedConnection?.lastHeartbeat).toBeGreaterThanOrEqual(initialHeartbeat);
    });

    it('should return false for unknown connections', () => {
      const result = gateway.didUpdateHeartbeat('unknown-connection');
      expect(result).toBe(false);
    });
  });
});
