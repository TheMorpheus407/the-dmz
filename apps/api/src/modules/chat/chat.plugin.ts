import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';

import { chatRoutes } from './chat.routes.js';
import { chatWebSocketHandler } from './chat.ws.handler.js';
import {
  createChatBroadcastHandler,
  removeChatBroadcastHandler,
} from './chat-broadcast.handler.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

async function registerChatPlugin(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  await fastify.register(websocket, {
    options: {
      maxPayload: 1024 * 1024 * 10,
    },
  });

  fastify.get('/ws/chat', { websocket: true }, async (connection, request) => {
    await chatWebSocketHandler(connection, request, config, fastify.eventBus, fastify.wsGateway);
  });

  createChatBroadcastHandler(fastify.eventBus, fastify.wsGateway);

  fastify.addHook('onClose', async () => {
    removeChatBroadcastHandler(fastify.eventBus, fastify.wsGateway);
  });

  fastify.register(chatRoutes, config);
}

export const chatPlugin = fp(registerChatPlugin, {
  name: 'chat',
  dependencies: ['auth', 'eventBus'],
});
