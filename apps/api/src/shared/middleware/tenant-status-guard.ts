import { getDatabaseClient } from '../database/connection.js';

import { ErrorCodes, AppError } from './error-handler.js';
import { ALLOWED_TENANT_STATUSES } from './pre-auth-tenant-status-guard.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export type AllowedTenantStatus = (typeof ALLOWED_TENANT_STATUSES)[number];

const isTenantStatusAllowed = (status: string): status is AllowedTenantStatus => {
  return ALLOWED_TENANT_STATUSES.includes(status as AllowedTenantStatus);
};

export const tenantStatusGuard = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  const user = request.user;

  if (!user || !user.tenantId) {
    return;
  }

  const config = request.server.config;
  const db = getDatabaseClient(config);

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.tenantId, user.tenantId),
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
        userId: user.userId,
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

export const registerTenantStatusGuard = async (app: FastifyInstance): Promise<void> => {
  app.addHook('preHandler', tenantStatusGuard);
};
