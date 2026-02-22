import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';

import { loadConfig, type AppConfig } from '../../config.js';
import { checkDatabaseHealth, closeDatabase, getDatabaseClient } from '../database/connection.js';
import { checkRedisHealth, closeRedisClient, getRedisClient } from '../database/redis.js';

export type InfrastructurePluginOptions = {
  config?: AppConfig;
  skipHealthCheck?: boolean;
};

const infrastructurePluginCallback: FastifyPluginAsync<InfrastructurePluginOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const config = options.config ?? loadConfig();
  const skipHealthCheck = options.skipHealthCheck ?? config.NODE_ENV === 'test';

  await initializeDatabase(fastify, config, skipHealthCheck);
  await initializeRedis(fastify, config, skipHealthCheck);
  registerShutdownHandlers(fastify);
};

const initializeDatabase = async (
  fastify: FastifyInstance,
  config: AppConfig,
  skipHealthCheck: boolean,
): Promise<void> => {
  const service = 'database';
  const environment = config.NODE_ENV;

  fastify.log.info({ service, environment, message: 'Initializing database connection' });

  if (config.NODE_ENV === 'test' || skipHealthCheck) {
    const db = getDatabaseClient(config);
    fastify.decorate('db', db);

    fastify.log.info({
      service,
      environment,
      message: 'Database connection established (test mode)',
    });
    return;
  }

  const health = await checkDatabaseHealth(config);

  if (!health.ok) {
    fastify.log.error({
      service,
      environment,
      message: 'Database connection failed during startup',
      error: health.message,
    });
    throw new Error(`Database connection failed: ${health.message}`);
  }

  const db = getDatabaseClient(config);
  fastify.decorate('db', db);

  fastify.log.info({
    service,
    environment,
    message: 'Database connection established',
  });
};

const initializeRedis = async (
  fastify: FastifyInstance,
  config: AppConfig,
  skipHealthCheck: boolean,
): Promise<void> => {
  const service = 'redis';
  const environment = config.NODE_ENV;

  fastify.log.info({ service, environment, message: 'Initializing Redis connection' });

  if (config.NODE_ENV === 'test' || skipHealthCheck) {
    fastify.log.info({
      service,
      environment,
      message: 'Redis initialization skipped (test mode)',
    });
    fastify.decorate('redis', null);
    return;
  }

  const redis = getRedisClient(config);

  if (!redis) {
    fastify.log.warn({
      service,
      environment,
      message: 'Redis unavailable - starting in degraded mode',
    });
    fastify.decorate('redis', null);
    return;
  }

  try {
    await redis.connect();
    const health = await checkRedisHealth(config);

    if (!health.ok) {
      fastify.log.warn({
        service,
        environment,
        message: 'Redis health check failed - starting in degraded mode',
        error: health.message,
      });
      fastify.decorate('redis', null);
      return;
    }

    fastify.decorate('redis', redis);

    fastify.log.info({
      service,
      environment,
      message: 'Redis connection established',
    });
  } catch (error) {
    fastify.log.warn({
      service,
      environment,
      message: 'Redis connection failed - starting in degraded mode',
      error: error instanceof Error ? error.message : String(error),
    });
    fastify.decorate('redis', null);
  }
};

const registerShutdownHandlers = (fastify: FastifyInstance): void => {
  fastify.addHook('onClose', async () => {
    fastify.log.info({ message: 'Closing infrastructure connections' });

    await closeDatabase();

    fastify.log.info({ service: 'database', message: 'Database connection closed' });

    await closeRedisClient();

    fastify.log.info({ service: 'redis', message: 'Redis connection closed' });
  });
};

export const infrastructurePlugin = infrastructurePluginCallback;
