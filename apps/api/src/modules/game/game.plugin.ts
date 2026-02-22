import fp from 'fastify-plugin';

import { registerGameSessionRoutes } from './session/game-session.routes.js';

import type { FastifyPluginAsync } from 'fastify';

const gamePluginImpl: FastifyPluginAsync = async (fastify) => {
  if (!fastify.eventBus) {
    throw new Error('eventBus plugin is required for game module');
  }

  await registerGameSessionRoutes(fastify);
};

export const gamePlugin = fp(gamePluginImpl, { name: 'game', dependencies: ['eventBus'] });
