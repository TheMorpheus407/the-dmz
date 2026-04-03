import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { ErrorCodes } from '@the-dmz/shared/constants';

import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import * as scimService from '../scim/index.js';
import { SCIMError } from '../scim/index.js';

interface TokenIdParams {
  id: string;
}

interface CreateScimTokenBody {
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}

interface RotateScimTokenBody {
  expiresInDays?: number;
}

export const scimTokenResponseJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    scopes: { type: 'array', items: { type: 'string' } },
    expiresAt: { type: ['string', 'null'], format: 'date-time' },
    lastUsedAt: { type: ['string', 'null'], format: 'date-time' },
    isRevoked: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const scimTokenListResponseJsonSchema = {
  type: 'object',
  properties: {
    tokens: {
      type: 'array',
      items: scimTokenResponseJsonSchema,
    },
  },
} as const;

export const scimTokenWithSecretResponseJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    token: { type: 'string' },
    scopes: { type: 'array', items: { type: 'string' } },
    expiresAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const scimTestConnectionResponseJsonSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

export const scimTestProvisioningResponseJsonSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    testUserId: { type: ['string', 'null'] },
  },
} as const;

export const scimSyncStatusResponseJsonSchema = {
  type: 'object',
  properties: {
    lastSync: { type: ['string', 'null'], format: 'date-time' },
    status: { type: 'string' },
    stats: {
      type: 'object',
      properties: {
        usersCreated: { type: 'integer' },
        usersUpdated: { type: 'integer' },
        usersDeleted: { type: 'integer' },
        groupsCreated: { type: 'integer' },
        groupsUpdated: { type: 'integer' },
        groupsDeleted: { type: 'integer' },
        errors: { type: 'array' },
      },
    },
  },
} as const;

export const registerAdminSCIMRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/admin/scim/tokens',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'read')],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: scimTokenListResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const tokens = await scimService.listScimTokens(
          request.server.config,
          tenantContext.tenantId,
        );

        return {
          tokens: tokens.map((t) => ({
            id: t.id,
            name: t.name,
            scopes: t.scopes,
            expiresAt: t.expiresAt?.toISOString() ?? null,
            lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
            isRevoked: t.isRevoked,
            createdAt: t.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to retrieve SCIM tokens',
          500,
        );
      }
    },
  );

  fastify.post<{ Body: CreateScimTokenBody }>(
    '/admin/scim/tokens',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'write')],
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            scopes: { type: 'array', items: { type: 'string' } },
            expiresInDays: { type: 'integer', minimum: 1 },
          },
          required: ['name'],
        },
        response: {
          200: scimTokenWithSecretResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateScimTokenBody }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { name, scopes, expiresInDays } = request.body;

        const result = await scimService.generateScimToken(
          request.server.config,
          tenantContext.tenantId,
          name,
          scopes,
          expiresInDays,
        );

        const tokens = await scimService.listScimTokens(
          request.server.config,
          tenantContext.tenantId,
        );
        const createdToken = tokens.find((t) => t.id === result.tokenId);

        return {
          id: result.tokenId,
          name,
          token: result.token,
          scopes: scopes ?? ['scim.read', 'scim.write'],
          expiresAt: createdToken?.expiresAt?.toISOString() ?? null,
          createdAt: createdToken?.createdAt.toISOString() ?? new Date().toISOString(),
        };
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to generate SCIM token',
          500,
        );
      }
    },
  );

  fastify.delete<{ Params: TokenIdParams }>(
    '/admin/scim/tokens/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'write')],
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
              success: { type: 'boolean' },
            },
          },
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Params: TokenIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;

        await scimService.revokeScimToken(request.server.config, tenantContext.tenantId, id);

        return { success: true };
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to revoke SCIM token',
          500,
        );
      }
    },
  );

  fastify.post<{ Params: TokenIdParams; Body: RotateScimTokenBody }>(
    '/admin/scim/tokens/:id/rotate',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'write')],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            expiresInDays: { type: 'integer', minimum: 1 },
          },
        },
        response: {
          200: scimTokenWithSecretResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: TokenIdParams; Body: RotateScimTokenBody }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;
        const { expiresInDays } = request.body ?? {};

        const result = await scimService.rotateScimToken(
          request.server.config,
          tenantContext.tenantId,
          id,
          expiresInDays,
        );

        const tokens = await scimService.listScimTokens(
          request.server.config,
          tenantContext.tenantId,
        );
        const newToken = tokens.find((t) => t.id === result.tokenId);

        const oldTokens = await scimService.listScimTokens(
          request.server.config,
          tenantContext.tenantId,
        );
        const oldToken = oldTokens.find((t) => t.id === id);

        return {
          id: result.tokenId,
          name: oldToken?.name ? `${oldToken.name} (rotated)` : 'Rotated Token',
          token: result.token,
          scopes: oldToken?.scopes ?? ['scim.read', 'scim.write'],
          expiresAt: newToken?.expiresAt?.toISOString() ?? null,
          createdAt: newToken?.createdAt.toISOString() ?? new Date().toISOString(),
        };
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to rotate SCIM token',
          500,
        );
      }
    },
  );

  fastify.post<{ Params: TokenIdParams }>(
    '/admin/scim/test/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'read')],
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
          200: scimTestConnectionResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Params: TokenIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;

        const result = await scimService.testScimConnection(
          request.server.config,
          tenantContext.tenantId,
          id,
        );

        return result;
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to test SCIM connection',
          500,
        );
      }
    },
  );

  fastify.post<{ Params: TokenIdParams }>(
    '/admin/scim/provisioning-test/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'read')],
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
          200: scimTestProvisioningResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Params: TokenIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;

        const result = await scimService.testScimProvisioning(
          request.server.config,
          tenantContext.tenantId,
          id,
        );

        return result;
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to test SCIM provisioning',
          500,
        );
      }
    },
  );

  fastify.get(
    '/admin/scim/sync-status',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'read')],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: scimSyncStatusResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await scimService.getScimSyncStatus(
          request.server.config,
          tenantContext.tenantId,
        );

        return {
          lastSync: result.lastSync?.toISOString() ?? null,
          status: result.status,
          stats: result.stats,
        };
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to get SCIM sync status',
          500,
        );
      }
    },
  );

  fastify.get(
    '/admin/scim/group-mappings',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'read')],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    displayName: { type: 'string' },
                    roleId: { type: ['string', 'null'] },
                    roleName: { type: ['string', 'null'] },
                    membersCount: { type: 'integer' },
                  },
                },
              },
              roles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const groups = await scimService.listScimGroupsWithRoles(
          request.server.config,
          tenantContext.tenantId,
        );

        const roles = await scimService.listRoles(request.server.config, tenantContext.tenantId);

        return { groups, roles };
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to get SCIM group mappings',
          500,
        );
      }
    },
  );

  interface GroupRoleBody {
    roleId: string | null;
  }

  fastify.patch<{ Params: TokenIdParams; Body: GroupRoleBody }>(
    '/admin/scim/group-mappings/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('scim', 'write')],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            roleId: { type: ['string', 'null'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: TokenIdParams; Body: GroupRoleBody }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;
        const { roleId } = request.body ?? {};

        await scimService.updateScimGroupRole(
          request.server.config,
          tenantContext.tenantId,
          id,
          roleId ?? null,
        );

        return { success: true };
      } catch (error) {
        throw new SCIMError(
          ErrorCodes.SCIM_INVALID_REQUEST,
          error instanceof Error ? error.message : 'Failed to update SCIM group role mapping',
          500,
        );
      }
    },
  );
};
