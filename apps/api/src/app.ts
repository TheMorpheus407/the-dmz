import cors from '@fastify/cors';
import fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';

import { loadConfig, type AppConfig } from './config.js';
import { validateManifest, getRegistrationOrder } from './modules/bootstrap.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { AppError, createErrorHandler, ErrorCodes } from './shared/middleware/error-handler.js';
import { globalRateLimiter, registerRateLimiter } from './shared/middleware/rate-limiter.js';
import { requestLogger } from './shared/middleware/request-logger.js';
import { sanitizeInputHook } from './shared/middleware/sanitize-input.js';
import { registerSecurityHeaders } from './shared/middleware/security-headers.js';
import { generateId } from './shared/utils/id.js';
import { infrastructurePlugin } from './shared/plugins/infrastructure.plugin.js';
import { eventBusPlugin } from './shared/events/event-bus.plugin.js';
import { healthPlugin } from './modules/health/index.js';
import { authPlugin, jwksPlugin, signingKeyInitPlugin } from './modules/auth/index.js';
import { gamePlugin } from './modules/game/game.plugin.js';

const MODULE_REGISTRY: Record<string, { plugin: unknown; routePrefix?: string }> = {
  infrastructure: { plugin: infrastructurePlugin },
  eventBus: { plugin: eventBusPlugin },
  health: { plugin: healthPlugin },
  auth: { plugin: authPlugin, routePrefix: '/auth' },
  game: { plugin: gamePlugin, routePrefix: '/game' },
};

const buildCorsOriginSet = (corsOriginsList: string[], nodeEnv: string): Set<string> => {
  const origins = new Set<string>();
  for (const origin of corsOriginsList) {
    origins.add(origin);
  }
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
    bodyLimit: config.MAX_BODY_SIZE,
    onProtoPoisoning: 'ignore',
    onConstructorPoisoning: 'ignore',
  });

  app.decorate('config', config);

  const manifestValidation = validateManifest();
  if (!manifestValidation.valid) {
    const errorMessages = manifestValidation.errors.map((e) => `  - ${e.message}`).join('\n');
    throw new Error(`Module manifest validation failed:\n${errorMessages}`);
  }

  app.register(cookie);

  const registrationOrder = getRegistrationOrder();

  const infrastructureNames = new Set(['infrastructure', 'eventBus']);
  const infrastructureEntries = registrationOrder.filter((e) => infrastructureNames.has(e.name));
  const domainEntries = registrationOrder.filter((e) => !infrastructureNames.has(e.name));

  for (const entry of infrastructureEntries) {
    const registryEntry = MODULE_REGISTRY[entry.name];
    if (!registryEntry) {
      throw new Error(
        `Module '${entry.name}' is in manifest but not registered in MODULE_REGISTRY`,
      );
    }

    if (entry.name === 'infrastructure') {
      app.register(registryEntry.plugin as never, {
        config,
        ...(skipHealthCheck !== undefined && { skipHealthCheck }),
      });
    } else {
      app.register(registryEntry.plugin as never);
    }
  }

  const rootLevelModules = domainEntries.filter((e) => {
    const registryEntry = MODULE_REGISTRY[e.name];
    return registryEntry && !registryEntry.routePrefix;
  });
  const prefixedModules = domainEntries.filter((e) => {
    const registryEntry = MODULE_REGISTRY[e.name];
    return registryEntry && !!registryEntry.routePrefix;
  });

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

  app.register(signingKeyInitPlugin);
  app.register(jwksPlugin);

  app.get('/api/v1/', async () => ({
    status: 'ok',
    version: 'v1',
  }));

  for (const entry of rootLevelModules) {
    const registryEntry = MODULE_REGISTRY[entry.name];
    if (!registryEntry) {
      throw new Error(
        `Module '${entry.name}' is in manifest but not registered in MODULE_REGISTRY`,
      );
    }
    app.register(registryEntry.plugin as never);
  }

  app.register(
    async (apiRouter) => {
      for (const entry of prefixedModules) {
        const registryEntry = MODULE_REGISTRY[entry.name];
        if (!registryEntry) {
          throw new Error(
            `Module '${entry.name}' is in manifest but not registered in MODULE_REGISTRY`,
          );
        }

        const { plugin, routePrefix } = registryEntry;
        if (!routePrefix) {
          throw new Error(
            `Module '${entry.name}' has no routePrefix but was included in prefixedModules`,
          );
        }
        await apiRouter.register(plugin as never, { prefix: routePrefix });
      }
    },
    { prefix: '/api/v1' },
  );

  return app;
};
