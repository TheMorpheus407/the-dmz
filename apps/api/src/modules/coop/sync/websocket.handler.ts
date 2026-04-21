import {
  type WebSocketGatewayInterface,
  type CoopWSClientMessage,
  type CoopWSServerMessage,
  type WSServerMessage,
} from '../../notification/websocket/index.js';

import { validateAndApplyAction } from './sync.service.js';

import type { WebSocket as WSConnection } from 'ws';
import type { AppConfig } from '../../../config.js';
import type { IEventBus } from '../../../shared/events/event-types.js';
import type { FastifyRequest } from 'fastify';

export interface CoopWebSocketHandlerOptions {
  gateway?: WebSocketGatewayInterface;
  config: AppConfig;
  eventBus: IEventBus;
}

export function buildCoopChannelName(sessionId: string, channelType: string): string {
  return `session.${channelType}:${sessionId}`;
}

export async function handleCoopWebSocketConnection(
  connection: WSConnection,
  _request: FastifyRequest,
  options: CoopWebSocketHandlerOptions,
): Promise<void> {
  const gateway = options.gateway;
  const config = options.config;

  if (!gateway) {
    connection.close(4001, 'Gateway not available');
    return;
  }

  connection.on('message', (data: Buffer | string) => {
    void handleCoopMessage(data, connection, gateway, config, options.eventBus);
  });
}

async function handleCoopMessage(
  data: Buffer | string,
  connection: WSConnection,
  gateway: WebSocketGatewayInterface,
  config: AppConfig,
  eventBus: IEventBus,
): Promise<void> {
  let message: CoopWSClientMessage;

  try {
    const parsed = typeof data === 'string' ? data : data.toString();
    message = JSON.parse(parsed) as CoopWSClientMessage;
  } catch {
    connection.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
    return;
  }

  switch (message.type) {
    case 'ACTION_SUBMIT': {
      await handleActionSubmit(message, connection, gateway, config, eventBus);
      break;
    }
    default: {
      const unknownType: string = message.type;
      connection.send(
        JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${unknownType}` }),
      );
    }
  }
}

async function handleActionSubmit(
  message: CoopWSClientMessage & { type: 'ACTION_SUBMIT' },
  connection: WSConnection,
  gateway: WebSocketGatewayInterface,
  config: AppConfig,
  eventBus: IEventBus,
): Promise<void> {
  const { action, payload, seq, requestId } = message;

  const result = await validateAndApplyAction(config, eventBus, {
    sessionId: payload['sessionId'] as string,
    tenantId: payload['tenantId'] as string,
    playerId: payload['playerId'] as string,
    action,
    payload: payload['actionPayload'] as Record<string, unknown>,
    clientSeq: seq,
    requestId,
  });

  if (result.accepted) {
    const acceptedMsg: CoopWSServerMessage = {
      type: 'ACTION_ACCEPTED',
      seq: result.newSeq!,
      events: result.events!,
      requestId,
    };
    connection.send(JSON.stringify(acceptedMsg));

    const sessionId = payload['sessionId'] as string;
    const eventMsg: WSServerMessage = {
      type: 'EVENT',
      payload: {
        seq: result.newSeq,
        event: result.events?.[0],
      },
      timestamp: Date.now(),
      sequence: result.newSeq!,
    };
    gateway.broadcastToChannel(buildCoopChannelName(sessionId, 'events'), eventMsg);
  } else {
    const rejectedMsg: CoopWSServerMessage = {
      type: 'ACTION_REJECTED',
      reason: result.reason!,
      currentSeq: result.currentSeq!,
      requestId,
    };
    connection.send(JSON.stringify(rejectedMsg));
  }
}
