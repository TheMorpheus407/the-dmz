import websocket from '@fastify/websocket';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';

import { wsGateway } from './websocket/websocket.gateway.js';
import { handleWebSocketConnection } from './websocket/websocket.handler.js';
import {
  handleSSEConnection,
  handleSSESubscribe,
  handleSSEUnsubscribe,
} from './websocket/sse.handler.js';

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket, {
    options: {
      maxPayload: 1024 * 1024 * 10,
    },
  });

  fastify.get(
    '/ws',
    {
      websocket: true,
    },
    async (connection, request) => {
      await handleWebSocketConnection(connection, request, { gateway: wsGateway });
    },
  );

  fastify.get(
    '/events',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
    },
    async (request, reply) => {
      await handleSSEConnection(request, reply, wsGateway);
    },
  );

  fastify.post(
    '/events/subscribe',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
    },
    async (request, reply) => {
      await handleSSESubscribe(request, reply, wsGateway);
    },
  );

  fastify.post(
    '/events/unsubscribe',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
    },
    async (request, reply) => {
      await handleSSEUnsubscribe(request, reply, wsGateway);
    },
  );

  fastify.get(
    '/metrics',
    {
      preHandler: [authGuard],
    },
    async () => {
      return {
        totalConnections: wsGateway.getConnectionCount(),
        timestamp: Date.now(),
      };
    },
  );
};

export async function registerNotificationRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(notificationRoutes, { prefix: '/api/v1' });
}
