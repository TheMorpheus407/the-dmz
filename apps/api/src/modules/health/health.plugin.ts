import fp from 'fastify-plugin';

import { registerHealthRoutes } from './health.routes.js';

import type { FastifyPluginAsync } from 'fastify';

const healthPluginImpl: FastifyPluginAsync = async (fastify) => {
  await registerHealthRoutes(fastify);
};

export const healthPlugin = fp(healthPluginImpl, { name: 'health' });
