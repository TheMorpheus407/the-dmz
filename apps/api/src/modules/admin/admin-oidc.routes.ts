import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { ErrorCodes } from '@the-dmz/shared/constants';

import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import * as ssoService from '../auth/index.js';
import { SSOError } from '../auth/index.js';

import type { RoleMappingRule } from '../../db/schema/auth/sso-connections.js';

interface OIDCProviderIdParams {
  id: string;
}

interface CreateOIDCProviderBody {
  name: string;
  metadataUrl: string;
  clientId: string;
  clientSecret: string;
}

interface UpdateOIDCProviderBody {
  name?: string;
  metadataUrl?: string;
  clientId?: string;
  clientSecret?: string | null;
  isActive?: boolean;
  roleMappingRules?: RoleMappingRule[] | null;
  defaultRole?: string;
}

export const oidcConfigResponseJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    provider: { type: 'string', enum: ['oidc'] },
    metadataUrl: { type: 'string', format: 'uri' },
    clientId: { type: 'string' },
    isActive: { type: 'boolean' },
    roleMappingRules: { type: ['object', 'null'] },
    defaultRole: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const oidcConfigListResponseJsonSchema = {
  type: 'object',
  properties: {
    providers: {
      type: 'array',
      items: oidcConfigResponseJsonSchema,
    },
  },
} as const;

export const oidcTestConnectionResponseJsonSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

export const registerAdminOIDCRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Params: OIDCProviderIdParams }>(
    '/admin/oidc/config',
    {
      preHandler: [authGuard, tenantContext, requirePermission('oidc', 'read')],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: oidcConfigListResponseJsonSchema,
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
        const providers = await ssoService.getActiveSSOProviders(tenantContext.tenantId);

        const oidcProviders = providers
          .filter((p) => p.provider === 'oidc')
          .map((p) => ({
            id: p.id,
            tenantId: p.tenantId,
            name: p.name,
            provider: 'oidc' as const,
            metadataUrl: p.metadataUrl,
            clientId: p.clientId,
            isActive: p.isActive,
            roleMappingRules: p.roleMappingRules,
            defaultRole: p.defaultRole || 'learner',
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          }));

        return {
          providers: oidcProviders,
        };
      } catch (error) {
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to retrieve OIDC configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.post<{ Body: CreateOIDCProviderBody }>(
    '/admin/oidc/config',
    {
      preHandler: [authGuard, tenantContext, requirePermission('oidc', 'write')],
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            metadataUrl: { type: 'string', format: 'uri' },
            clientId: { type: 'string', maxLength: 255 },
            clientSecret: { type: 'string', minLength: 1 },
          },
          required: ['name', 'metadataUrl', 'clientId', 'clientSecret'],
        },
        response: {
          200: oidcConfigResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateOIDCProviderBody }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { name, metadataUrl, clientId, clientSecret } = request.body;

        const provider = await ssoService.createOIDCProvider({
          tenantId: tenantContext.tenantId,
          name,
          metadataUrl,
          clientId,
          clientSecret,
        });

        return {
          id: provider.id,
          tenantId: provider.tenantId,
          name: provider.name,
          provider: 'oidc' as const,
          metadataUrl: provider.metadataUrl,
          clientId: provider.clientId,
          isActive: provider.isActive,
          roleMappingRules: provider.roleMappingRules,
          defaultRole: provider.defaultRole || 'learner',
          createdAt: provider.createdAt.toISOString(),
          updatedAt: provider.updatedAt.toISOString(),
        };
      } catch (error) {
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to create OIDC configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.get<{ Params: OIDCProviderIdParams }>(
    '/admin/oidc/config/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('oidc', 'read')],
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
          200: oidcConfigResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Params: OIDCProviderIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;

        const provider = await ssoService.getSSOProvider(id, tenantContext.tenantId);

        if (!provider || provider.provider !== 'oidc') {
          throw new SSOError({
            message: 'OIDC provider not found',
            code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
            statusCode: 404,
          });
        }

        return {
          id: provider.id,
          tenantId: provider.tenantId,
          name: provider.name,
          provider: 'oidc' as const,
          metadataUrl: provider.metadataUrl,
          clientId: provider.clientId,
          isActive: provider.isActive,
          roleMappingRules: provider.roleMappingRules,
          defaultRole: provider.defaultRole || 'learner',
          createdAt: provider.createdAt.toISOString(),
          updatedAt: provider.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof SSOError) {
          throw error;
        }
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to retrieve OIDC configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.put<{ Params: OIDCProviderIdParams; Body: UpdateOIDCProviderBody }>(
    '/admin/oidc/config/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('oidc', 'write')],
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
            name: { type: 'string', maxLength: 255 },
            metadataUrl: { type: 'string', format: 'uri' },
            clientId: { type: 'string', maxLength: 255 },
            clientSecret: { type: 'string' },
            isActive: { type: 'boolean' },
            roleMappingRules: { type: ['array', 'null'] },
            defaultRole: { type: 'string' },
          },
        },
        response: {
          200: oidcConfigResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: OIDCProviderIdParams; Body: UpdateOIDCProviderBody }>,
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

        const provider = await ssoService.updateOIDCProvider(
          id,
          tenantContext.tenantId,
          request.body,
        );

        if (!provider) {
          throw new SSOError({
            message: 'OIDC provider not found',
            code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
            statusCode: 404,
          });
        }

        return {
          id: provider.id,
          tenantId: provider.tenantId,
          name: provider.name,
          provider: 'oidc' as const,
          metadataUrl: provider.metadataUrl,
          clientId: provider.clientId,
          isActive: provider.isActive,
          roleMappingRules: provider.roleMappingRules,
          defaultRole: provider.defaultRole || 'learner',
          createdAt: provider.createdAt.toISOString(),
          updatedAt: provider.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof SSOError) {
          throw error;
        }
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to update OIDC configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.delete<{ Params: OIDCProviderIdParams }>(
    '/admin/oidc/config/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('oidc', 'write')],
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
    async (request: FastifyRequest<{ Params: OIDCProviderIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;

        const deleted = await ssoService.deleteOIDCProvider(id, tenantContext.tenantId);

        if (!deleted) {
          throw new SSOError({
            message: 'OIDC provider not found',
            code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
            statusCode: 404,
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof SSOError) {
          throw error;
        }
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to delete OIDC configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.post<{ Params: OIDCProviderIdParams }>(
    '/admin/oidc/test/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('oidc', 'read')],
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
          200: oidcTestConnectionResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Params: OIDCProviderIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;

        const provider = await ssoService.getSSOProvider(id, tenantContext.tenantId);

        if (!provider || provider.provider !== 'oidc') {
          throw new SSOError({
            message: 'OIDC provider not found',
            code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
            statusCode: 404,
          });
        }

        const result = await ssoService.testOIDCProviderConnection(id, tenantContext.tenantId);

        return result;
      } catch (error) {
        if (error instanceof SSOError) {
          throw error;
        }
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to test OIDC connection',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );
};
