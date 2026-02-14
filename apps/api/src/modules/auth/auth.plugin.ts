import fp from 'fastify-plugin';

import { registerAuthRoutes } from './auth.routes.js';

import type { FastifyPluginAsync } from 'fastify';

const authPluginImpl: FastifyPluginAsync = async (fastify) => {
  await registerAuthRoutes(fastify);
};

export const authPlugin = fp(authPluginImpl, { name: 'auth' });
