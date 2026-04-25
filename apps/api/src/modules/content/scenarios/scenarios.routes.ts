import {
  scenarioListResponseJsonSchema,
  scenarioResponseJsonSchema,
  emailTemplateListResponseJsonSchema,
} from '@the-dmz/shared/schemas';

import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';
import * as emailTemplatesService from '../email-templates/email-templates.service.js';

import * as scenariosService from './scenarios.service.js';

import type { AuthenticatedUser } from '../../game/session/index.js';
import type { FastifyInstance } from 'fastify';

export const registerScenarioRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/content/scenarios',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            difficulty: { type: 'integer', minimum: 1, maximum: 5 },
            faction: { type: 'string' },
            season: { type: 'integer', minimum: 1 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: scenarioListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        difficulty?: number;
        faction?: string;
        season?: number;
        isActive?: boolean;
      };

      const scenarios = await scenariosService.listScenarios(config, user.tenantId, query);

      return { data: scenarios };
    },
  );

  fastify.get(
    '/content/scenarios/:id',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: scenarioResponseJsonSchema,
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

      const scenario = await scenariosService.getScenario(config, user.tenantId, id);

      if (!scenario) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Scenario not found',
            details: {},
          },
        });
      }

      return { data: scenario };
    },
  );

  fastify.get(
    '/content/scenarios/act1',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            difficulty: { type: 'integer', minimum: 1, maximum: 5 },
            faction: { type: 'string' },
          },
        },
        response: {
          200: emailTemplateListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        difficulty?: number;
        faction?: string;
      };

      const filters: {
        season: number;
        difficulty?: number;
        faction?: string;
        isActive: boolean;
      } = {
        season: 1,
        isActive: true,
      };

      if (query.difficulty !== undefined) {
        filters.difficulty = query.difficulty;
      }
      if (query.faction !== undefined) {
        filters.faction = query.faction;
      }

      const emails = await emailTemplatesService.listEmailTemplates(config, user.tenantId, filters);

      return { data: emails };
    },
  );
};
