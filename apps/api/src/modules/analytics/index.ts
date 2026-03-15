import fp from 'fastify-plugin';

import { analyticsPlugin as originalAnalyticsPlugin } from './analytics.plugin.js';
import { analyticsRoutes } from './analytics.routes.js';

import type { FastifyPluginAsync } from 'fastify';
import type { AnalyticsConfig } from './analytics.types.js';

const analyticsModulePluginImpl: FastifyPluginAsync<{
  config?: Partial<AnalyticsConfig>;
}> = async (fastify, options) => {
  await fastify.register(originalAnalyticsPlugin, options);
  await fastify.register(analyticsRoutes);
};

export const analyticsModulePlugin = fp(analyticsModulePluginImpl, {
  name: 'analytics-module',
  fastify: '5.x',
});

export { analyticsModulePlugin as analyticsPlugin };
export { analyticsRoutes } from './analytics.routes.js';
export * from './analytics.types.js';
export { CircuitBreaker } from './circuit-breaker.js';
export { validateIncomingEvent } from './event-validator.js';
export { PhishingMetricsService } from './phishing-metrics.service.js';
export { DecisionQualityService } from './decision-quality.service.js';
export { MetricsCache, metricsCache } from './metrics-cache.js';
