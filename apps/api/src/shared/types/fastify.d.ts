import type { AppConfig } from '../../config.js';
import type { EventBus } from '../events/index.js';
import type { DatabaseClient } from '../database/connection.js';
import type { RedisRateLimitClient } from '../database/redis.js';

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
    db: DatabaseClient;
    redis: RedisRateLimitClient | null;
  }

  interface FastifyRequest {
    startTime?: bigint;
  }
}

export {};
