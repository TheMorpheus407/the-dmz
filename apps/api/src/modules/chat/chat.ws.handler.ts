/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { verifyJWT } from '../auth/index.js';
import { wsGateway, buildChannelName } from '../notification/websocket/index.js';

import { sendMessage, type SendMessageResult } from './chat.service.js';

import type { FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { WebSocketAuthResult, JWTAuthPayload } from '../notification/websocket/index.js';
import type { AppConfig } from '../../config.js';
import type { IEventBus } from '../../shared/events/event-types.js';

interface JWTPayload {
  sub: string;
  tenantId: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

const TYPING_TIMEOUT_MS = 3000;
const typingTimers = new Map<string, NodeJS.Timeout>();

export async function chatWebSocketHandler(
  connection: WebSocket,
  request: FastifyRequest,
  config: AppConfig,
  eventBus?: IEventBus,
): Promise<void> {
  const authResult = await authenticateWebSocket(request, config);

  if (!authResult.valid || !authResult.payload) {
    const errorMsg = wsGateway.createMessage('ERROR', {
      message: authResult.error ?? 'Authentication failed',
    });
    connection.send(JSON.stringify(errorMsg));
    connection.close(4001, 'Authentication failed');
    return;
  }

  const connectionInfo = wsGateway.registerConnection(connection, authResult.payload);
  const { userId } = authResult.payload;

  const welcomeMsg = wsGateway.createMessage('NOTIFICATION', {
    message: 'Connected to chat',
    connectionId: connectionInfo.connectionId,
    userId,
  });

  connection.send(JSON.stringify(welcomeMsg));

  connection.on('message', (data: Buffer | string) => {
    void handleChatMessage(
      data,
      connection,
      config,
      authResult.payload!.tenantId,
      userId,
      eventBus,
    );
  });

  connection.on('close', () => {
    wsGateway.removeConnection(connectionInfo.connectionId);
    clearTypingTimer(connectionInfo.connectionId);
  });

  connection.on('error', () => {
    wsGateway.removeConnection(connectionInfo.connectionId);
    clearTypingTimer(connectionInfo.connectionId);
  });
}

async function authenticateWebSocket(
  request: FastifyRequest,
  config: AppConfig,
): Promise<WebSocketAuthResult> {
  const query = request.query as Record<string, string>;
  const token = query['token'];

  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    const result = await verifyJWT(config, token);
    if (!result) {
      return { valid: false, error: 'Invalid token' };
    }

    const jwtPayload = result.payload as unknown as JWTPayload;

    const payload: JWTAuthPayload = {
      userId: jwtPayload.sub,
      tenantId: jwtPayload.tenantId,
    };

    if (jwtPayload.sessionId) {
      payload.sessionId = jwtPayload.sessionId;
    }
    if (jwtPayload.iat !== undefined) {
      payload.iat = jwtPayload.iat;
    }
    if (jwtPayload.exp !== undefined) {
      payload.exp = jwtPayload.exp;
    }

    return {
      valid: true,
      payload,
    };
  } catch {
    return { valid: false, error: 'Token verification failed' };
  }
}

async function handleChatMessage(
  data: Buffer | string,
  connection: WebSocket,
  config: AppConfig,
  tenantId: string,
  userId: string,
  eventBus?: IEventBus,
): Promise<void> {
  let message: Record<string, unknown>;

  try {
    const parsed = typeof data === 'string' ? data : data.toString();
    message = JSON.parse(parsed) as Record<string, unknown>;
  } catch {
    const errorMsg = wsGateway.createMessage('ERROR', {
      message: 'Invalid message format',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const messageType = message['type'] as string;

  switch (messageType) {
    case 'SUBSCRIBE': {
      handleSubscribe(message, connection);
      break;
    }
    case 'UNSUBSCRIBE': {
      handleUnsubscribe(message, connection);
      break;
    }
    case 'CHAT_TYPING': {
      handleTyping(message, connection, userId);
      break;
    }
    case 'CHAT_SEND': {
      await handleSend(message, connection, config, tenantId, userId, eventBus);
      break;
    }
    default: {
      const errorMsg = wsGateway.createMessage('ERROR', {
        message: `Unknown message type: ${messageType}`,
      });
      connection.send(JSON.stringify(errorMsg));
    }
  }
}

function handleSubscribe(message: Record<string, unknown>, connection: WebSocket): void {
  const channel = message['channel'] as string | undefined;

  if (!channel) {
    const errorMsg = wsGateway.createMessage('ERROR', {
      message: 'Channel is required for subscribe',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  if (!wsGateway.isValidChannel(channel)) {
    const errorMsg = wsGateway.createMessage('ERROR', {
      message: 'Invalid channel',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const connId = getConnectionIdFromSocket(connection);
  if (connId) {
    wsGateway.subscribe(connId, channel);
  }

  const ackMsg = wsGateway.createMessage('ACK', {
    subscribed: channel,
  });
  connection.send(JSON.stringify(ackMsg));
}

function handleUnsubscribe(message: Record<string, unknown>, connection: WebSocket): void {
  const channel = message['channel'] as string | undefined;

  if (!channel) {
    const errorMsg = wsGateway.createMessage('ERROR', {
      message: 'Channel is required for unsubscribe',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const connId = getConnectionIdFromSocket(connection);
  if (connId) {
    wsGateway.unsubscribe(connId, channel);
  }

  const ackMsg = wsGateway.createMessage('ACK', {
    unsubscribed: channel,
  });
  connection.send(JSON.stringify(ackMsg));
}

function handleTyping(
  message: Record<string, unknown>,
  connection: WebSocket,
  userId: string,
): void {
  const channelId = message['channelId'] as string | undefined;

  if (!channelId) {
    return;
  }

  const connId = getConnectionIdFromSocket(connection);
  if (!connId) {
    return;
  }

  const channel = buildChannelName('chat', channelId);
  const typingMsg = wsGateway.createMessage('CHAT_TYPING', {
    channelId,
    playerId: userId,
    isTyping: true,
  });

  wsGateway.broadcastToChannel(channel, typingMsg);

  clearTypingTimer(`${connId}:${channelId}`);

  const timer = setTimeout(() => {
    const stopTypingMsg = wsGateway.createMessage('CHAT_TYPING', {
      channelId,
      playerId: userId,
      isTyping: false,
    });
    wsGateway.broadcastToChannel(channel, stopTypingMsg);
    typingTimers.delete(`${connId}:${channelId}`);
  }, TYPING_TIMEOUT_MS);

  typingTimers.set(`${connId}:${channelId}`, timer);
}

async function handleSend(
  message: Record<string, unknown>,
  connection: WebSocket,
  config: AppConfig,
  tenantId: string,
  userId: string,
  eventBus?: IEventBus,
): Promise<void> {
  const channelId = message['channelId'] as string | undefined;
  const content = message['content'] as string | undefined;

  if (!channelId || !content) {
    const errorMsg = wsGateway.createMessage('ERROR', {
      message: 'channelId and content are required',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const result: SendMessageResult = await sendMessage(
    config,
    tenantId,
    userId,
    {
      channelId,
      content,
    },
    undefined,
    eventBus,
  );

  if (!result.success) {
    if (result.rateLimited) {
      const rateLimitMsg = wsGateway.createMessage('CHAT_MODERATION_ACTION', {
        channelId,
        action: 'rate_limited',
        retryAfterMs: result.retryAfterMs,
      });
      connection.send(JSON.stringify(rateLimitMsg));
      return;
    }

    if (result.moderationStatus === 'rejected') {
      const modMsg = wsGateway.createMessage('CHAT_MODERATION_ACTION', {
        channelId,
        action: 'rejected',
        message: result.error,
      });
      connection.send(JSON.stringify(modMsg));
      return;
    }

    const errorMsg = wsGateway.createMessage('ERROR', {
      message: result.error ?? 'Failed to send message',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  if (result.moderationStatus === 'flagged') {
    const modMsg = wsGateway.createMessage('CHAT_MODERATION_ACTION', {
      channelId,
      action: 'flagged',
      messageId: result.message?.messageId,
    });
    connection.send(JSON.stringify(modMsg));
  }
}

function getConnectionIdFromSocket(connection: WebSocket): string | undefined {
  for (const [connId, connectionItem] of wsGateway.getAllConnections()) {
    if (connectionItem.socket === connection) {
      return connId;
    }
  }
  return undefined;
}

function clearTypingTimer(key: string): void {
  const timer = typingTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    typingTimers.delete(key);
  }
}
