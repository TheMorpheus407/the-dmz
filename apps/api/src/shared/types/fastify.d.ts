import type { AppConfig } from '../../config.js';
import type { EventBus } from '../events/index.js';

declare module 'fastify' {
  interface SanitizeRouteConfig {
    skipHtmlFields?: string[];
    enforcePrototypePollution?: boolean;
  }

  interface FastifyContextConfig {
    sanitize?: SanitizeRouteConfig;
  }

  interface FastifyInstance {
    config: AppConfig;
    eventBus: EventBus;
  }

  interface FastifyRequest {
    startTime?: bigint;
  }
}

export {};
