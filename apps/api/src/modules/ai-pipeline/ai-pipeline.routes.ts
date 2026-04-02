import { notFound } from '../../shared/middleware/error-handler.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import {
  adminReadRoutePreHandlers,
  adminWriteRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../shared/routes/content-routes-config.js';

import {
  fictionalFactions,
  promptTemplateCategories,
  semanticVersionPattern,
} from './ai-pipeline.types.js';

import type { FastifyInstance } from 'fastify';
import type { AiPipelineService } from './ai-pipeline.types.js';

type RouteUser = {
  tenantId: string;
  userId: string;
};

const emailGenerationCategories = ['email_phishing', 'email_legitimate'] as const;
const threatLevels = ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'] as const;

const asNullable = <T extends Record<string, unknown>>(schema: T) =>
  ({
    anyOf: [{ type: 'null' }, schema],
  }) as const;

const promptTemplateBodyProperties = {
  name: { type: 'string', minLength: 1, maxLength: 255 },
  category: { type: 'string', enum: [...promptTemplateCategories] },
  description: asNullable({ type: 'string' }),
  attackType: asNullable({ type: 'string', maxLength: 100 }),
  threatLevel: asNullable({ type: 'string', enum: [...threatLevels] }),
  difficulty: asNullable({ type: 'integer', minimum: 1, maximum: 5 }),
  season: asNullable({ type: 'integer', minimum: 1 }),
  chapter: asNullable({ type: 'integer', minimum: 1 }),
  systemPrompt: { type: 'string', minLength: 1 },
  userTemplate: { type: 'string', minLength: 1 },
  outputSchema: { type: 'object', additionalProperties: true, minProperties: 1 },
  version: {
    type: 'string',
    minLength: 5,
    maxLength: 32,
    pattern: semanticVersionPattern,
  },
  tokenBudget: { type: 'integer', minimum: 1, maximum: 8_192 },
  metadata: { type: 'object', additionalProperties: true },
  isActive: { type: 'boolean' },
} as const;

export const aiPromptTemplateCreateBodyJsonSchema = {
  type: 'object',
  required: ['name', 'category', 'systemPrompt', 'userTemplate', 'outputSchema', 'version'],
  properties: promptTemplateBodyProperties,
  additionalProperties: false,
} as const;

export const aiPromptTemplateUpdateBodyJsonSchema = {
  type: 'object',
  properties: promptTemplateBodyProperties,
  additionalProperties: false,
} as const;

const generationBodyProperties = {
  templateId: { type: 'string', format: 'uuid' },
  templateName: { type: 'string', minLength: 1, maxLength: 255 },
  contentName: { type: 'string', minLength: 1, maxLength: 255 },
  threatLevel: { type: 'string', enum: [...threatLevels] },
  difficulty: { type: 'integer', minimum: 1, maximum: 5 },
  faction: { type: 'string', enum: [...fictionalFactions] },
  attackType: { type: 'string', maxLength: 100 },
  season: { type: 'integer', minimum: 1 },
  chapter: { type: 'integer', minimum: 1 },
  language: { type: 'string', maxLength: 10 },
  locale: { type: 'string', maxLength: 10 },
  context: { type: 'object', additionalProperties: true },
} as const;

export const aiPromptTemplateJsonSchema = {
  type: 'object',
  additionalProperties: true,
} as const;

export const aiPromptTemplateListQueryJsonSchema = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: [...promptTemplateCategories] },
    name: { type: 'string' },
    version: { type: 'string', pattern: semanticVersionPattern },
    isActive: { type: 'boolean' },
    attackType: { type: 'string', maxLength: 100 },
    threatLevel: { type: 'string', enum: [...threatLevels] },
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    season: { type: 'integer', minimum: 1 },
    chapter: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
} as const;

export const aiPromptTemplatePathParamsJsonSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

export const aiPromptTemplateListResponseJsonSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: aiPromptTemplateJsonSchema,
    },
  },
} as const;

export const aiPromptTemplateResponseJsonSchema = {
  type: 'object',
  properties: {
    data: aiPromptTemplateJsonSchema,
  },
} as const;

export const aiGenerationResponseJsonSchema = {
  type: 'object',
  properties: {
    data: { type: 'object', additionalProperties: true },
  },
} as const;

export const aiEmailGenerationBodyJsonSchema = {
  type: 'object',
  required: ['category'],
  properties: {
    category: { type: 'string', enum: [...emailGenerationCategories] },
    ...generationBodyProperties,
  },
  additionalProperties: false,
} as const;

