import fp from 'fastify-plugin';

import { registerCacheRoutes } from './cache.routes.js';

import type { FastifyPluginAsync } from 'fastify';

const cachePluginImpl: FastifyPluginAsync = async (fastify) => {
  await registerCacheRoutes(fastify);
};

export const cachePlugin = fp(cachePluginImpl, { name: 'cache' });
