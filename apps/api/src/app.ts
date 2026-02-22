import cors from '@fastify/cors';
import fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';

import { loadConfig, type AppConfig } from './config.js';
import { healthPlugin } from './modules/health/index.js';
import { authPlugin } from './modules/auth/index.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { eventBusPlugin } from './shared/events/event-bus.plugin.js';
import { infrastructurePlugin } from './shared/plugins/infrastructure.plugin.js';
import { AppError, createErrorHandler, ErrorCodes } from './shared/middleware/error-handler.js';
import { globalRateLimiter, registerRateLimiter } from './shared/middleware/rate-limiter.js';
import { requestLogger } from './shared/middleware/request-logger.js';
import { sanitizeInputHook } from './shared/middleware/sanitize-input.js';
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

export const buildApp = (
  config: AppConfig = loadConfig(),
  options?: { skipHealthCheck?: boolean },
): FastifyInstance => {
  const allowedOrigins = buildCorsOriginSet(config.CORS_ORIGINS_LIST, config.NODE_ENV);

  const skipHealthCheck = options?.skipHealthCheck;

  const app = fastify({
    disableRequestLogging: true,
    logger: {
      level: config.LOG_LEVEL,
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            headers: {
              authorization: request.headers.authorization ? '[REDACTED]' : undefined,
              cookie: request.headers.cookie ? '[REDACTED]' : undefined,
              'x-api-key': request.headers['x-api-key'] ? '[REDACTED]' : undefined,
              'x-request-id': request.headers['x-request-id'],
              'user-agent': request.headers['user-agent'],
              'x-forwarded-for': request.headers['x-forwarded-for'],
            },
          };
        },
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          "req.headers['x-api-key']",
          'req.headers.x_refresh_token',
          'req.body.password',
          'req.body.passwordConfirm',
          'req.body.token',
          'req.body.refreshToken',
          'req.body.accessToken',
          'req.body.refresh_token',
          'req.body.access_token',
          'req.body.mfaCode',
          'req.body.mfa_code',
          'req.body.verificationCode',
          'req.body.verification_code',
          'req.body.code',
          'req.body.secret',
          'req.body.clientSecret',
          'req.body.client_secret',
          'response.headers.authorization',
          'response.headers.set-cookie',
        ],
        remove: true,
      },
    },
    requestIdHeader: 'x-request-id',
    genReqId: (req) => resolveRequestId(req.headers['x-request-id']) ?? generateId(),
    // Baseline global payload cap; a future preParsing requestSizeLimitHook can add
    // route-specific overrides on top of this default limit.
    bodyLimit: config.MAX_BODY_SIZE,
    // Let sanitizeInputHook classify forbidden keys consistently at preValidation.
    onProtoPoisoning: 'ignore',
    onConstructorPoisoning: 'ignore',
  });

  app.decorate('config', config);

  app.register(cookie);

  app.register(infrastructurePlugin, {
    config,
    ...(skipHealthCheck !== undefined && { skipHealthCheck }),
  });

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
  registerRateLimiter(app, config);

  app.addHook('preValidation', sanitizeInputHook);

  app.setNotFoundHandler(
    {
      preHandler: globalRateLimiter(),
    },
    () => {
      throw new AppError({
        code: ErrorCodes.NOT_FOUND,
        message: 'Route not found',
        statusCode: 404,
      });
    },
  );

  app.setErrorHandler(createErrorHandler());

  app.register(swaggerPlugin);

  app.after(() => {
    app.get('/api/v1/', async () => ({
      status: 'ok',
      version: 'v1',
    }));

    app.register(healthPlugin);

    app.register(
      async (apiRouter) => {
        await apiRouter.register(authPlugin);
      },
      { prefix: '/api/v1' },
    );
  });

  return app;
};
