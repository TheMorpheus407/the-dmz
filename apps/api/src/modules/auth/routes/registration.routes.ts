import type { RegisterInput } from '@the-dmz/shared/schemas';
import { AuthAbuseCategory } from '@the-dmz/shared/contracts';

import { preAuthTenantResolver } from '../../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../../shared/middleware/pre-auth-tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { createAbuseGuard } from '../../../shared/middleware/abuse-guard.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerRegistrationRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';
  const tenantResolverEnabled = config.TENANT_RESOLVER_ENABLED ?? false;

  const preAuthMiddleware = tenantResolverEnabled
    ? [preAuthTenantResolver(), preAuthTenantStatusGuard]
    : [];

  fastify.post<{ Body: RegisterInput }>(
    '/auth/register',
    {
      preHandler: [
        ...preAuthMiddleware,
        createAbuseGuard(AuthAbuseCategory.REGISTER, { emailField: 'email' }),
      ],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 5,
              timeWindow: '1 hour',
            },
      },
      schema: {
        body: schemas.registerBodyJsonSchema,
        response: {
          201: schemas.authResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [
              errorResponseSchemas.TenantInactive,
              errorResponseSchemas.AbuseLocked,
              errorResponseSchemas.AbuseChallengeRequired,
              errorResponseSchemas.AbuseIpBlocked,
            ],
          },
          409: errorResponseSchemas.Conflict,
          429: {
            oneOf: [errorResponseSchemas.RateLimitExceeded, errorResponseSchemas.AbuseCooldown],
          },
          500: errorResponseSchemas.InternalServerError,
        },
        security: [{ cookieAuth: [] }],
      },
    },
    (request, reply) =>
      handlers.handleRegister(request, reply, { config, eventBus: fastify.eventBus }),
  );
};
