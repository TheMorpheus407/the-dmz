import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import * as contentService from './content.service.js';

// eslint-disable-next-line import-x/no-restricted-paths
import type { AuthenticatedUser } from '../game/session/game-session.service.js';
import type { FastifyInstance } from 'fastify';

const protectedRoutePreHandlers = [authGuard, tenantContext, tenantStatusGuard];
const contentReadRoutePreHandlers = [
  ...protectedRoutePreHandlers,
  requirePermission('admin', 'read'),
];
const contentWriteRoutePreHandlers = [
  ...protectedRoutePreHandlers,
  requirePermission('admin', 'write'),
];
const tenantInactiveOrForbiddenResponseJsonSchema = {
  oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
} as const;

export const registerContentRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/content/emails',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            contentType: { type: 'string' },
            difficulty: { type: 'integer', minimum: 1, maximum: 5 },
            faction: { type: 'string' },
            attackType: { type: 'string', maxLength: 100 },
            threatLevel: { type: 'string', enum: ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'] },
            season: { type: 'integer', minimum: 1 },
            chapter: { type: 'integer', minimum: 1 },
            isActive: { type: 'boolean' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        contentType?: string;
        difficulty?: number;
        faction?: string;
        attackType?: string;
        threatLevel?: string;
        season?: number;
        chapter?: number;
        isActive?: boolean;
      };

      const templates = await contentService.listEmailTemplates(config, user.tenantId, query);

      return { data: templates };
    },
  );

  fastify.get(
    '/content/emails/:id',
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

      const template = await contentService.getEmailTemplate(config, user.tenantId, id);

      if (!template) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Email template not found',
            details: {},
          },
        });
      }

      return { data: template };
    },
  );

  fastify.post(
    '/content/emails',
    {
      preHandler: contentWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'subject', 'body', 'contentType', 'difficulty', 'threatLevel'],
          properties: {
            name: { type: 'string', maxLength: 255 },
            subject: { type: 'string', maxLength: 500 },
            body: { type: 'string' },
            fromName: { type: 'string', maxLength: 255 },
            fromEmail: { type: 'string', maxLength: 255 },
            replyTo: { type: 'string', maxLength: 255 },
            contentType: { type: 'string', maxLength: 50 },
            difficulty: { type: 'integer', minimum: 1, maximum: 5 },
            faction: { type: 'string', maxLength: 50 },
            attackType: { type: 'string', maxLength: 100 },
            threatLevel: { type: 'string', enum: ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'] },
            season: { type: 'integer', minimum: 1 },
            chapter: { type: 'integer', minimum: 1 },
            language: { type: 'string', maxLength: 10 },
            locale: { type: 'string', maxLength: 10 },
            metadata: { type: 'object' },
            isAiGenerated: { type: 'boolean' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as {
        name: string;
        subject: string;
        body: string;
        fromName?: string;
        fromEmail?: string;
        replyTo?: string;
        contentType: string;
        difficulty: number;
        faction?: string;
        attackType?: string;
        threatLevel: string;
        season?: number;
        chapter?: number;
        language?: string;
        locale?: string;
        metadata?: Record<string, unknown>;
        isAiGenerated?: boolean;
        isActive?: boolean;
      };

      const template = await contentService.createEmailTemplateRecord(config, user.tenantId, body);

      return _reply.status(201).send({ data: template });
    },
  );

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
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
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

      const scenarios = await contentService.listScenarios(config, user.tenantId, query);

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

      const scenario = await contentService.getScenario(config, user.tenantId, id);

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
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { type } = request.params as { type: string };

      const templates = await contentService.getDocumentTemplatesByType(
        config,
        user.tenantId,
        type,
      );

      return { data: templates };
    },
  );

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

      const content = await contentService.getLocalizedContentRecord(
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

  fastify.get(
    '/content/seasons',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            seasonNumber: { type: 'integer', minimum: 1 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        seasonNumber?: number;
        isActive?: boolean;
      };

      const seasons = await contentService.listSeasons(config, user.tenantId, query);

      return { data: seasons };
    },
  );

  fastify.get(
    '/content/seasons/:id',
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

      const season = await contentService.getSeason(config, user.tenantId, id);

      if (!season) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Season not found',
            details: {},
          },
        });
      }

      return { data: season };
    },
  );

  fastify.get(
    '/content/chapters/:seasonId',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            seasonId: { type: 'string', format: 'uuid' },
          },
          required: ['seasonId'],
        },
        querystring: {
          type: 'object',
          properties: {
            act: { type: 'integer', minimum: 1, maximum: 3 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { seasonId } = request.params as { seasonId: string };
      const query = request.query as {
        act?: number;
        isActive?: boolean;
      };

      const chapters = await contentService.listChaptersBySeason(
        config,
        user.tenantId,
        seasonId,
        query,
      );

      return { data: chapters };
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
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
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

      const emails = await contentService.listEmailTemplates(config, user.tenantId, filters);

      return { data: emails };
    },
  );

  fastify.get(
    '/content/narrative/scripts/:trigger',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            trigger: { type: 'string', maxLength: 50 },
          },
          required: ['trigger'],
        },
        querystring: {
          type: 'object',
          properties: {
            day: { type: 'integer', minimum: 1 },
            factionKey: { type: 'string', maxLength: 50 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { trigger } = request.params as { trigger: string };
      const query = request.query as {
        day?: number;
        factionKey?: string;
      };

      const messages = await contentService.getMorpheusMessagesByTrigger(
        config,
        user.tenantId,
        trigger,
        query,
      );

      return { data: messages };
    },
  );

  fastify.get(
    '/content/narrative/scripts/key/:key',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            key: { type: 'string', maxLength: 100 },
          },
          required: ['key'],
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
      const { key } = request.params as { key: string };

      const message = await contentService.getMorpheusMessageByKey(config, user.tenantId, key);

      if (!message) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'NARRATIVE_NOT_FOUND',
            message: 'Narrative script not found',
            details: {},
          },
        });
      }

      return { data: message };
    },
  );
};
