import * as Sentry from '@sentry/node';

import { loadConfig, type AppConfig } from '../../config.js';

import type { FastifyPluginAsync } from 'fastify';

export type SentryPluginOptions = {
  config?: AppConfig;
};

const sentryPluginCallback: FastifyPluginAsync<SentryPluginOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const config = options.config ?? loadConfig();
  const { SENTRY_DSN, NODE_ENV, API_VERSION } = config;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: NODE_ENV,
      release: API_VERSION,
      sampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
      tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
      attachStacktrace: true,
      maxBreadcrumbs: 50,
    });

    fastify.log.info({ dsn: SENTRY_DSN, environment: NODE_ENV }, 'Sentry initialized');
  } else {
    fastify.log.info('Sentry DSN not configured - error monitoring disabled');
  }

  fastify.addHook('onClose', async () => {
    if (SENTRY_DSN) {
      await Sentry.close(2000);
      fastify.log.info('Sentry closed');
    }
  });
};

export const sentryPlugin = sentryPluginCallback;
