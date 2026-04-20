import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import { listLtiSessions } from './lti.service.js';
import { ltiSessionListResponseSchema } from './admin-lti-schemas.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

function getConfig(request: FastifyRequest): AppConfig {
  return request.server.config;
}

export async function registerAdminLtiSessions(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/admin/lti/sessions',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            platformId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: ltiSessionListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as { platformId?: string } | undefined;

      const sessions = await listLtiSessions(getConfig(request), user.tenantId, query?.platformId);

      return sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
      }));
    },
  );
}
