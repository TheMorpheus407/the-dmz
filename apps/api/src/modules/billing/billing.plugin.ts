import fp from 'fastify-plugin';

import { billingRoutes } from './billing.routes.js';
import { stripeWebhookRoutes } from './stripe-webhook.routes.js';

import type { FastifyInstance } from 'fastify';

async function registerBillingPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(billingRoutes, { prefix: '/api/v1/billing' });
  await fastify.register(stripeWebhookRoutes, { prefix: '/webhooks/billing' });
}

export const billingPlugin = fp(registerBillingPlugin, {
  name: 'billing',
  dependencies: ['eventBus'],
});
