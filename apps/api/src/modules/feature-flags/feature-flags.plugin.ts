import fp from 'fastify-plugin';

import { featureFlagsRoutes } from './feature-flags.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

async function registerFeatureFlagsPlugin(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.register(featureFlagsRoutes, config);
}

export const featureFlagsPlugin = fp(registerFeatureFlagsPlugin, {
  name: 'featureFlags',
  dependencies: ['auth', 'eventBus'],
});
