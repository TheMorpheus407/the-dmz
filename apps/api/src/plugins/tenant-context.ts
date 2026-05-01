import fp from 'fastify-plugin';

import { ALLOWED_TENANT_STATUSES } from '@the-dmz/shared/auth';

import { ErrorCodes, AppError } from '../shared/middleware/error-handler.js';
import { getDatabaseClient, getDatabasePool } from '../shared/database/connection.js';

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config.js';
import type { TenantContext as ExistingTenantContext } from '../shared/middleware/tenant-context.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

export interface TenantContextPluginOptions {
  headerName?: string;
  required?: boolean;
}

const extractTenantIdFromHeader = (request: FastifyRequest, headerName: string): string | null => {
  const headerValue = request.headers[headerName] as string | undefined;
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }
  return headerValue.trim() || null;
};

const validateTenantAndGetContext = async (
  config: AppConfig,
  tenantId: string,
): Promise<ExistingTenantContext> => {
  const db = getDatabaseClient(config);

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.tenantId, tenantId),
    columns: {
      tenantId: true,
      slug: true,
      status: true,
    },
  });

  if (!tenant) {
    throw new AppError({
      code: ErrorCodes.TENANT_NOT_FOUND,
      message: `Tenant with ID ${tenantId} not found`,
      statusCode: 404,
      details: { tenantId },
    });
  }

  if (
    !ALLOWED_TENANT_STATUSES.includes(tenant.status as (typeof ALLOWED_TENANT_STATUSES)[number])
  ) {
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

  return {
    tenantId: tenant.tenantId,
    userId: '',
    sessionId: '',
    role: '',
    isSuperAdmin: false,
  };
};

const setTenantSessionVariables = async (config: AppConfig, tenantId: string): Promise<void> => {
  const pool = getDatabasePool(config);

  const reserved = await pool.reserve();
  try {
    await reserved.unsafe(
      `SELECT set_config('app.current_tenant_id', $1, false), set_config('app.tenant_id', $1, false)`,
      [tenantId],
    );
  } catch (error) {
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_INVALID,
      message: `Failed to set tenant context: ${error instanceof Error ? error.message : String(error)}`,
      statusCode: 500,
    });
  } finally {
    reserved.release();
  }
};

const tenantContextPluginImpl: FastifyPluginAsync<TenantContextPluginOptions> = async (
  fastify,
  options,
) => {
  const headerName = options?.headerName ?? fastify.config.TENANT_HEADER_NAME;
  const required = options?.required ?? true;

  fastify.addHook('preHandler', async (request, _reply) => {
    const tenantIdFromHeader = extractTenantIdFromHeader(request, headerName);

    if (!tenantIdFromHeader) {
      if (required) {
        throw new AppError({
          code: ErrorCodes.TENANT_CONTEXT_MISSING,
          message: `Tenant context is required. Provide ${headerName} header.`,
          statusCode: 401,
          details: { headerName },
        });
      }
      return;
    }

    if (!isValidUuid(tenantIdFromHeader)) {
      throw new AppError({
        code: ErrorCodes.TENANT_CONTEXT_INVALID,
        message: 'Tenant ID must be a valid UUID',
        statusCode: 401,
      });
    }

    const config = fastify.config;
    const tenantContext = await validateTenantAndGetContext(config, tenantIdFromHeader);

    await setTenantSessionVariables(config, tenantIdFromHeader);

    request.tenantContext = tenantContext;
  });
};

export const tenantContextPlugin = fp(tenantContextPluginImpl, {
  name: 'tenant-context',
});

export const createTenantContextPlugin = (options?: TenantContextPluginOptions) => {
  return fp(
    async (fastify) => {
      await tenantContextPluginImpl(fastify, options ?? {});
    },
    {
      name: 'tenant-context',
    },
  );
};
