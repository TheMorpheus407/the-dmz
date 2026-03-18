import fp from 'fastify-plugin';

import { registerLtiRoutes } from './lti.routes.js';
import { registerAdminLtiRoutes } from './admin-lti.routes.js';

import type { FastifyInstance } from 'fastify';

async function registerLtiPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(registerLtiRoutes);
  await fastify.register(registerAdminLtiRoutes);
}

export const ltiPlugin = fp(registerLtiPlugin, {
  name: 'lti',
});
