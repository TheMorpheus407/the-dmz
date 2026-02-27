import fp from 'fastify-plugin';

import { registerScimRoutes } from './scim.routes.js';

import type { FastifyPluginAsync } from 'fastify';

const scimPluginImpl: FastifyPluginAsync = async (fastify) => {
  await registerScimRoutes(fastify);
};

export const scimPlugin = fp(scimPluginImpl, { name: 'scim' });
