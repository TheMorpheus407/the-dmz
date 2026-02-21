import fp from 'fastify-plugin';

import { registerAuthRoutes } from './auth.routes.js';

import type { FastifyPluginAsync } from 'fastify';
import type { EventBus } from '../../shared/events/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    eventBus: EventBus;
  }
}

const authPluginImpl: FastifyPluginAsync = async (fastify) => {
  if (!fastify.eventBus) {
    throw new Error('eventBus plugin is required for auth module');
  }

  fastify.decorate('eventBus', fastify.eventBus);

  await registerAuthRoutes(fastify);
};

export const authPlugin = fp(authPluginImpl, { name: 'auth', dependencies: ['eventBus'] });
