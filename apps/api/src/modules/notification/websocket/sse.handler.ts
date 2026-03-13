// eslint-disable-next-line import-x/no-restricted-paths
import { verifyJWT } from '../../auth/jwt-keys.service.js';
import { generateId } from '../../../shared/utils/id.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { WebSocketAuthResult, WSServerMessage } from './websocket.types.js';
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
  const authResult = await authenticateSSE(request);

  if (!authResult.valid || !authResult.payload) {
    reply.code(401).send({ error: authResult.error ?? 'Authentication failed' });
    return;
  }

  const connectionId = generateId();
  const userId = authResult.payload.userId;
  const tenantId = authResult.payload.tenantId;

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
  const authResult = await authenticateSSE(request);

  if (!authResult.valid || !authResult.payload) {
    reply.code(401).send({ error: authResult.error ?? 'Authentication failed' });
    return;
  }

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
  const authResult = await authenticateSSE(request);

  if (!authResult.valid || !authResult.payload) {
    reply.code(401).send({ error: authResult.error ?? 'Authentication failed' });
    return;
  }

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

async function authenticateSSE(request: FastifyRequest): Promise<WebSocketAuthResult> {
  const query = request.query as Record<string, string>;
  const authHeader = request.headers.authorization;
  const token = query['token'] ?? authHeader?.replace('Bearer ', '');

  if (!token) {
    return { valid: false, error: 'No authentication token provided' };
  }

  try {
    const config = request.server.config;
    const { payload } = await verifyJWT(config, token);

    const userId = payload['sub'] as string;
    const tenantId = payload['tenantId'] as string;

    if (!userId || !tenantId) {
      return { valid: false, error: 'Invalid token payload' };
    }

    const sessionId = payload['sessionId'] as string | undefined;

    return {
      valid: true,
      payload: {
        userId,
        tenantId,
        ...(sessionId !== undefined && { sessionId }),
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
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
