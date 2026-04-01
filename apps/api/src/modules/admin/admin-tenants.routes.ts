import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { rateLimiter } from '../../shared/middleware/rate-limiter.js';

import { createTenant } from './tenant-provisioning.service.js';

import type { CreateTenantRequest, CreateTenantResponse } from './tenant-provisioning.types.js';
import type { TenantTier, ProvisioningStatus } from '../../shared/database/schema/index.js';

export const registerAdminTenantRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Body: CreateTenantRequest }>(
    '/admin/tenants',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('super_admin'),
        rateLimiter({ max: 10, timeWindow: '1 minute' }),
      ],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'slug', 'adminEmail', 'adminDisplayName'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            slug: { type: 'string', minLength: 1, maxLength: 63 },
            domain: { type: 'string', maxLength: 255 },
            contactEmail: { type: 'string', format: 'email' },
            tier: { type: 'string', enum: ['starter', 'professional', 'enterprise', 'government'] },
            planId: { type: 'string', maxLength: 32 },
            dataRegion: { type: 'string', maxLength: 16 },
            adminEmail: { type: 'string', format: 'email' },
            adminDisplayName: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  tier: { type: 'string' },
                  provisioningStatus: { type: 'string' },
                  adminEmail: { type: 'string' },
                  temporaryPassword: { type: 'string' },
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
    async (request: FastifyRequest<{ Body: CreateTenantRequest }>, reply: FastifyReply) => {
      try {
        const { tenant, temporaryPassword } = await createTenant({
          name: request.body.name,
          slug: request.body.slug,
          domain: request.body.domain ?? null,
          contactEmail: request.body.contactEmail ?? null,
          tier: request.body.tier,
          planId: request.body.planId,
          dataRegion: request.body.dataRegion ?? null,
        });

        const response: CreateTenantResponse = {
          success: true,
          data: {
            tenantId: tenant.tenantId,
            name: tenant.name,
            slug: tenant.slug,
            tier: (tenant.tier ?? 'starter') as TenantTier,
            provisioningStatus: (tenant.provisioningStatus ?? 'pending') as ProvisioningStatus,
            adminEmail: request.body.adminEmail,
            temporaryPassword,
          },
        };

        return reply.code(201).send(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: {
            code: 'TENANT_CREATION_FAILED',
            message: errorMessage,
          },
        });
      }
    },
  );
};
