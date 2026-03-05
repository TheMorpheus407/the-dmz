import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import {
  createQuotaOverrideSchema,
  updateQuotaOverrideSchema,
  revokeQuotaOverrideSchema,
} from '@the-dmz/shared/contracts';

import { requirePermission } from '../../shared/middleware/authorization.js';
import {
  createQuotaOverride,
  listQuotaOverrides,
  getQuotaOverrideById,
  updateQuotaOverride,
  revokeQuotaOverride,
  approveQuotaOverride,
} from '../../shared/services/quota-override.service.js';

import type { AuthenticatedUser } from './auth.types.js';

interface CreateQuotaOverrideBody {
  tier: 'standard' | 'professional' | 'enterprise' | 'custom';
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  credentialClasses: ('api_key' | 'pat' | 'service_client')[];
  effectiveFrom: string;
  effectiveUntil?: string;
  reason?: string;
}

interface UpdateQuotaOverrideBody {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
  effectiveUntil?: string;
  reason?: string;
}

interface RevokeQuotaOverrideBody {
  reason?: string;
}

interface TenantParams {
  tenantId: string;
}

interface OverrideParams {
  tenantId: string;
  overrideId: string;
}

interface ListQueryString {
  status?: 'pending' | 'active' | 'expired' | 'revoked' | undefined;
}

export const registerQuotaOverrideRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Params: TenantParams; Body: CreateQuotaOverrideBody }>(
    '/auth/admin/tenants/:tenantId/quota-overrides',
    {
      preHandler: [requirePermission('admin', 'quota:write')],
    },
    async (
      request: FastifyRequest<{ Params: TenantParams; Body: CreateQuotaOverrideBody }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUser;
      const { tenantId } = request.params;
      const body = request.body;

      const input = createQuotaOverrideSchema.parse(body);

      const override = await createQuotaOverride({
        tenantId,
        requestedBy: user.userId,
        input,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      reply.code(201);
      return override;
    },
  );

  fastify.get<{ Params: TenantParams; Querystring: ListQueryString }>(
    '/auth/admin/tenants/:tenantId/quota-overrides',
    {
      preHandler: [requirePermission('admin', 'quota:read')],
    },
    async (
      request: FastifyRequest<{ Params: TenantParams; Querystring: ListQueryString }>,
      _reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const { status } = request.query;

      const listParams: {
        tenantId: string;
        status?: 'pending' | 'active' | 'expired' | 'revoked';
      } = {
        tenantId,
      };
      if (status) {
        listParams.status = status;
      }

      const overrides = await listQuotaOverrides(listParams);

      return overrides;
    },
  );

  fastify.get<{ Params: OverrideParams }>(
    '/auth/admin/tenants/:tenantId/quota-overrides/:overrideId',
    {
      preHandler: [requirePermission('admin', 'quota:read')],
    },
    async (request: FastifyRequest<{ Params: OverrideParams }>, _reply: FastifyReply) => {
      const { tenantId, overrideId } = request.params;

      const override = await getQuotaOverrideById(overrideId, tenantId);

      return override;
    },
  );

  fastify.patch<{ Params: OverrideParams; Body: UpdateQuotaOverrideBody }>(
    '/auth/admin/tenants/:tenantId/quota-overrides/:overrideId',
    {
      preHandler: [requirePermission('admin', 'quota:write')],
    },
    async (
      request: FastifyRequest<{ Params: OverrideParams; Body: UpdateQuotaOverrideBody }>,
      _reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUser;
      const { tenantId, overrideId } = request.params;
      const body = request.body;

      const input = updateQuotaOverrideSchema.parse(body);

      const override = await updateQuotaOverride({
        overrideId,
        tenantId,
        actorId: user.userId,
        input,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return override;
    },
  );

  fastify.delete<{ Params: OverrideParams; Body: RevokeQuotaOverrideBody }>(
    '/auth/admin/tenants/:tenantId/quota-overrides/:overrideId',
    {
      preHandler: [requirePermission('admin', 'quota:write')],
    },
    async (
      request: FastifyRequest<{ Params: OverrideParams; Body: RevokeQuotaOverrideBody }>,
      _reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUser;
      const { tenantId, overrideId } = request.params;
      const body = request.body;

      const input = revokeQuotaOverrideSchema.parse(body ?? {});

      const override = await revokeQuotaOverride({
        overrideId,
        tenantId,
        actorId: user.userId,
        input,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return override;
    },
  );

  fastify.post<{ Params: OverrideParams }>(
    '/auth/admin/tenants/:tenantId/quota-overrides/:overrideId/approve',
    {
      preHandler: [requirePermission('admin', 'quota:approve')],
    },
    async (request: FastifyRequest<{ Params: OverrideParams }>, reply: FastifyReply) => {
      const user = request.user as AuthenticatedUser;
      const { tenantId, overrideId } = request.params;

      const override = await approveQuotaOverride(overrideId, tenantId, user.userId);

      reply.code(200);
      return override;
    },
  );
};
