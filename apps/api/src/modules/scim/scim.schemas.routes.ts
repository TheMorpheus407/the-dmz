import { scimUserSchemaResource, scimGroupSchemaResource } from './scim.types.js';
import { oauthGuard, requireReadScope } from './scim.auth.js';

import type { FastifyInstance } from 'fastify';

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

const passthroughObjectSchema = {
  type: 'object',
  additionalProperties: true,
} as const;

export const registerSchemasRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.get(
    '/scim/v2/Schemas',
    {
      preHandler: [oauthGuard, requireReadScope],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 100,
              timeWindow: '1 minute',
            },
      },
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              schemas: { type: 'array', items: { type: 'string' } },
              Resources: { type: 'array' },
            },
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async () => {
      return {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: [scimUserSchemaResource, scimGroupSchemaResource],
      };
    },
  );

  fastify.get(
    '/scim/v2/Schemas/:id',
    {
      preHandler: [oauthGuard, requireReadScope],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 100,
              timeWindow: '1 minute',
            },
      },
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: passthroughObjectSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };

      if (id === 'urn:ietf:params:scim:schemas:core:2.0:User') {
        return scimUserSchemaResource;
      }
      if (id === 'urn:ietf:params:scim:schemas:core:2.0:Group') {
        return scimGroupSchemaResource;
      }

      throw new Error('Schema not found');
    },
  );
};