export const aiIntelBriefGenerationBodyJsonSchema = {
  type: 'object',
  properties: {
    ...generationBodyProperties,
  },
  additionalProperties: false,
} as const;

export const aiScenarioVariationGenerationBodyJsonSchema = {
  type: 'object',
  properties: {
    ...generationBodyProperties,
  },
  additionalProperties: false,
} as const;

export const registerAiPipelineRoutes = async (
  fastify: FastifyInstance,
  service: AiPipelineService,
): Promise<void> => {
  fastify.get(
    '/ai/prompt-templates',
    {
      preHandler: adminReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: aiPromptTemplateListQueryJsonSchema,
        response: {
          200: aiPromptTemplateListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as RouteUser;
      const query = request.query as Parameters<AiPipelineService['listPromptTemplates']>[1];

      return {
        data: await service.listPromptTemplates(user.tenantId, query),
      };
    },
  );

  fastify.get(
    '/ai/prompt-templates/:id',
    {
      preHandler: adminReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: aiPromptTemplatePathParamsJsonSchema,
        response: {
          200: aiPromptTemplateResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (request) => {
      const user = request.user as RouteUser;
      const { id } = request.params as { id: string };
      const template = await service.getPromptTemplate(user.tenantId, id);

      if (!template) {
        throw notFound('Prompt template not found', { promptTemplateId: id });
      }

      return { data: template };
    },
  );

  fastify.post(
    '/ai/prompt-templates',
    {
      preHandler: adminWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: aiPromptTemplateCreateBodyJsonSchema,
        response: {
          201: aiPromptTemplateResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          409: errorResponseSchemas.Conflict,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as RouteUser;
      const body = request.body as Parameters<AiPipelineService['createPromptTemplate']>[1];

      const template = await service.createPromptTemplate(user.tenantId, body);
      return reply.status(201).send({ data: template });
    },
  );

  fastify.patch(
    '/ai/prompt-templates/:id',
    {
      preHandler: adminWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: aiPromptTemplatePathParamsJsonSchema,
        body: aiPromptTemplateUpdateBodyJsonSchema,
        response: {
          200: aiPromptTemplateResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          404: errorResponseSchemas.NotFound,
          409: errorResponseSchemas.Conflict,
        },
      },
    },
    async (request) => {
      const user = request.user as RouteUser;
      const { id } = request.params as { id: string };
      const body = request.body as Parameters<AiPipelineService['updatePromptTemplate']>[2];
      const template = await service.updatePromptTemplate(user.tenantId, id, body);

      if (!template) {
        throw notFound('Prompt template not found', { promptTemplateId: id });
      }

      return { data: template };
    },
  );

  fastify.delete(
    '/ai/prompt-templates/:id',
    {
      preHandler: adminWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: aiPromptTemplatePathParamsJsonSchema,
        response: {
          204: { type: 'null' },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as RouteUser;
      const { id } = request.params as { id: string };
      const deleted = await service.deletePromptTemplate(user.tenantId, id);

      if (!deleted) {
        throw notFound('Prompt template not found', { promptTemplateId: id });
      }

      return reply.status(204).send();
    },
  );

  fastify.post(
    '/ai/generate/email',
    {
      preHandler: adminWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: aiEmailGenerationBodyJsonSchema,
        response: {
          201: aiGenerationResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as RouteUser;
      const body = request.body as Parameters<AiPipelineService['generateEmail']>[2];
      const generated = await service.generateEmail(user.tenantId, user.userId, body);

      return reply.status(201).send({ data: generated });
    },
  );

  fastify.post(
    '/ai/generate/intel-brief',
    {
      preHandler: adminWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: aiIntelBriefGenerationBodyJsonSchema,
        response: {
          201: aiGenerationResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as RouteUser;
      const body = request.body as Parameters<AiPipelineService['generateIntelBrief']>[2];
      const generated = await service.generateIntelBrief(user.tenantId, user.userId, body);

      return reply.status(201).send({ data: generated });
    },
  );

  fastify.post(
    '/ai/generate/scenario-variation',
    {
      preHandler: adminWriteRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: aiScenarioVariationGenerationBodyJsonSchema,
        response: {
          201: aiGenerationResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as RouteUser;
      const body = request.body as Parameters<AiPipelineService['generateScenarioVariation']>[2];
      const generated = await service.generateScenarioVariation(user.tenantId, user.userId, body);

      return reply.status(201).send({ data: generated });
    },
  );
};
