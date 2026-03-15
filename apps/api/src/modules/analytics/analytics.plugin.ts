import fp from 'fastify-plugin';

import { AnalyticsService } from './analytics.service.js';

import type { FastifyPluginAsync } from 'fastify';
import type { AnalyticsConfig } from './analytics.types.js';

declare module 'fastify' {
  interface FastifyInstance {
    analytics: AnalyticsService;
  }
}

const analyticsPluginImpl: FastifyPluginAsync<{
  config?: Partial<AnalyticsConfig>;
}> = async (fastify, { config }) => {
  if (!fastify.eventBus) {
    throw new Error('eventBus plugin is required for analytics module');
  }

  const analyticsService = new AnalyticsService(fastify, config);

  await analyticsService.initialize();

  analyticsService.subscribeToEvents(fastify.eventBus);

  fastify.decorate('analytics', analyticsService);

  fastify.addHook('onClose', async () => {
    await analyticsService.shutdown();
  });
};

export const analyticsPlugin = fp(analyticsPluginImpl, {
  name: 'analytics',
  fastify: '5.x',
});

export { AnalyticsService } from './analytics.service.js';
export { PlayerProfileService } from './player-profile.service.js';
export * from './analytics.types.js';
