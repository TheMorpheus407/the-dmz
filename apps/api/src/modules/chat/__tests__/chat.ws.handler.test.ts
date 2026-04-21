import { describe, expect, it, vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  WebSocketGatewayInterface,
  WSConnection,
} from '../../notification/websocket/index.js';

describe('chat.ws.handler', () => {
  describe('gateway parameter handling', () => {
    it('closes connection with 4001 when gateway is not provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const { chatWebSocketHandler } = await import('../chat.ws.handler.js');
      const mockRequest = {
        query: { token: 'valid-token' },
      } as any;
      const mockConfig = { JWT_SECRET: 'test-secret' } as any;

      await chatWebSocketHandler(mockConnection, mockRequest, mockConfig, undefined, undefined);

      expect(mockConnection.close).toHaveBeenCalledWith(4001, 'Gateway not available');
    });

    it('does not close connection when gateway is provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockGateway = {
        registerConnection: vi.fn().mockReturnValue({ connectionId: 'conn-1' }),
        removeConnection: vi.fn(),
        createMessage: vi.fn().mockReturnValue({ type: 'NOTIFICATION', payload: {} }),
      } as unknown as WebSocketGatewayInterface;

      const mockRequest = {
        query: { token: 'invalid-token' },
      } as any;
      const mockConfig = { JWT_SECRET: 'test-secret' } as any;

      const { chatWebSocketHandler } = await import('../chat.ws.handler.js');

      await chatWebSocketHandler(mockConnection, mockRequest, mockConfig, undefined, mockGateway);

      expect(mockConnection.close).not.toHaveBeenCalledWith(4001, 'Gateway not available');
    });
  });

  describe('authentication flow', () => {
    it('returns error when no token is provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockGateway = {
        registerConnection: vi.fn().mockReturnValue({ connectionId: 'conn-1' }),
        removeConnection: vi.fn(),
        createMessage: vi.fn().mockReturnValue({ type: 'NOTIFICATION', payload: {} }),
      } as unknown as WebSocketGatewayInterface;

      const { chatWebSocketHandler } = await import('../chat.ws.handler.js');
      const mockRequest = {
        query: {},
      } as any;
      const mockConfig = { JWT_SECRET: 'test-secret' } as any;

      await chatWebSocketHandler(mockConnection, mockRequest, mockConfig, undefined, mockGateway);

      expect(mockConnection.send).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalledWith(4001, 'Authentication failed');
    });

    it('returns error when token is invalid', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockGateway = {
        registerConnection: vi.fn().mockReturnValue({ connectionId: 'conn-1' }),
        removeConnection: vi.fn(),
        createMessage: vi.fn().mockReturnValue({ type: 'NOTIFICATION', payload: {} }),
      } as unknown as WebSocketGatewayInterface;

      const { chatWebSocketHandler } = await import('../chat.ws.handler.js');
      const mockRequest = {
        query: { token: 'invalid-token' },
      } as any;
      const mockConfig = { JWT_SECRET: 'test-secret' } as any;

      await chatWebSocketHandler(mockConnection, mockRequest, mockConfig, undefined, mockGateway);

      expect(mockConnection.send).toHaveBeenCalled();
    });
  });
});
