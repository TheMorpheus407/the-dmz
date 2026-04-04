import { describe, expect, it, vi } from 'vitest';

import { handleCoopWebSocketConnection } from '../websocket.handler.js';

import type { WSConnection } from 'ws';
import type { AppConfig } from '../../../../config.js';
import type { IEventBus } from '../../../../shared/events/event-types.js';

describe('coop/sync/websocket.handler', () => {
  describe('gateway parameter handling', () => {
    it('closes connection with 4001 when gateway is not provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockConfig = { JWT_SECRET: 'test-secret' } as AppConfig;
      const mockEventBus = { publish: vi.fn() } as unknown as IEventBus;

      await handleCoopWebSocketConnection(mockConnection, {} as any, {
        config: mockConfig,
        eventBus: mockEventBus,
      });

      expect(mockConnection.close).toHaveBeenCalledWith(4001, 'Gateway not available');
    });

    it('continues when gateway is provided', async () => {
      const mockConnection = {
        close: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
      } as unknown as WSConnection;

      const mockGateway = {
        broadcastToChannel: vi.fn(),
      };

      const mockConfig = { JWT_SECRET: 'test-secret' } as AppConfig;
      const mockEventBus = { publish: vi.fn() } as unknown as IEventBus;

      await handleCoopWebSocketConnection(mockConnection, {} as any, {
        gateway: mockGateway as any,
        config: mockConfig,
        eventBus: mockEventBus,
      });

      expect(mockConnection.close).not.toHaveBeenCalledWith(4001, 'Gateway not available');
      expect(mockConnection.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });
});
