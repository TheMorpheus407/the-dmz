import { AuthAbuseCategory } from '@the-dmz/shared/contracts';

import { preAuthTenantResolver } from '../../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../../shared/middleware/pre-auth-tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { createAbuseGuard } from '../../../shared/middleware/abuse-guard.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerPasswordRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';
  const tenantResolverEnabled = config.TENANT_RESOLVER_ENABLED ?? false;

  const preAuthMiddleware = tenantResolverEnabled
    ? [preAuthTenantResolver(), preAuthTenantStatusGuard]
    : [];

  fastify.post<{ Body: { email: string } }>(
    '/auth/password/reset',
    {
      preHandler: [
        ...preAuthMiddleware,
        createAbuseGuard(AuthAbuseCategory.PASSWORD_RESET, { emailField: 'email' }),
      ],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 3,
              timeWindow: '1 hour',
            },
      },
      schema: {
        body: schemas.passwordResetRequestBodyJsonSchema,
        response: {
          200: schemas.passwordResetRequestResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [
              errorResponseSchemas.TenantInactive,
              errorResponseSchemas.AbuseLocked,
              errorResponseSchemas.AbuseChallengeRequired,
              errorResponseSchemas.AbuseIpBlocked,
            ],
          },
          429: {
            oneOf: [
              errorResponseSchemas.RateLimitExceeded,
              errorResponseSchemas.AbuseCooldown,
              errorResponseSchemas.PasswordResetRateLimited,
            ],
          },
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handlePasswordReset(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.post<{ Body: { token: string; password: string } }>(
    '/auth/password/change',
    {
      preHandler: [...preAuthMiddleware, createAbuseGuard(AuthAbuseCategory.PASSWORD_CHANGE)],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: schemas.passwordChangeRequestBodyJsonSchema,
        response: {
          200: schemas.passwordChangeRequestResponseJsonSchema,
          400: {
            oneOf: [
              errorResponseSchemas.BadRequest,
              errorResponseSchemas.PasswordPolicyError,
              errorResponseSchemas.PasswordResetTokenExpired,
              errorResponseSchemas.PasswordResetTokenInvalid,
              errorResponseSchemas.PasswordResetTokenAlreadyUsed,
            ],
          },
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
      },
    },
    (request) => handlers.handlePasswordChange(request, { config, eventBus: fastify.eventBus }),
  );
};
