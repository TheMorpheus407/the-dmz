import fp from 'fastify-plugin';

import { partyRoutes } from './party.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

async function registerPartyPlugin(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.register(partyRoutes, config);
}

export const partyPlugin = fp(registerPartyPlugin, {
  name: 'party',
  dependencies: ['auth', 'eventBus'],
});
