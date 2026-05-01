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

const scimUserPutSchema = {
  type: 'object',
  properties: {
    schemas: { type: 'array', items: { type: 'string' } },
    userName: { type: 'string' },
    displayName: { type: 'string' },
    active: { type: 'boolean' },
    name: {
      type: 'object',
      properties: {
        givenName: { type: 'string' },
        familyName: { type: 'string' },
      },
      additionalProperties: false,
    },
    emails: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          type: { type: 'string' },
          primary: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  },
  required: ['userName'],
  additionalProperties: false,
} as const;

export const registerUsersRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.get(
    '/scim/v2/Users',
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

      return scimService.listScimUsers(
        config,
        client.tenantId,
        Object.keys(listOptions).length > 0 ? listOptions : undefined,
      );
    },
  );

  fastify.get(
    '/scim/v2/Users/:id',
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

      return scimService.getScimUser(config, client.tenantId, id);
    },
  );

  fastify.post(
    '/scim/v2/Users',
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
            userName: { type: 'string' },
            displayName: { type: 'string' },
            active: { type: 'boolean' },
            emails: { type: 'array' },
          },
          required: ['userName'],
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
      const userData = request.body as {
        schemas?: string[];
        userName: string;
        displayName?: string;
        active?: boolean;
        name?: { givenName?: string; familyName?: string };
        emails?: Array<{ value: string; primary?: boolean }>;
      };

      const result = await scimService.createScimUser(config, client.tenantId, {
        userName: userData.userName,
        displayName: userData.displayName,
        active: userData.active,
        name: userData.name,
        emails: userData.emails,
      });

      reply.code(201);
      return result;
    },
  );

  fastify.put(
    '/scim/v2/Users/:id',
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
        body: scimUserPutSchema,
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
      const userData = request.body as {
        schemas?: string[];
        userName: string;
        displayName?: string;
        active?: boolean;
        name?: { givenName?: string; familyName?: string };
        emails?: Array<{ value: string; type?: string; primary?: boolean }>;
      };

      return scimService.updateScimUser(config, client.tenantId, id, userData);
    },
  );

  fastify.patch(
    '/scim/v2/Users/:id',
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

      const userData: Partial<{
        userName: string;
        displayName: string;
        active: boolean;
        name: { givenName?: string; familyName?: string };
      }> = {};

      for (const op of patchData.operations) {
        if (op.op === 'replace' && op.path) {
          if (op.path === 'userName') {
            userData.userName = op.value as string;
          } else if (op.path === 'displayName') {
            userData.displayName = op.value as string;
          } else if (op.path === 'active') {
            userData.active = op.value as boolean;
          } else if (op.path === 'name.givenName') {
            userData.name = { ...userData.name, givenName: op.value as string };
          } else if (op.path === 'name.familyName') {
            userData.name = { ...userData.name, familyName: op.value as string };
          }
        }
      }

      return scimService.updateScimUser(config, client.tenantId, id, userData);
    },
  );

  fastify.delete(
    '/scim/v2/Users/:id',
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

      await scimService.deleteScimUser(config, client.tenantId, id);
      reply.code(204);
    },
  );
};
