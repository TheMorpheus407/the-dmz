import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { rateLimiter } from '../../shared/middleware/rate-limiter.js';

import { initializeTenant, getTenantProvisioningStatus } from './tenant-provisioning.service.js';

import type {
  InitializeTenantRequest,
  TenantStatusResponse,
  InitializeTenantResponse,
} from './tenant-provisioning.types.js';

export const registerAdminTenantProvisioningRoutes = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.post<{ Params: { id: string }; Body: InitializeTenantRequest }>(
    '/admin/tenants/:id/initialize',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('super_admin'),
        rateLimiter({ max: 10, timeWindow: '1 minute' }),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['adminEmail', 'adminDisplayName'],
          properties: {
            adminEmail: { type: 'string', format: 'email' },
            adminDisplayName: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string', format: 'uuid' },
                  adminUserId: { type: 'string', format: 'uuid' },
                  temporaryPassword: { type: 'string' },
                  provisioningStatus: { type: 'string' },
                },
              },
            },
          },
          400: {
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
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: InitializeTenantRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;

        const { userId, temporaryPassword } = await initializeTenant(
          id,
          request.body.adminEmail,
          request.body.adminDisplayName,
        );

        const tenantStatus = await getTenantProvisioningStatus(id);

        const response: InitializeTenantResponse = {
          success: true,
          data: {
            tenantId: id,
            adminUserId: userId,
            temporaryPassword,
            provisioningStatus: tenantStatus.provisioningStatus,
          },
        };

        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: {
            code: 'TENANT_INITIALIZATION_FAILED',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/admin/tenants/:id/status',
    {
      preHandler: [authGuard, tenantContext, requireRole('super_admin')],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  domain: { type: 'string' },
                  tier: { type: 'string' },
                  status: { type: 'string' },
                  provisioningStatus: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
          404: {
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
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const tenantStatus = await getTenantProvisioningStatus(id);

        const response: TenantStatusResponse = {
          success: true,
          data: {
            tenantId: tenantStatus.tenantId,
            name: tenantStatus.name,
            slug: tenantStatus.slug,
            domain: tenantStatus.domain,
            tier: tenantStatus.tier,
            status: tenantStatus.status,
            provisioningStatus: tenantStatus.provisioningStatus,
            createdAt: tenantStatus.createdAt,
            updatedAt: tenantStatus.updatedAt,
          },
        };

        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(404).send({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: errorMessage,
          },
        });
      }
    },
  );
};
