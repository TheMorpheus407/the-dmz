import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { authGuard } from '../../../shared/middleware/authorization.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { validateCsrf } from '../csrf.js';
import { idempotency } from '../../../shared/middleware/idempotency.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { UpdateProfileData } from '../auth.repo.js';
import type { FastifyInstance } from 'fastify';

export const registerProfileRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.patch<{ Body: UpdateProfileData }>(
    '/auth/profile',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf, idempotency],
      schema: {
        security: [{ bearerAuth: [] }],
        body: schemas.updateProfileBodyJsonSchema,
        response: {
          200: schemas.profileResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleUpdateProfile(request, { config, eventBus: fastify.eventBus }),
  );

  fastify.get(
    '/health/authenticated',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      config: {
        rateLimit: false,
      },
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.healthAuthenticatedResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleHealthAuthenticated(request),
  );
};
