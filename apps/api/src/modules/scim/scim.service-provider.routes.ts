import { scimServiceProviderConfig } from './scim.types.js';
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

export const registerServiceProviderConfigRoutes = async (
  fastify: FastifyInstance,
): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.get(
    '/scim/v2/ServiceProviderConfig',
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
              documentationUri: { type: 'string' },
              patch: {
                ...passthroughObjectSchema,
                properties: { supported: { type: 'boolean' } },
              },
              bulk: passthroughObjectSchema,
              filter: passthroughObjectSchema,
              changePassword: passthroughObjectSchema,
              sort: passthroughObjectSchema,
              etag: passthroughObjectSchema,
              authenticationSchemes: { type: 'array' },
            },
            additionalProperties: true,
          },
          401: errorResponseSchema,
        },
      },
    },
    async () => {
      return scimServiceProviderConfig;
    },
  );
};
