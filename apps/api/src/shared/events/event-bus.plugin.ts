import fp from 'fastify-plugin';

import { DefaultEventBus } from './event-bus.js';

import type { FastifyPluginAsync } from 'fastify';

const eventBusPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'eventBus',
    new DefaultEventBus({
      logger: fastify.log,
    }),
  );
};

export const eventBusPlugin = fp(eventBusPluginImpl, {
  name: 'eventBus',
});
