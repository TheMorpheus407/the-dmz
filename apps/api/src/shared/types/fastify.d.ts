import type { AppConfig } from '../../config.js';
import type { EventBus } from '../events/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    eventBus: EventBus;
  }

  interface FastifyRequest {
    startTime?: bigint;
  }
}

export {};
