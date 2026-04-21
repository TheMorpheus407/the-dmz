import fp from 'fastify-plugin';

import { WebSocketGateway } from './websocket.gateway.js';

import type { FastifyPluginAsync } from 'fastify';
import type { WebSocketGatewayInterface } from './websocket.types.js';

const wsGatewayPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('wsGateway', new WebSocketGateway());
};

export const wsGatewayPlugin = fp(wsGatewayPluginImpl, {
  name: 'wsGateway',
});

declare module 'fastify' {
  interface FastifyInstance {
    wsGateway: WebSocketGatewayInterface;
  }
}
