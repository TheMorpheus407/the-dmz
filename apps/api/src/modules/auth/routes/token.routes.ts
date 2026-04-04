import type { RefreshTokenInput } from '@the-dmz/shared/schemas';

import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { authGuard } from '../../../shared/middleware/authorization.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { validateCsrf } from '../csrf.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerTokenRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.post<{ Body: RefreshTokenInput }>(
    '/auth/refresh',
    {
      preHandler: [validateCsrf],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 20,
              timeWindow: '1 minute',
            },
      },
      schema: {
        response: {
          200: schemas.refreshResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
    },
    (request, reply) =>
      handlers.handleRefresh(request, reply, { config, eventBus: fastify.eventBus }),
  );

  fastify.delete(
    '/auth/logout',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }, { cookieAuth: [] }, { csrfToken: [] }],
        response: {
          200: schemas.logoutResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) =>
      handlers.handleLogout(request, reply, { config, eventBus: fastify.eventBus }),
  );

  fastify.get(
    '/auth/me',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.meResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleMe(request, { config, eventBus: fastify.eventBus }),
  );
};
