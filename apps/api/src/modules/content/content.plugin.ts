import fp from 'fastify-plugin';

import { registerContentRoutes } from './content.routes.js';

import type { FastifyPluginAsync } from 'fastify';

const contentPluginImpl: FastifyPluginAsync = async (fastify) => {
  if (!fastify.eventBus) {
    throw new Error('eventBus plugin is required for content module');
  }

  await registerContentRoutes(fastify);
};

export const contentPlugin = fp(contentPluginImpl, {
  name: 'content',
  dependencies: ['eventBus'],
});
