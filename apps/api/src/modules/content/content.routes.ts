import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import * as contentService from './content.service.js';

// eslint-disable-next-line import-x/no-restricted-paths
import type { AuthenticatedUser } from '../game/session/game-session.service.js';
import type { FastifyInstance } from 'fastify';

export const registerContentRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/content/emails',
    {
      preHandler: [tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            contentType: { type: 'string' },
            difficulty: { type: 'integer', minimum: 1, maximum: 5 },
            faction: { type: 'string' },
            threatLevel: { type: 'string', enum: ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'] },
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
          403: errorResponseSchemas.TenantInactive,
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
        threatLevel?: string;
        isActive?: boolean;
      };

      const templates = await contentService.listEmailTemplates(config, user.tenantId, query);

      return { data: templates };
    },
  );

  fastify.get(
    '/content/emails/:id',
    {
      preHandler: [tenantContext, tenantStatusGuard],
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
          403: errorResponseSchemas.TenantInactive,
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
      preHandler: [tenantContext, tenantStatusGuard],
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
          403: errorResponseSchemas.TenantInactive,
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
      preHandler: [tenantContext, tenantStatusGuard],
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
          403: errorResponseSchemas.TenantInactive,
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
      preHandler: [tenantContext, tenantStatusGuard],
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
          403: errorResponseSchemas.TenantInactive,
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
      preHandler: [tenantContext, tenantStatusGuard],
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
          403: errorResponseSchemas.TenantInactive,
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
      preHandler: [tenantContext, tenantStatusGuard],
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
          403: errorResponseSchemas.TenantInactive,
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
};
