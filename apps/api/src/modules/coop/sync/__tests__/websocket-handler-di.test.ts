import { describe, expect, it, vi } from 'vitest';

import { handleCoopWebSocketConnection, buildCoopChannelName } from '../websocket.handler.js';

import type { WSConnection } from 'ws';
import type { AppConfig } from '../../../../config.js';
import type { IEventBus } from '../../../../shared/events/event-types.js';
import type { WSServerMessage } from '../../../notification/websocket/index.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('../sync.service.js', async () => {
  const actual = await vi.importActual('../sync.service.js');
  return {
    ...(actual as object),
    validateAndApplyAction: vi.fn().mockResolvedValue({
      accepted: true,
      newSeq: 1,
      events: [{ type: 'PLAYER_MOVE', data: { direction: 'north' } }],
    }),
  };
});

describe('coop/sync/websocket.handler DI Compliance', () => {
  const createMockConnection = (): WSConnection => {
    return {
      close: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
    } as unknown as WSConnection;
  };

  const createMockConfig = (): AppConfig => {
    return { JWT_SECRET: 'test-secret' } as AppConfig;
  };

  const createMockEventBus = (): IEventBus => {
    return { publish: vi.fn() } as unknown as IEventBus;
  };

  describe('WebSocketGatewayInterface compliance', () => {
    it('should accept gateway object with broadcastToChannel method', async () => {
      const mockConnection = createMockConnection();
      const mockConfig = createMockConfig();
      const mockEventBus = createMockEventBus();

      const mockGateway = {
        broadcastToChannel: vi.fn<[string, WSServerMessage], number>().mockReturnValue(1),
      };

      await handleCoopWebSocketConnection(mockConnection, {} as any, {
        gateway: mockGateway as any,
        config: mockConfig,
        eventBus: mockEventBus,
      });

      expect(mockConnection.close).not.toHaveBeenCalledWith(4001, 'Gateway not available');
      expect(mockConnection.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should accept gateway with minimal interface implementation', async () => {
      const mockConnection = createMockConnection();
      const mockConfig = createMockConfig();
      const mockEventBus = createMockEventBus();

      const minimalGateway = {
        broadcastToChannel: vi.fn().mockReturnValue(0),
      };

      await handleCoopWebSocketConnection(mockConnection, {} as any, {
        gateway: minimalGateway,
        config: mockConfig,
        eventBus: mockEventBus,
      });

      expect(mockConnection.close).not.toHaveBeenCalledWith(4001, 'Gateway not available');
    });

    it('should call broadcastToChannel when ACTION_SUBMIT is received', async () => {
      const mockConnection = createMockConnection();
      const mockConfig = createMockConfig();
      const mockEventBus = createMockEventBus();

      const mockGateway = {
        broadcastToChannel: vi.fn<[string, WSServerMessage], number>().mockReturnValue(1),
      };

      await handleCoopWebSocketConnection(mockConnection, {} as any, {
        gateway: mockGateway as any,
        config: mockConfig,
        eventBus: mockEventBus,
      });

      const messageHandler = mockConnection.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'message',
      )?.[1] as (data: Buffer | string) => void;

      const actionSubmitMessage = {
        type: 'ACTION_SUBMIT',
        seq: 1,
        requestId: 'req-123',
        action: 'PLAYER_MOVE',
        payload: {
          sessionId: 'session-abc',
          tenantId: 'tenant-1',
          playerId: 'player-1',
          actionPayload: { direction: 'north' },
        },
      };

      mockConnection.send.mockClear();
      vi.mocked(mockGateway.broadcastToChannel).mockClear();

      messageHandler(JSON.stringify(actionSubmitMessage));

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGateway.broadcastToChannel).toHaveBeenCalledWith(
        'session.events:session-abc',
        expect.objectContaining({
          type: 'EVENT',
          payload: expect.objectContaining({
            seq: expect.any(Number),
            event: expect.any(Object),
          }),
        }),
      );
    });

    it('should work with gateway that has additional methods beyond interface', async () => {
      const mockConnection = createMockConnection();
      const mockConfig = createMockConfig();
      const mockEventBus = createMockEventBus();

      const extendedGateway = {
        broadcastToChannel: vi.fn<[string, WSServerMessage], number>().mockReturnValue(1),
        sendToUser: vi.fn(),
        registerConnection: vi.fn(),
        removeConnection: vi.fn(),
        createMessage: vi.fn(),
        isSubscribed: vi.fn(),
        isUnsubscribed: vi.fn(),
      };

      await handleCoopWebSocketConnection(mockConnection, {} as any, {
        gateway: extendedGateway as any,
        config: mockConfig,
        eventBus: mockEventBus,
      });

      expect(mockConnection.close).not.toHaveBeenCalled();
    });
  });

  describe('CoopWebSocketHandlerOptions interface', () => {
    it('should accept gateway typed as WebSocketGatewayInterface', async () => {
      const mockConnection = createMockConnection();
      const mockConfig = createMockConfig();
      const mockEventBus = createMockEventBus();

      const mockGateway = {
        broadcastToChannel: vi.fn<[string, WSServerMessage], number>().mockReturnValue(1),
      };

      const options = {
        gateway: mockGateway,
        config: mockConfig,
        eventBus: mockEventBus,
      };

      await handleCoopWebSocketConnection(mockConnection, {} as any, options);

      expect(mockConnection.close).not.toHaveBeenCalledWith(4001, 'Gateway not available');
    });

    it('should allow gateway to be undefined (optional)', async () => {
      const mockConnection = createMockConnection();
      const mockConfig = createMockConfig();
      const mockEventBus = createMockEventBus();

      await handleCoopWebSocketConnection(mockConnection, {} as any, {
        gateway: undefined,
        config: mockConfig,
        eventBus: mockEventBus,
      });

      expect(mockConnection.close).toHaveBeenCalledWith(4001, 'Gateway not available');
    });
  });

  describe('buildCoopChannelName', () => {
    it('should create correct channel name format', () => {
      expect(buildCoopChannelName('session-123', 'events')).toBe('session.events:session-123');
      expect(buildCoopChannelName('abc-def', 'state')).toBe('session.state:abc-def');
    });
  });
});
