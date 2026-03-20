import fp from 'fastify-plugin';

import { coopSessionRoutes } from './coop-session.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

async function registerCoopSessionPlugin(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.register(coopSessionRoutes, config);
}

export const coopSessionPlugin = fp(registerCoopSessionPlugin, {
  name: 'coopSession',
  dependencies: ['auth', 'eventBus'],
});
