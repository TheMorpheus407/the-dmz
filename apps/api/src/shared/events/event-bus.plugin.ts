import fp from 'fastify-plugin';

import { EventBus } from './event-bus.js';

import type { FastifyPluginAsync } from 'fastify';

const eventBusPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'eventBus',
    new EventBus({
      logger: fastify.log,
    }),
  );
};

export const eventBusPlugin = fp(eventBusPluginImpl, {
  name: 'eventBus',
});
