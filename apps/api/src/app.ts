import cors from '@fastify/cors';
import fastify, { type FastifyInstance } from 'fastify';

import { loadConfig, type AppConfig } from './config.js';
import { healthPlugin } from './modules/health/index.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { eventBusPlugin } from './shared/events/event-bus.plugin.js';
import { AppError, createErrorHandler, ErrorCodes } from './shared/middleware/error-handler.js';
import { requestLogger } from './shared/middleware/request-logger.js';
import { registerSecurityHeaders } from './shared/middleware/security-headers.js';
import { generateId } from './shared/utils/id.js';

const buildCorsOriginSet = (corsOriginsList: string[], nodeEnv: string): Set<string> => {
  const origins = new Set<string>();
  for (const origin of corsOriginsList) {
    origins.add(origin);
  }
  // In non-production environments, also allow 127.0.0.1 variant of localhost origins
  if (nodeEnv !== 'production') {
    for (const origin of corsOriginsList) {
      if (origin.includes('localhost')) {
        origins.add(origin.replace('localhost', '127.0.0.1'));
      }
    }
  }
  return origins;
};

const resolveRequestId = (value: string | string[] | undefined): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
};

export const buildApp = (config: AppConfig = loadConfig()): FastifyInstance => {
  const allowedOrigins = buildCorsOriginSet(config.CORS_ORIGINS_LIST, config.NODE_ENV);

  const app = fastify({
    disableRequestLogging: true,
    logger: {
      level: config.LOG_LEVEL,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          "req.headers['x-api-key']",
          'req.body.password',
          'req.body.token',
          'req.body.refreshToken',
        ],
        remove: true,
      },
    },
    requestIdHeader: 'x-request-id',
    genReqId: (req) => resolveRequestId(req.headers['x-request-id']) ?? generateId(),
  });

  app.decorate('config', config);

  app.register(eventBusPlugin);

  app.register(requestLogger);

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });

  registerSecurityHeaders(app, config);

  app.setNotFoundHandler(() => {
    throw new AppError({
      code: ErrorCodes.NOT_FOUND,
      message: 'Route not found',
      statusCode: 404,
    });
  });

  app.setErrorHandler(createErrorHandler());

  app.register(swaggerPlugin);

  app.get('/api/v1/', async () => ({
    status: 'ok',
    version: 'v1',
  }));

  app.register(healthPlugin);

  return app;
};
