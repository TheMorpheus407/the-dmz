import type { LoginInput } from '@the-dmz/shared/schemas';
import { AuthAbuseCategory } from '@the-dmz/shared/contracts';

import { preAuthTenantResolver } from '../../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../../shared/middleware/pre-auth-tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { createAbuseGuard } from '../../../shared/middleware/abuse-guard.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerLoginRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';
  const tenantResolverEnabled = config.TENANT_RESOLVER_ENABLED ?? false;

  const preAuthMiddleware = tenantResolverEnabled
    ? [preAuthTenantResolver(), preAuthTenantStatusGuard]
    : [];

  fastify.post<{ Body: LoginInput }>(
    '/auth/login',
    {
      preHandler: [
        ...preAuthMiddleware,
        createAbuseGuard(AuthAbuseCategory.LOGIN, { emailField: 'email' }),
      ],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '15 minutes',
            },
      },
      schema: {
        body: schemas.loginBodyJsonSchema,
        response: {
          200: schemas.authResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: {
            oneOf: [
              errorResponseSchemas.TenantInactive,
              errorResponseSchemas.AbuseLocked,
              errorResponseSchemas.AbuseChallengeRequired,
              errorResponseSchemas.AbuseIpBlocked,
            ],
          },
          429: {
            oneOf: [errorResponseSchemas.RateLimitExceeded, errorResponseSchemas.AbuseCooldown],
          },
          500: errorResponseSchemas.InternalServerError,
        },
        security: [{ cookieAuth: [] }],
      },
    },
    (request, reply) =>
      handlers.handleLogin(request, reply, { config, eventBus: fastify.eventBus }),
  );
};
