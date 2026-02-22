import { allowedTenantStatuses, blockedTenantStatuses } from '@the-dmz/shared/auth';

import { getDatabaseClient } from '../database/connection.js';

import { ErrorCodes, AppError } from './error-handler.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export const ALLOWED_TENANT_STATUSES = allowedTenantStatuses;
export const BLOCKED_TENANT_STATUSES = blockedTenantStatuses;

export type AllowedTenantStatus = (typeof ALLOWED_TENANT_STATUSES)[number];
export type BlockedTenantStatus = (typeof BLOCKED_TENANT_STATUSES)[number];

const isTenantStatusAllowed = (status: string): status is AllowedTenantStatus => {
  return ALLOWED_TENANT_STATUSES.includes(status as AllowedTenantStatus);
};

export const preAuthTenantStatusGuard = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  const preAuthContext = request.preAuthTenantContext;

  if (!preAuthContext) {
    return;
  }

  const config = request.server.config;
  const db = getDatabaseClient(config);

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.tenantId, preAuthContext.tenantId),
    columns: {
      tenantId: true,
      status: true,
    },
  });

  if (!tenant) {
    return;
  }

  if (!isTenantStatusAllowed(tenant.status)) {
    request.log.warn(
      {
        requestId: request.id,
        tenantId: tenant.tenantId,
        tenantStatus: tenant.status,
      },
      'tenant status check failed - inactive tenant',
    );

    throw new AppError({
      code: ErrorCodes.TENANT_INACTIVE,
      message: `Tenant is ${tenant.status}`,
      statusCode: 403,
      details: {
        tenantId: tenant.tenantId,
        tenantStatus: tenant.status,
      },
    });
  }
};

export const registerPreAuthTenantStatusGuard = async (app: FastifyInstance): Promise<void> => {
  app.addHook('preHandler', preAuthTenantStatusGuard);
};
