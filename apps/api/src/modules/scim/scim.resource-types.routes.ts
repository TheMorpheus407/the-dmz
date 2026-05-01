import { scimResourceTypes } from './scim.types.js';
import { oauthGuard } from './scim.auth.js';

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

export const registerResourceTypesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.get(
    '/scim/v2/ResourceTypes',
    {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      preHandler: oauthGuard,
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
        },
      },
    },
    async () => {
      return {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: scimResourceTypes,
      };
    },
  );

  fastify.get(
    '/scim/v2/ResourceTypes/:id',
    {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      preHandler: oauthGuard,
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
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const resourceType = scimResourceTypes.find((rt) => rt.name === id);
      if (!resourceType) {
        throw new Error('ResourceType not found');
      }

      return resourceType;
    },
  );
};
