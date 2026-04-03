import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  contentWriteRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';

import * as emailTemplatesService from './email-templates.service.js';

import type { AuthenticatedUser } from '../../game/session/index.js';
import type { FastifyInstance } from 'fastify';

export const registerEmailTemplateRoutes = async (fastify: FastifyInstance): Promise<void> => {
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

      const templates = await emailTemplatesService.listEmailTemplates(
        config,
        user.tenantId,
        query,
      );

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

      const template = await emailTemplatesService.getEmailTemplate(config, user.tenantId, id);

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

      const template = await emailTemplatesService.createEmailTemplateRecord(
        config,
        user.tenantId,
        body,
      );

      return _reply.status(201).send({ data: template });
    },
  );
};
