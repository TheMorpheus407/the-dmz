import { oauthGuard, requireWriteScope } from './scim.auth.js';
import * as scimService from './scim.service.js';

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

export const registerBulkRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.post(
    '/scim/v2/Bulk',
    {
      preHandler: [oauthGuard, requireWriteScope],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            schemas: { type: 'array', items: { type: 'string' } },
            failOnErrors: { type: 'integer' },
            operations: { type: 'array' },
          },
          required: ['operations'],
        },
        response: {
          200: passthroughObjectSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const client = request.oauthClient!;
      const bulkRequest = request.body as {
        schemas?: string[];
        failOnErrors?: number;
        operations: Array<{
          method: string;
          path: string;
          bulkId?: string;
          data?: unknown;
        }>;
      };

      return scimService.processBulkRequest(config, client.tenantId, {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkRequest'],
        failOnErrors: bulkRequest.failOnErrors ?? 1,
        operations: bulkRequest.operations as never,
      });
    },
  );
};
