import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';

import * as localizedService from './localized.service.js';

import type { AuthenticatedUser } from '../../auth/index.js';
import type { FastifyInstance } from 'fastify';

export const registerLocalizedRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/content/localized/:id',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params as { id: string };
      const query = request.query as { locale?: string };

      const content = await localizedService.getLocalizedContentRecord(
        config,
        user.tenantId,
        id,
        query.locale,
      );

      if (!content) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Localized content not found',
            details: {},
          },
        });
      }

      return { data: content };
    },
  );
};
