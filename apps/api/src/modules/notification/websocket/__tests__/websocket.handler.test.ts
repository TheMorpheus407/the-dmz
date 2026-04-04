import { describe, expect, it, vi } from 'vitest';

import { handleWebSocketConnection } from '../websocket.handler.js';

import type { WSConnection } from 'ws';

describe('websocket.handler', () => {
  describe('gateway parameter handling', () => {
    it('closes connection with 4001 when gateway is not provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockRequest = {
        query: { token: 'valid-token' },
        headers: {},
        server: {
          config: { JWT_SECRET: 'test-secret' },
        },
      } as any;

      await handleWebSocketConnection(mockConnection, mockRequest, {});

      expect(mockConnection.close).toHaveBeenCalledWith(4001, 'Gateway not available');
    });

    it('continues when gateway is provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn().mockImplementation((data: string) => {
          const msg = JSON.parse(data);
          if (msg.type === 'NOTIFICATION') {
            return;
          }
        }),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockGateway = {
        registerConnection: vi
          .fn()
          .mockReturnValue({ connectionId: 'conn-1', userId: 'user-1', tenantId: 'tenant-1' }),
        removeConnection: vi.fn(),
        createMessage: vi.fn().mockReturnValue({ type: 'NOTIFICATION', payload: {} }),
      };

      const mockRequest = {
        query: { token: 'invalid-token' },
        headers: {},
        server: {
          config: { JWT_SECRET: 'test-secret' },
        },
      } as any;

      await handleWebSocketConnection(mockConnection, mockRequest, { gateway: mockGateway as any });

      expect(mockConnection.close).not.toHaveBeenCalledWith(4001, 'Gateway not available');
    });
  });

  describe('authentication', () => {
    it('returns error when no token is provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockGateway = {
        registerConnection: vi.fn(),
        createMessage: vi.fn().mockReturnValue({ type: 'ERROR', payload: { message: 'No token' } }),
      };

      const mockRequest = {
        query: {},
        headers: {},
        server: {
          config: { JWT_SECRET: 'test-secret' },
        },
      } as any;

      await handleWebSocketConnection(mockConnection, mockRequest, { gateway: mockGateway as any });

      expect(mockConnection.send).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalledWith(4001, 'Authentication failed');
    });
  });
});
