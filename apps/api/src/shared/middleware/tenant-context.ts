import { getDatabasePool } from '../database/connection.js';

import { ErrorCodes, AppError } from './error-handler.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

export interface TenantContext {
  tenantId: string;
  userId: string;
  sessionId: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenantContext?: TenantContext;
  }
}

export const tenantContext = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  const user = request.user;

  if (!user) {
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_MISSING,
      message: 'Tenant context is required for this endpoint',
      statusCode: 401,
    });
  }

  const { tenantId, userId, sessionId, role } = user;

  if (!tenantId) {
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_MISSING,
      message: 'Tenant ID is required for this endpoint',
      statusCode: 401,
      details: { field: 'tenantId' },
    });
  }

  if (!userId) {
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_MISSING,
      message: 'User ID is required for this endpoint',
      statusCode: 401,
      details: { field: 'userId' },
    });
  }

  if (!isValidUuid(tenantId)) {
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_INVALID,
      message: 'Tenant ID must be a valid UUID',
      statusCode: 401,
    });
  }

  const config = request.server.config;
  const pool = getDatabasePool(config);

  try {
    await pool.unsafe(
      `SET LOCAL app.current_tenant_id = '${tenantId}'; SET LOCAL app.tenant_id = '${tenantId}';`,
    );
  } catch (error) {
    request.log.error({ err: error }, 'tenant context set failed');
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_INVALID,
      message: 'Failed to set tenant context',
      statusCode: 500,
    });
  }

  request.tenantContext = {
    tenantId,
    userId,
    sessionId: sessionId ?? '',
    role,
  };
};

export const registerTenantContext = async (app: FastifyInstance): Promise<void> => {
  app.addHook('preHandler', tenantContext);
};
