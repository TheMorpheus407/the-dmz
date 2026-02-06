import cors from '@fastify/cors';
import fastify, { type FastifyInstance } from 'fastify';

import { loadConfig, type AppConfig } from './config.js';
import { healthPlugin } from './modules/health/index.js';
import { AppError, createErrorHandler, ErrorCodes } from './shared/middleware/error-handler.js';
import { requestLogger } from './shared/middleware/request-logger.js';
import { generateId } from './shared/utils/id.js';

const localOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

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

  app.register(requestLogger);

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.NODE_ENV !== 'production' && localOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });

  app.setNotFoundHandler(() => {
    throw new AppError({
      code: ErrorCodes.NOT_FOUND,
      message: 'Route not found',
      statusCode: 404,
    });
  });

  app.setErrorHandler(createErrorHandler());

  app.get('/api/v1/', async () => ({
    status: 'ok',
    version: 'v1',
  }));

  app.register(healthPlugin);

  return app;
};
