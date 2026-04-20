import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import { createLtiScore, listLtiScores, type CreateLtiScoreInput } from './lti.service.js';
import {
  createLtiScoreSchema,
  ltiScoreResponseSchema,
  ltiScoreListResponseSchema,
} from './admin-lti-schemas.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

function getConfig(request: FastifyRequest): AppConfig {
  return request.server.config;
}

export async function registerAdminLtiScores(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/admin/lti/scores',
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
            lineItemId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: ltiScoreListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as { lineItemId?: string } | undefined;

      const scores = await listLtiScores(getConfig(request), user.tenantId, query?.lineItemId);

      return scores.map((score) => ({
        ...score,
        timestamp: score.timestamp.toISOString(),
        createdAt: score.createdAt.toISOString(),
      }));
    },
  );

  fastify.post(
    '/admin/lti/scores',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requireRole('admin', 'super_admin'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createLtiScoreSchema,
        response: {
          201: ltiScoreResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as CreateLtiScoreInput;

      const score = await createLtiScore(getConfig(request), user.tenantId, {
        lineItemId: body.lineItemId,
        userId: body.userId,
        ...(body.scoreGiven !== undefined && { scoreGiven: body.scoreGiven }),
        ...(body.scoreMaximum !== undefined && { scoreMaximum: body.scoreMaximum }),
        ...(body.activityProgress && { activityProgress: body.activityProgress }),
        ...(body.gradingProgress && { gradingProgress: body.gradingProgress }),
        ...(body.timestamp && { timestamp: body.timestamp }),
      });

      return {
        ...score,
        timestamp: score.timestamp.toISOString(),
        createdAt: score.createdAt.toISOString(),
      };
    },
  );
}
