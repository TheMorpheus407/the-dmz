import {
  scimServiceProviderConfig,
  scimUserSchemaResource,
  scimGroupSchemaResource,
  scimResourceTypes,
} from './scim.types.js';
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

export const registerScimRoutes = async (fastify: FastifyInstance): Promise<void> => {
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
              patch: { type: 'object', properties: { supported: { type: 'boolean' } } },
              bulk: { type: 'object' },
              filter: { type: 'object' },
              changePassword: { type: 'object' },
              sort: { type: 'object' },
              etag: { type: 'object' },
              authenticationSchemes: { type: 'array' },
            },
          },
          401: errorResponseSchema,
        },
      },
    },
    async () => {
      return scimServiceProviderConfig;
    },
  );

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
          200: { type: 'object' },
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
          200: { type: 'object' },
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
          200: { type: 'object' },
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
          200: { type: 'object' },
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
          201: { type: 'object' },
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
        body: { type: 'object' },
        response: {
          200: { type: 'object' },
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const client = request.oauthClient!;
      const { id } = request.params as { id: string };
      const userData = request.body as Partial<{
        schemas: string[];
        userName: string;
        displayName: string;
        active: boolean;
        name: { givenName?: string; familyName?: string };
      }>;

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
        body: { type: 'object' },
        response: {
          200: { type: 'object' },
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
          200: { type: 'object' },
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
          200: { type: 'object' },
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
          201: { type: 'object' },
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
        body: { type: 'object' },
        response: {
          200: { type: 'object' },
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const client = request.oauthClient!;
      const { id } = request.params as { id: string };
      const groupData = request.body as Partial<{
        schemas: string[];
        displayName: string;
        members: Array<{ value: string; display?: string }>;
      }>;

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
        body: { type: 'object' },
        response: {
          200: { type: 'object' },
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
          200: { type: 'object' },
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
