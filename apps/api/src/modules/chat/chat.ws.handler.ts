// eslint-disable-next-line import-x/no-restricted-paths
import { verifyJWT } from '../auth/index.js';
/* eslint-disable import-x/no-restricted-paths */
import {
  buildChannelName,
  type WebSocketGateway,
  type WebSocketAuthResult,
  type JWTAuthPayload,
  type WSConnection,
} from '../notification/websocket/index.js';
/* eslint-enable import-x/no-restricted-paths */

import { sendMessage, type SendMessageResult } from './chat.service.js';

import type { FastifyRequest } from 'fastify';
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
  connection: WSConnection,
  request: FastifyRequest,
  config: AppConfig,
  eventBus?: IEventBus,
  gateway?: WebSocketGateway,
): Promise<void> {
  if (!gateway) {
    connection.close(4001, 'Gateway not available');
    return;
  }

  const authResult = await authenticateWebSocket(request, config);

  if (!authResult.valid || !authResult.payload) {
    const errorMsg = gateway.createMessage('ERROR', {
      message: authResult.error ?? 'Authentication failed',
    });
    connection.send(JSON.stringify(errorMsg));
    connection.close(4001, 'Authentication failed');
    return;
  }

  const connectionInfo = gateway.registerConnection(connection, authResult.payload);
  const { userId } = authResult.payload;

  const welcomeMsg = gateway.createMessage('NOTIFICATION', {
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
      gateway,
    );
  });

  connection.on('close', () => {
    gateway.removeConnection(connectionInfo.connectionId);
    clearTypingTimer(connectionInfo.connectionId);
  });

  connection.on('error', () => {
    gateway.removeConnection(connectionInfo.connectionId);
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
  connection: WSConnection,
  config: AppConfig,
  tenantId: string,
  userId: string,
  eventBus: IEventBus | undefined,
  gateway: WebSocketGateway,
): Promise<void> {
  let message: Record<string, unknown>;

  try {
    const parsed = typeof data === 'string' ? data : data.toString();
    message = JSON.parse(parsed) as Record<string, unknown>;
  } catch {
    const errorMsg = gateway.createMessage('ERROR', {
      message: 'Invalid message format',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const messageType = message['type'] as string;

  switch (messageType) {
    case 'SUBSCRIBE': {
      handleSubscribe(message, connection, gateway);
      break;
    }
    case 'UNSUBSCRIBE': {
      handleUnsubscribe(message, connection, gateway);
      break;
    }
    case 'CHAT_TYPING': {
      handleTyping(message, connection, userId, gateway);
      break;
    }
    case 'CHAT_SEND': {
      await handleSend(message, connection, config, tenantId, userId, eventBus, gateway);
      break;
    }
    default: {
      const errorMsg = gateway.createMessage('ERROR', {
        message: `Unknown message type: ${messageType}`,
      });
      connection.send(JSON.stringify(errorMsg));
    }
  }
}

function handleSubscribe(
  message: Record<string, unknown>,
  connection: WSConnection,
  gateway: WebSocketGateway,
): void {
  const channel = message['channel'] as string | undefined;

  if (!channel) {
    const errorMsg = gateway.createMessage('ERROR', {
      message: 'Channel is required for subscribe',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  if (!gateway.isValidChannel(channel)) {
    const errorMsg = gateway.createMessage('ERROR', {
      message: 'Invalid channel',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const connId = getConnectionIdFromSocket(connection, gateway);
  if (connId) {
    gateway.isSubscribed(connId, channel);
  }

  const ackMsg = gateway.createMessage('ACK', {
    subscribed: channel,
  });
  connection.send(JSON.stringify(ackMsg));
}

function handleUnsubscribe(
  message: Record<string, unknown>,
  connection: WSConnection,
  gateway: WebSocketGateway,
): void {
  const channel = message['channel'] as string | undefined;

  if (!channel) {
    const errorMsg = gateway.createMessage('ERROR', {
      message: 'Channel is required for unsubscribe',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const connId = getConnectionIdFromSocket(connection, gateway);
  if (connId) {
    gateway.isUnsubscribed(connId, channel);
  }

  const ackMsg = gateway.createMessage('ACK', {
    unsubscribed: channel,
  });
  connection.send(JSON.stringify(ackMsg));
}

function handleTyping(
  message: Record<string, unknown>,
  connection: WSConnection,
  userId: string,
  gateway: WebSocketGateway,
): void {
  const channelId = message['channelId'] as string | undefined;

  if (!channelId) {
    return;
  }

  const connId = getConnectionIdFromSocket(connection, gateway);
  if (!connId) {
    return;
  }

  const channel = buildChannelName('chat', channelId);
  const typingMsg = gateway.createMessage('CHAT_TYPING', {
    channelId,
    playerId: userId,
    isTyping: true,
  });

  gateway.broadcastToChannel(channel, typingMsg);

  clearTypingTimer(`${connId}:${channelId}`);

  const timer = setTimeout(() => {
    const stopTypingMsg = gateway.createMessage('CHAT_TYPING', {
      channelId,
      playerId: userId,
      isTyping: false,
    });
    gateway.broadcastToChannel(channel, stopTypingMsg);
    typingTimers.delete(`${connId}:${channelId}`);
  }, TYPING_TIMEOUT_MS);

  typingTimers.set(`${connId}:${channelId}`, timer);
}

async function handleSend(
  message: Record<string, unknown>,
  connection: WSConnection,
  config: AppConfig,
  tenantId: string,
  userId: string,
  eventBus: IEventBus | undefined,
  gateway: WebSocketGateway,
): Promise<void> {
  const channelId = message['channelId'] as string | undefined;
  const content = message['content'] as string | undefined;

  if (!channelId || !content) {
    const errorMsg = gateway.createMessage('ERROR', {
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
      const rateLimitMsg = gateway.createMessage('CHAT_MODERATION_ACTION', {
        channelId,
        action: 'rate_limited',
        retryAfterMs: result.retryAfterMs,
      });
      connection.send(JSON.stringify(rateLimitMsg));
      return;
    }

    if (result.moderationStatus === 'rejected') {
      const modMsg = gateway.createMessage('CHAT_MODERATION_ACTION', {
        channelId,
        action: 'rejected',
        message: result.error,
      });
      connection.send(JSON.stringify(modMsg));
      return;
    }

    const errorMsg = gateway.createMessage('ERROR', {
      message: result.error ?? 'Failed to send message',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  if (result.moderationStatus === 'flagged') {
    const modMsg = gateway.createMessage('CHAT_MODERATION_ACTION', {
      channelId,
      action: 'flagged',
      messageId: result.message?.messageId,
    });
    connection.send(JSON.stringify(modMsg));
  }
}

function getConnectionIdFromSocket(
  connection: WSConnection,
  gateway: WebSocketGateway,
): string | undefined {
  for (const [connId, connectionItem] of gateway.getAllConnections()) {
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
