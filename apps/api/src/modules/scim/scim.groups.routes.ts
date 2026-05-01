import { oauthGuard, requireReadScope, requireWriteScope } from './scim.auth.js';
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

const scimPatchOpSchema = {
  type: 'object',
  properties: {
    schemas: {
      type: 'array',
      items: { type: 'string' },
    },
    operations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['add', 'replace', 'remove'] },
          path: { type: 'string' },
          value: {},
        },
        required: ['op'],
        additionalProperties: false,
      },
    },
  },
  required: ['schemas', 'operations'],
  additionalProperties: false,
} as const;

const scimGroupPutSchema = {
  type: 'object',
  properties: {
    schemas: { type: 'array', items: { type: 'string' } },
    displayName: { type: 'string' },
    members: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          display: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  required: ['displayName'],
  additionalProperties: false,
} as const;

export const registerGroupsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.get(
    '/scim/v2/Groups',
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
        querystring: {
          type: 'object',
          properties: {
            startIndex: { type: 'integer', minimum: 1 },
            count: { type: 'integer', minimum: 0 },
            filter: { type: 'string' },
          },
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
      const query = request.query as { startIndex?: number; count?: number; filter?: string };

      const listOptions: { startIndex?: number; count?: number; filter?: string } = {};
      if (query.startIndex !== undefined) listOptions.startIndex = query.startIndex;
      if (query.count !== undefined) listOptions.count = query.count;
      if (query.filter !== undefined) listOptions.filter = query.filter;

      return scimService.listScimGroups(
        config,
        client.tenantId,
        Object.keys(listOptions).length > 0 ? listOptions : undefined,
      );
    },
  );

  fastify.get(
    '/scim/v2/Groups/:id',
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
            id: { type: 'string', format: 'uuid' },
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
      const client = request.oauthClient!;
      const { id } = request.params as { id: string };

      return scimService.getScimGroup(config, client.tenantId, id);
    },
  );

  fastify.post(
    '/scim/v2/Groups',
    {
      preHandler: [oauthGuard, requireWriteScope],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 50,
              timeWindow: '1 minute',
            },
      },
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            schemas: { type: 'array', items: { type: 'string' } },
            displayName: { type: 'string' },
          },
          required: ['displayName'],
        },
        response: {
          201: passthroughObjectSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const client = request.oauthClient!;
      const groupData = request.body as {
        schemas?: string[];
        displayName: string;
        members?: Array<{ value: string; display?: string }>;
      };

      const result = await scimService.createScimGroup(config, client.tenantId, {
        displayName: groupData.displayName,
        members: groupData.members,
      });

      reply.code(201);
      return result;
    },
  );

  fastify.put(
    '/scim/v2/Groups/:id',
    {
      preHandler: [oauthGuard, requireWriteScope],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 50,
              timeWindow: '1 minute',
            },
      },
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: scimGroupPutSchema,
        response: {
          200: passthroughObjectSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const client = request.oauthClient!;
      const { id } = request.params as { id: string };
      const groupData = request.body as {
        schemas?: string[];
        displayName: string;
        members?: Array<{ value: string; display?: string }>;
      };

      return scimService.updateScimGroup(config, client.tenantId, id, groupData);
    },
  );

  fastify.patch(
    '/scim/v2/Groups/:id',
    {
      preHandler: [oauthGuard, requireWriteScope],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 50,
              timeWindow: '1 minute',
            },
      },
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: scimPatchOpSchema,
        response: {
          200: passthroughObjectSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const client = request.oauthClient!;
      const { id } = request.params as { id: string };
      const patchData = request.body as {
        schemas: string[];
        operations: Array<{
          op: 'add' | 'replace' | 'remove';
          path?: string;
          value: unknown;
        }>;
      };

      const groupData: Partial<{
        displayName: string;
        members: Array<{ value: string; display?: string }>;
      }> = {};

      for (const op of patchData.operations) {
        if (op.op === 'replace' && op.path === 'displayName') {
          groupData.displayName = op.value as string;
        }
      }

      return scimService.updateScimGroup(config, client.tenantId, id, groupData);
    },
  );

  fastify.delete(
    '/scim/v2/Groups/:id',
    {
      preHandler: [oauthGuard, requireWriteScope],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 50,
              timeWindow: '1 minute',
            },
      },
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
          204: { type: 'null' },
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const client = request.oauthClient!;
      const { id } = request.params as { id: string };

      await scimService.deleteScimGroup(config, client.tenantId, id);
      reply.code(204);
    },
  );
};
