import { generateId } from '../../../shared/utils/id.js';
import { SSE_SECURITY_HEADERS } from '../../../shared/middleware/security-headers-config.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { WSServerMessage } from './websocket.types.js';
import type { WebSocketGateway } from './websocket.gateway.js';

interface SSEResponse {
  connectionId: string;
  userId: string;
  tenantId: string;
  subscriptions: Set<string>;
  sequence: number;
}

const SSE_KEEPALIVE_INTERVAL = 30_000;

export async function handleSSEConnection(
  request: FastifyRequest,
  reply: FastifyReply,
  gateway: WebSocketGateway,
): Promise<void> {
  const userId = request.user!.userId;
  const tenantId = request.user!.tenantId;

  const connectionId = generateId();

  const sseResponse: SSEResponse = {
    connectionId,
    userId,
    tenantId,
    subscriptions: new Set(),
    sequence: 0,
  };

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...SSE_SECURITY_HEADERS,
  };

  for (const [key, value] of Object.entries(headers)) {
    reply.raw.setHeader(key, value);
  }

  const query = request.query as Record<string, string>;
  const lastEventId = parseInt(query['lastEventId'] ?? '0', 10);
  sseResponse.sequence = lastEventId;

  const initialEvent = createSSEEvent(
    'connected',
    {
      connectionId,
      userId,
      message: 'SSE connection established',
    },
    sseResponse.sequence,
  );
  sendSSE(reply, initialEvent);

  const clientSubscriptions = query['channels']?.split(',') ?? [];
  for (const channel of clientSubscriptions) {
    if (gateway.isValidChannel(channel)) {
      sseResponse.subscriptions.add(channel);
    }
  }

  const heartbeatTimer = setInterval(() => {
    const heartbeatEvent = createSSEEvent(
      'heartbeat',
      { timestamp: Date.now() },
      sseResponse.sequence,
    );
    sendSSE(reply, heartbeatEvent);
  }, SSE_KEEPALIVE_INTERVAL);

  heartbeatTimer.unref();

  const channelsKey = `sse:${connectionId}`;
  const cleanup = (): void => {
    clearInterval(heartbeatTimer);
    gateway.unsubscribe(channelsKey, connectionId);
  };

  request.raw.on('close', cleanup);

  const waitForMessages = async (): Promise<void> => {
    while (!reply.sent || reply.raw.writableEnded === false) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (reply.raw.writableEnded) {
        break;
      }
    }
  };

  waitForMessages().catch(() => {
    cleanup();
  });
}

export async function handleSSESubscribe(
  request: FastifyRequest,
  reply: FastifyReply,
  gateway: WebSocketGateway,
): Promise<void> {
  const body = request.body as { connectionId?: string; channels?: string[] };
  const { connectionId, channels } = body;

  if (!connectionId || !channels || !Array.isArray(channels)) {
    reply.code(400).send({ error: 'Invalid request: connectionId and channels required' });
    return;
  }

  const channelsKey = `sse:${connectionId}`;

  for (const channel of channels) {
    if (gateway.isValidChannel(channel)) {
      gateway.subscribe(channelsKey, channel);
    }
  }

  reply.code(200).send({
    success: true,
    channels,
  });
}

export async function handleSSEUnsubscribe(
  request: FastifyRequest,
  reply: FastifyReply,
  gateway: WebSocketGateway,
): Promise<void> {
  const body = request.body as { connectionId?: string; channels?: string[] };
  const { connectionId, channels } = body;

  if (!connectionId || !channels || !Array.isArray(channels)) {
    reply.code(400).send({ error: 'Invalid request: connectionId and channels required' });
    return;
  }

  const channelsKey = `sse:${connectionId}`;

  for (const channel of channels) {
    gateway.unsubscribe(channelsKey, channel);
  }

  reply.code(200).send({
    success: true,
    channels,
  });
}

function createSSEEvent(
  eventType: string,
  data: Record<string, unknown>,
  sequence: number,
): string {
  const envelope: WSServerMessage = {
    type: eventType as WSServerMessage['type'],
    payload: data,
    timestamp: Date.now(),
    sequence,
  };

  return `id: ${sequence + 1}\nevent: ${eventType}\ndata: ${JSON.stringify(envelope)}\n\n`;
}

function sendSSE(reply: FastifyReply, event: string): void {
  if (!reply.sent) {
    reply.code(200);
  }
  reply.raw.write(event);
}

export function sendToSSEClient(
  reply: FastifyReply,
  eventType: string,
  data: Record<string, unknown>,
  sequence: number,
): void {
  const event = createSSEEvent(eventType, data, sequence);
  sendSSE(reply, event);
}
