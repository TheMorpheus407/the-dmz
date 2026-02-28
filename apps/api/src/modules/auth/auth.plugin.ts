import fp from 'fastify-plugin';

import { registerAuthRoutes } from './auth.routes.js';
import { registerMfaRoutes } from './mfa.routes.js';
import { registerSSORoutes } from './auth.sso.routes.js';
import { preflightRoutes } from './auth.preflight.routes.js';
import apiKeyRoutes from './api-key.routes.js';

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
  await registerMfaRoutes(fastify);
  await registerSSORoutes(fastify);
  await preflightRoutes(fastify);
  await fastify.register(apiKeyRoutes);
};

export const authPlugin = fp(authPluginImpl, { name: 'auth', dependencies: ['eventBus'] });
