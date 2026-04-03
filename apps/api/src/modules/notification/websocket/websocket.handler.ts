/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { verifyJWT } from '../../auth/index.js';

import { wsGateway, type WebSocketGateway } from './websocket.gateway.js';

import type { FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { WSClientMessage, WebSocketAuthResult } from './websocket.types.js';

export interface WebSocketHandlerOptions {
  gateway?: WebSocketGateway;
}

export async function handleWebSocketConnection(
  connection: WebSocket,
  request: FastifyRequest,
  options: WebSocketHandlerOptions = {},
): Promise<void> {
  const gateway = options.gateway ?? wsGateway;

  const authResult = await authenticateWebSocket(request);

  if (!authResult.valid || !authResult.payload) {
    const errorMsg = gateway.createMessage(
      'ERROR',
      {
        message: authResult.error ?? 'Authentication failed',
      },
      undefined,
    );
    connection.send(JSON.stringify(errorMsg));
    connection.close(4001, 'Authentication failed');
    return;
  }

  const connectionInfo = gateway.registerConnection(connection, authResult.payload);

  const welcomeMsg = gateway.createMessage('NOTIFICATION', {
    message: 'Connected successfully',
    connectionId: connectionInfo.connectionId,
    userId: connectionInfo.userId,
  });

  connection.send(JSON.stringify(welcomeMsg));

  connection.on('message', (data: Buffer | string) => {
    void handleMessage(data, connection, gateway, connectionInfo.connectionId);
  });

  connection.on('close', () => {
    gateway.removeConnection(connectionInfo.connectionId);
  });

  connection.on('error', () => {
    gateway.removeConnection(connectionInfo.connectionId);
  });
}

async function handleMessage(
  data: Buffer | string,
  connection: WebSocket,
  gateway: WebSocketGateway,
  connectionId: string,
): Promise<void> {
  let message: WSClientMessage;

  try {
    const parsed = typeof data === 'string' ? data : data.toString();
    message = JSON.parse(parsed) as WSClientMessage;
  } catch {
    const errorMsg = gateway.createMessage('ERROR', {
      message: 'Invalid message format',
    });
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  switch (message.type) {
    case 'SUBSCRIBE': {
      handleSubscribe(message, connection, gateway, connectionId);
      break;
    }
    case 'UNSUBSCRIBE': {
      handleUnsubscribe(message, connection, gateway, connectionId);
      break;
    }
    case 'HEARTBEAT': {
      handleHeartbeat(message, connection, gateway, connectionId);
      break;
    }
    default: {
      const msgType = message.type as string;
      const errorMsg = gateway.createMessage(
        'ERROR',
        {
          message: `Unknown message type: ${msgType}`,
        },
        message.sequence,
      );
      connection.send(JSON.stringify(errorMsg));
    }
  }
}

function handleSubscribe(
  message: WSClientMessage,
  connection: WebSocket,
  gateway: WebSocketGateway,
  connectionId: string,
): void {
  const channels = message.channels ?? (message.channel ? [message.channel] : []);

  if (channels.length === 0) {
    const errorMsg = gateway.createMessage(
      'ERROR',
      {
        message: 'No channels provided',
      },
      message.sequence,
    );
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  const invalidChannels: string[] = [];
  const validChannels: string[] = [];

  for (const channel of channels) {
    if (gateway.isValidChannel(channel)) {
      validChannels.push(channel);
    } else {
      invalidChannels.push(channel);
    }
  }

  for (const channel of validChannels) {
    gateway.subscribe(connectionId, channel);
  }

  const ackMsg = gateway.createMessage(
    'ACK',
    {
      action: 'subscribe',
      channels: validChannels,
      ...(invalidChannels.length > 0 && { invalidChannels }),
    },
    message.sequence,
  );

  connection.send(JSON.stringify(ackMsg));
}

function handleUnsubscribe(
  message: WSClientMessage,
  connection: WebSocket,
  gateway: WebSocketGateway,
  connectionId: string,
): void {
  const channels = message.channels ?? (message.channel ? [message.channel] : []);

  if (channels.length === 0) {
    const errorMsg = gateway.createMessage(
      'ERROR',
      {
        message: 'No channels provided',
      },
      message.sequence,
    );
    connection.send(JSON.stringify(errorMsg));
    return;
  }

  for (const channel of channels) {
    gateway.unsubscribe(connectionId, channel);
  }

  const ackMsg = gateway.createMessage(
    'ACK',
    {
      action: 'unsubscribe',
      channels,
    },
    message.sequence,
  );

  connection.send(JSON.stringify(ackMsg));
}

function handleHeartbeat(
  message: WSClientMessage,
  connection: WebSocket,
  gateway: WebSocketGateway,
  connectionId: string,
): void {
  gateway.updateHeartbeat(connectionId);

  const ackMsg = gateway.createMessage(
    'HEARTBEAT_ACK',
    {
      timestamp: Date.now(),
    },
    message.sequence,
  );

  connection.send(JSON.stringify(ackMsg));
}

export async function authenticateWebSocket(request: FastifyRequest): Promise<WebSocketAuthResult> {
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
