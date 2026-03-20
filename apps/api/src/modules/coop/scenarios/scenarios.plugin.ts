import fp from 'fastify-plugin';

import { coopScenarioRoutes } from './scenarios.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../../config.js';

async function registerCoopScenarioPlugin(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.register(coopScenarioRoutes, config);
}

export const coopScenarioPlugin = fp(registerCoopScenarioPlugin, {
  name: 'coopScenario',
  dependencies: ['auth', 'eventBus'],
});
