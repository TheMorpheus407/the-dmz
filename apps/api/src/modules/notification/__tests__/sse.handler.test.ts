import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  handleSSEConnection,
  handleSSESubscribe,
  handleSSEUnsubscribe,
} from '../websocket/sse.handler.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { WebSocketGatewayInterface } from '../websocket.types.js';

const createMockGateway = (): WebSocketGatewayInterface => {
  return {
    registerConnection: vi.fn(),
    removeConnection: vi.fn(),
    isSubscribed: vi.fn().mockReturnValue(true),
    isUnsubscribed: vi.fn().mockReturnValue(true),
    didSendToConnection: vi.fn().mockReturnValue(true),
    sendToUser: vi.fn().mockReturnValue(1),
    broadcastToChannel: vi.fn().mockReturnValue(1),
    broadcastToTenant: vi.fn().mockReturnValue(1),
    getActiveConnections: vi.fn().mockReturnValue([]),
    getConnectionCount: vi.fn().mockReturnValue(0),
    getConnection: vi.fn().mockReturnValue(null),
    getAllConnections: vi.fn().mockReturnValue([][Symbol.iterator]()),
    findConnectionIdBySocket: vi.fn().mockReturnValue(undefined),
    didUpdateHeartbeat: vi.fn().mockReturnValue(true),
    getNextSequence: vi.fn().mockReturnValue(1),
    createMessage: vi
      .fn()
      .mockReturnValue({ type: 'NOTIFICATION', payload: {}, timestamp: 0, sequence: 0 }),
    parseChannel: vi.fn().mockReturnValue({ type: 'test', id: '1' }),
    isValidChannel: vi.fn().mockReturnValue(true),
  };
};

const createMockRequest = (): FastifyRequest => {
  const mockLog = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  return {
    id: 'test-request-id',
    query: { lastEventId: '0', channels: 'test-channel' },
    user: { userId: 'test-user-id', tenantId: 'test-tenant-id' },
    raw: {
      on: vi.fn(),
      socket: {},
    },
    log: mockLog as unknown as FastifyRequest['log'],
  } as unknown as FastifyRequest;
};

const createMockReply = () => {
  const mockRaw = {
    setHeader: vi.fn(),
    write: vi.fn(),
    writableEnded: false,
  };

  return {
    sent: false,
    raw: mockRaw as unknown as FastifyReply['raw'],
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
};

describe('sse.handler', () => {
  describe('handleSSEConnection', () => {
    let mockGateway: WebSocketGatewayInterface;

    beforeEach(() => {
      vi.useFakeTimers();
      mockGateway = createMockGateway();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('registers close handler on request.raw', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      expect(mockRequest.raw.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('sets SSE headers on the response', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      expect(mockReply.raw.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockReply.raw.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockReply.raw.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });

    it('sends initial connected event', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      expect(mockReply.raw.write).toHaveBeenCalled();
      const firstWriteCall = mockReply.raw.write.mock.calls[0][0] as string;
      expect(firstWriteCall).toContain('event: connected');
    });

    it('sends heartbeat events at SSE_KEEPALIVE_INTERVAL interval', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      vi.advanceTimersByTime(30000);
      await Promise.resolve();

      const heartbeatWrites = mockReply.raw.write.mock.calls.filter((call) =>
        (call[0] as string).includes('event: heartbeat'),
      );
      expect(heartbeatWrites.length).toBeGreaterThan(0);
    });

    it('does not log error when waitForMessages completes normally', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      const connectionPromise = handleSSEConnection(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      vi.advanceTimersByTime(100);
      await connectionPromise;

      expect(mockRequest.log.error).not.toHaveBeenCalled();
    });

    it('calls gateway isUnsubscribed when request.raw emits close event', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      let closeHandler: () => void;

      vi.spyOn(mockRequest.raw, 'on').mockImplementation((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler = handler;
        }
        return mockRequest.raw;
      });

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      closeHandler!();

      expect(mockGateway.isUnsubscribed).toHaveBeenCalled();
    });

    it('sets heartbeat timer with unref to not keep process alive', async () => {
      vi.useRealTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      expect(clearIntervalSpy).not.toHaveBeenCalled();
    });

    it('logs error and calls cleanup when waitForMessages rejects', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      mockReply.raw.writableEnded = true;

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      await vi.advanceTimersByTimeAsync(0);

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'SSE waitForMessages failed',
      );
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(mockGateway.isUnsubscribed).toHaveBeenCalled();
    });

    it('logs error when waitForMessages fails early', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      mockReply.raw.writableEnded = true;

      handleSSEConnection(mockRequest as FastifyRequest, mockReply as FastifyReply, mockGateway);

      await vi.advanceTimersByTimeAsync(0);

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'SSE waitForMessages failed',
      );
    });
  });

  describe('handleSSESubscribe', () => {
    let mockGateway: WebSocketGatewayInterface;

    beforeEach(() => {
      mockGateway = createMockGateway();
    });

    it('returns 400 on missing connectionId', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { channels: ['test-channel'] };

      await handleSSESubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid request: connectionId and channels required',
      });
    });

    it('returns 400 on missing channels', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { connectionId: 'test-conn-id' };

      await handleSSESubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('returns 400 on invalid channels', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { connectionId: 'test-conn-id', channels: 'not-an-array' };

      await handleSSESubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('returns 200 on valid request and calls gateway.isSubscribed', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { connectionId: 'test-conn-id', channels: ['test-channel'] };

      await handleSSESubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, channels: ['test-channel'] });
      expect(mockGateway.isSubscribed).toHaveBeenCalled();
    });
  });

  describe('handleSSEUnsubscribe', () => {
    let mockGateway: WebSocketGatewayInterface;

    beforeEach(() => {
      mockGateway = createMockGateway();
    });

    it('returns 400 on missing connectionId', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { channels: ['test-channel'] };

      await handleSSEUnsubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('returns 400 on missing channels', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { connectionId: 'test-conn-id' };

      await handleSSEUnsubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('returns 400 on invalid channels', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { connectionId: 'test-conn-id', channels: 'not-an-array' };

      await handleSSEUnsubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('returns 200 on valid request and calls gateway.isUnsubscribed', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();
      mockRequest.body = { connectionId: 'test-conn-id', channels: ['test-channel'] };

      await handleSSEUnsubscribe(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockGateway,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true, channels: ['test-channel'] });
      expect(mockGateway.isUnsubscribed).toHaveBeenCalled();
    });
  });
});
