import fp from 'fastify-plugin';

import { retentionRoutes } from './retention.routes.js';

import type { FastifyPluginAsync } from 'fastify';

const retentionModulePluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(retentionRoutes);
};

export const retentionModulePlugin = fp(retentionModulePluginImpl, {
  name: 'retention-module',
  fastify: '5.x',
});
