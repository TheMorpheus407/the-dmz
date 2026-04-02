import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  contentWriteRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';
import { scoreEmail, scoreBatch } from '../quality-scorer/index.js';

import * as qualityService from './quality.service.js';

// eslint-disable-next-line import-x/no-restricted-paths
import type { AuthenticatedUser } from '../../game/session/game-session.service.js';
import type { FastifyInstance } from 'fastify';

export const registerQualityRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post(
    '/content/quality/score',
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
            faction: { type: 'string', maxLength: 50 },
            attackType: { type: 'string', maxLength: 100 },
            difficulty: { type: 'integer', minimum: 1, maximum: 5 },
            emailTemplateId: { type: 'string', format: 'uuid' },
            worldState: {
              type: 'object',
              properties: {
                day: { type: 'integer', minimum: 1 },
                threatLevel: {
                  type: 'string',
                  enum: ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'],
                },
                facilityTier: { type: 'integer', minimum: 1, maximum: 5 },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  overall: { type: 'integer' },
                  breakdown: { type: 'object' },
                  flags: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } },
                  status: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
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
        faction?: string;
        attackType?: string;
        difficulty?: number;
        emailTemplateId?: string;
        worldState?: {
          day?: number;
          threatLevel?: string;
          facilityTier?: number;
        };
      };

      const result = scoreEmail({
        subject: body.subject,
        body: body.body,
        fromName: body.fromName ?? undefined,
        fromEmail: body.fromEmail ?? undefined,
        replyTo: body.replyTo ?? undefined,
        headers: body.headers ?? undefined,
        faction: body.faction ?? undefined,
        attackType: body.attackType ?? undefined,
        difficulty: body.difficulty ?? undefined,
        worldState: body.worldState ?? undefined,
      });

      if (body.emailTemplateId) {
        await qualityService.saveQualityScore(config, user.tenantId, {
          emailTemplateId: body.emailTemplateId,
          overallScore: result.overall,
          narrativePlausibility: result.breakdown.narrativePlausibility,
          grammarClarity: result.breakdown.grammarClarity,
          attackAlignment: result.breakdown.attackAlignment,
          signalDiversity: result.breakdown.signalDiversity,
          learnability: result.breakdown.learnability,
          flags: result.flags,
          recommendations: result.recommendations,
          status: result.status,
        });
      }

      return _reply.status(201).send({ data: result });
    },
  );

  fastify.post(
    '/content/quality/batch',
    {
      preHandler: contentWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['emails'],
          properties: {
            emails: {
              type: 'array',
              items: {
                type: 'object',
                required: ['subject', 'body'],
                properties: {
                  subject: { type: 'string', maxLength: 500 },
                  body: { type: 'string' },
                  fromName: { type: 'string', maxLength: 255 },
                  fromEmail: { type: 'string', maxLength: 255 },
                  replyTo: { type: 'string', maxLength: 255 },
                  headers: { type: 'object' },
                  faction: { type: 'string', maxLength: 50 },
                  attackType: { type: 'string', maxLength: 100 },
                  difficulty: { type: 'integer', minimum: 1, maximum: 5 },
                  worldState: {
                    type: 'object',
                    properties: {
                      day: { type: 'integer', minimum: 1 },
                      threatLevel: { type: 'string' },
                      facilityTier: { type: 'integer', minimum: 1, maximum: 5 },
                    },
                  },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    overall: { type: 'integer' },
                    breakdown: { type: 'object' },
                    flags: { type: 'array', items: { type: 'string' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string' },
                  },
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
      const body = request.body as {
        emails: Array<{
          subject: string;
          body: string;
          fromName?: string;
          fromEmail?: string;
          replyTo?: string;
          headers?: Record<string, string>;
          faction?: string;
          attackType?: string;
          difficulty?: number;
          worldState?: {
            day?: number;
            threatLevel?: string;
            facilityTier?: number;
          };
        }>;
      };

      const results = scoreBatch(body.emails);

      return _reply.status(201).send({ data: results });
    },
  );

  fastify.get(
    '/content/quality/:emailId',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            emailId: { type: 'string', format: 'uuid' },
          },
          required: ['emailId'],
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
      const { emailId } = request.params as { emailId: string };

      const score = await qualityService.getQualityScoreByEmailId(config, user.tenantId, emailId);

      if (!score) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'QUALITY_SCORE_NOT_FOUND',
            message: 'Quality score not found for this email',
            details: {},
          },
        });
      }

      const flags = await qualityService.getQualityFlagsByScoreId(config, user.tenantId, score.id);

      return { data: { ...score, flags } };
    },
  );

  fastify.get(
    '/content/quality/stats',
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
                  byStatus: { type: 'object' },
                  averageScore: { type: 'number' },
                  byDimension: { type: 'object' },
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

      const stats = await qualityService.getQualityStats(config, user.tenantId);

      return { data: stats };
    },
  );

  fastify.get(
    '/content/quality/history/:emailId',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            emailId: { type: 'string', format: 'uuid' },
          },
          required: ['emailId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
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
      const { emailId } = request.params as { emailId: string };
      const query = request.query as { limit?: number };

      const history = await qualityService.getQualityHistoryByEmailId(
        config,
        user.tenantId,
        emailId,
        query.limit,
      );

      return { data: history };
    },
  );
};
