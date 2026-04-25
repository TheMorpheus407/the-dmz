import { documentTemplateListResponseJsonSchema } from '@the-dmz/shared/schemas';

import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';

import * as documentsService from './documents.service.js';

import type { AuthenticatedUser } from '../../game/session/index.js';
import type { FastifyInstance } from 'fastify';

export const registerDocumentRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/content/templates/:type',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' },
          },
          required: ['type'],
        },
        querystring: {
          type: 'object',
          properties: {
            faction: { type: 'string' },
            locale: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: documentTemplateListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { type } = request.params as { type: string };

      const templates = await documentsService.getDocumentTemplatesByType(
        config,
        user.tenantId,
        type,
      );

      return { data: templates };
    },
  );
};
