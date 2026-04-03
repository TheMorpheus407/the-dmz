import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { ErrorCodes } from '@the-dmz/shared/constants';

import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import * as ssoService from '../auth/index.js';
import { SSOError } from '../auth/index.js';

interface SAMLProviderIdParams {
  id: string;
}

interface CreateSAMLProviderBody {
  name: string;
  metadataUrl: string;
  idpCertificate?: string;
  spPrivateKey?: string;
  spCertificate?: string;
}

interface UpdateSAMLProviderBody {
  name?: string;
  metadataUrl?: string;
  idpCertificate?: string | null;
  spPrivateKey?: string | null;
  spCertificate?: string | null;
  isActive?: boolean;
}

export const samlConfigResponseJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    provider: { type: 'string', enum: ['saml'] },
    metadataUrl: { type: 'string', format: 'uri' },
    idpCertificate: { type: 'string' },
    spCertificate: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const samlConfigListResponseJsonSchema = {
  type: 'object',
  properties: {
    providers: {
      type: 'array',
      items: samlConfigResponseJsonSchema,
    },
  },
} as const;

export const samlTestConnectionResponseJsonSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
} as const;

export const registerAdminSAMLRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Params: SAMLProviderIdParams }>(
    '/admin/saml/config',
    {
      preHandler: [authGuard, tenantContext, requirePermission('saml', 'read')],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: samlConfigListResponseJsonSchema,
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

        const samlProviders = providers
          .filter((p) => p.provider === 'saml')
          .map((p) => ({
            id: p.id,
            tenantId: p.tenantId,
            name: p.name,
            provider: 'saml' as const,
            metadataUrl: p.metadataUrl,
            idpCertificate: p.idpCertificate,
            spCertificate: p.spCertificate,
            isActive: p.isActive,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          }));

        return {
          providers: samlProviders,
        };
      } catch (error) {
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to retrieve SAML configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.post<{ Body: CreateSAMLProviderBody }>(
    '/admin/saml/config',
    {
      preHandler: [authGuard, tenantContext, requirePermission('saml', 'write')],
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            metadataUrl: { type: 'string', format: 'uri' },
            idpCertificate: { type: 'string' },
            spPrivateKey: { type: 'string' },
            spCertificate: { type: 'string' },
          },
          required: ['name', 'metadataUrl'],
        },
        response: {
          200: samlConfigResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateSAMLProviderBody }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { name, metadataUrl, idpCertificate, spPrivateKey, spCertificate } = request.body;

        const createInput: ssoService.CreateSAMLProviderInput = {
          tenantId: tenantContext.tenantId,
          name,
          metadataUrl,
        };

        if (idpCertificate) {
          createInput.idpCertificate = idpCertificate;
        }
        if (spPrivateKey) {
          createInput.spPrivateKey = spPrivateKey;
        }
        if (spCertificate) {
          createInput.spCertificate = spCertificate;
        }

        const provider = await ssoService.createSAMLProvider(createInput);

        return {
          id: provider.id,
          tenantId: provider.tenantId,
          name: provider.name,
          provider: 'saml' as const,
          metadataUrl: provider.metadataUrl,
          idpCertificate: provider.idpCertificate,
          spCertificate: provider.spCertificate,
          isActive: provider.isActive,
          createdAt: provider.createdAt.toISOString(),
          updatedAt: provider.updatedAt.toISOString(),
        };
      } catch (error) {
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to create SAML configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.get<{ Params: SAMLProviderIdParams }>(
    '/admin/saml/config/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('saml', 'read')],
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
          200: samlConfigResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Params: SAMLProviderIdParams }>, reply: FastifyReply) => {
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

        if (!provider || provider.provider !== 'saml') {
          throw new SSOError({
            message: 'SAML provider not found',
            code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
            statusCode: 404,
          });
        }

        return {
          id: provider.id,
          tenantId: provider.tenantId,
          name: provider.name,
          provider: 'saml' as const,
          metadataUrl: provider.metadataUrl,
          idpCertificate: provider.idpCertificate,
          spCertificate: provider.spCertificate,
          isActive: provider.isActive,
          createdAt: provider.createdAt.toISOString(),
          updatedAt: provider.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof SSOError) {
          throw error;
        }
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to retrieve SAML configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.put<{ Params: SAMLProviderIdParams; Body: UpdateSAMLProviderBody }>(
    '/admin/saml/config/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('saml', 'write')],
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
            idpCertificate: { type: 'string' },
            spPrivateKey: { type: 'string' },
            spCertificate: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: samlConfigResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: SAMLProviderIdParams; Body: UpdateSAMLProviderBody }>,
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

        const provider = await ssoService.updateSAMLProvider(
          id,
          tenantContext.tenantId,
          request.body,
        );

        if (!provider) {
          throw new SSOError({
            message: 'SAML provider not found',
            code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
            statusCode: 404,
          });
        }

        return {
          id: provider.id,
          tenantId: provider.tenantId,
          name: provider.name,
          provider: 'saml' as const,
          metadataUrl: provider.metadataUrl,
          idpCertificate: provider.idpCertificate,
          spCertificate: provider.spCertificate,
          isActive: provider.isActive,
          createdAt: provider.createdAt.toISOString(),
          updatedAt: provider.updatedAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof SSOError) {
          throw error;
        }
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to update SAML configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.delete<{ Params: SAMLProviderIdParams }>(
    '/admin/saml/config/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('saml', 'write')],
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
    async (request: FastifyRequest<{ Params: SAMLProviderIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id } = request.params;

        const deleted = await ssoService.deleteSAMLProvider(id, tenantContext.tenantId);

        if (!deleted) {
          throw new SSOError({
            message: 'SAML provider not found',
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
          message: error instanceof Error ? error.message : 'Failed to delete SAML configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.post<{ Params: SAMLProviderIdParams }>(
    '/admin/saml/test/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('saml', 'read')],
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
          200: samlTestConnectionResponseJsonSchema,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest<{ Params: SAMLProviderIdParams }>, reply: FastifyReply) => {
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

        if (!provider || provider.provider !== 'saml') {
          throw new SSOError({
            message: 'SAML provider not found',
            code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
            statusCode: 404,
          });
        }

        const result = await ssoService.testSAMLProviderConnection(id, tenantContext.tenantId);

        return result;
      } catch (error) {
        if (error instanceof SSOError) {
          throw error;
        }
        throw new SSOError({
          message: error instanceof Error ? error.message : 'Failed to test SAML connection',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );
};
