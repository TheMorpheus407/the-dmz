import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { authGuard, requirePermission } from '../../../shared/middleware/authorization.js';
import { requireMfaForSuperAdmin } from '../../../shared/middleware/mfa-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import * as handlers from '../auth.handlers.js';
import * as schemas from '../auth.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerAdminRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/auth/admin/users',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'list'),
        requireMfaForSuperAdmin,
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.adminUsersListResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.Forbidden, errorResponseSchemas.TenantInactive],
          },
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    () => handlers.handleAdminUsersList(),
  );
};
