import { authGuard, requirePermission } from '../../../shared/middleware/authorization.js';
import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import * as difficultyClassifier from '../difficulty-classifier/index.js';

import * as difficultyService from './difficulty.service.js';

// eslint-disable-next-line import-x/no-restricted-paths
import type { AuthenticatedUser } from '../../game/session/game-session.service.js';
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

export const registerDifficultyRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post(
    '/content/classify',
    {
      preHandler: contentWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['subject', 'body'],
          properties: {
            subject: { type: 'string', maxLength: 500 },
            body: { type: 'string' },
            fromName: { type: 'string', maxLength: 255 },
            fromEmail: { type: 'string', maxLength: 255 },
            replyTo: { type: 'string', maxLength: 255 },
            headers: { type: 'object' },
            requestedDifficulty: { type: 'integer', minimum: 1, maximum: 5 },
            emailTemplateId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  difficulty: { type: 'integer' },
                  difficultyName: { type: 'string' },
                  description: { type: 'string' },
                  confidence: { type: 'number' },
                  method: { type: 'string', enum: ['haiku', 'rule-based', 'manual'] },
                  features: { type: 'object' },
                  scores: { type: 'object' },
                  passedQualityGate: { type: 'boolean' },
                },
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
      const body = request.body as {
        subject: string;
        body: string;
        fromName?: string;
        fromEmail?: string;
        replyTo?: string;
        headers?: Record<string, string>;
        requestedDifficulty?: number;
        emailTemplateId?: string;
      };

      const result = difficultyClassifier.classifyDifficulty(body, body.requestedDifficulty);

      if (body.emailTemplateId) {
        await difficultyService.saveDifficultyHistory(config, user.tenantId, {
          emailTemplateId: body.emailTemplateId,
          requestedDifficulty: body.requestedDifficulty,
          classifiedDifficulty: result.difficulty,
          classificationMethod: result.method,
          confidence: result.confidence,
          metadata: { features: result.features, scores: result.scores },
        });

        await difficultyService.saveEmailFeatures(config, user.tenantId, {
          emailTemplateId: body.emailTemplateId,
          indicatorCount: result.features.indicatorCount,
          wordCount: result.features.wordCount,
          hasSpoofedHeaders: result.features.hasSpoofedHeaders,
          impersonationQuality: result.features.impersonationQuality,
          hasVerificationHooks: result.features.hasVerificationHooks,
          emotionalManipulationLevel: result.features.emotionalManipulationLevel,
          grammarComplexity: result.features.grammarComplexity,
        });
      }

      return _reply.status(201).send({ data: result });
    },
  );

  fastify.get(
    '/content/difficulty/:tier',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            tier: { type: 'integer', minimum: 1, maximum: 5 },
          },
          required: ['tier'],
        },
        querystring: {
          type: 'object',
          properties: {
            classificationMethod: { type: 'string', enum: ['haiku', 'rule-based', 'manual'] },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    tenantId: { type: 'string', format: 'uuid' },
                    emailTemplateId: { type: 'string', format: 'uuid' },
                    requestedDifficulty: { type: 'integer' },
                    classifiedDifficulty: { type: 'integer' },
                    classificationMethod: { type: 'string' },
                    confidence: { type: 'number' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
          400: errorResponseSchemas.BadRequest,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { tier } = request.params as { tier: string };
      const query = request.query as {
        classificationMethod?: 'haiku' | 'rule-based' | 'manual';
        limit?: number;
      };

      const difficultyTier = parseInt(tier, 10);
      if (isNaN(difficultyTier) || difficultyTier < 1 || difficultyTier > 5) {
        return _reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_TIER',
            message: 'Tier must be a number between 1 and 5',
            details: {},
          },
        });
      }

      const history = await difficultyService.getDifficultyHistoryByTier(
        config,
        user.tenantId,
        difficultyTier,
        query,
      );

      return { data: history };
    },
  );

  fastify.get(
    '/content/features/:id',
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
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  tenantId: { type: 'string', format: 'uuid' },
                  emailTemplateId: { type: 'string', format: 'uuid' },
                  indicatorCount: { type: 'integer' },
                  wordCount: { type: 'integer' },
                  hasSpoofedHeaders: { type: 'boolean' },
                  impersonationQuality: { type: 'number' },
                  hasVerificationHooks: { type: 'boolean' },
                  emotionalManipulationLevel: { type: 'number' },
                  grammarComplexity: { type: 'number' },
                  metadata: { type: 'object' },
                  createdAt: { type: 'string' },
                },
              },
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

      const features = await difficultyService.getEmailFeaturesById(config, user.tenantId, id);

      if (!features) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'FEATURES_NOT_FOUND',
            message: 'Email features not found',
            details: {},
          },
        });
      }

      return { data: features };
    },
  );

  fastify.get(
    '/content/classification/stats',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  byDifficulty: { type: 'object' },
                  byMethod: { type: 'object' },
                  averageConfidence: { type: 'number' },
                },
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

      const stats = await difficultyService.getClassificationStats(config, user.tenantId);

      return { data: stats };
    },
  );
};
