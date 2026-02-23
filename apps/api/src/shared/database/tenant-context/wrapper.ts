import { ErrorCodes, AppError } from '../../middleware/error-handler.js';

import { TENANT_CONTEXT_SESSION_KEYS } from './contract.js';

import type { DatabasePool } from '../connection.js';

export interface TenantContextOptions {
  tenantId: string;
  userId?: string;
  requestId?: string;
}

export interface TenantContextValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TenantScopedQueryOptions extends TenantContextOptions {
  operation: 'query' | 'transaction' | 'mutation';
}

const isValidUuid = (value: string): boolean => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(value);
};

export const validateTenantContext = (
  tenantId: string | null | undefined,
): TenantContextValidationResult => {
  const errors: string[] = [];

  if (!tenantId) {
    errors.push('tenantId is required');
  } else if (!isValidUuid(tenantId)) {
    errors.push('tenantId must be a valid UUID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const setTenantSessionContext = async (
  pool: DatabasePool,
  options: TenantContextOptions,
): Promise<void> => {
  const validation = validateTenantContext(options.tenantId);
  if (!validation.valid) {
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_INVALID,
      message: `Failed to set tenant context: ${validation.errors.join(', ')}`,
      statusCode: 401,
      details: { errors: validation.errors },
    });
  }

  await pool.unsafe(
    `SELECT set_config('app.current_tenant_id', $1, false), set_config('app.tenant_id', $1, false)`,
    [options.tenantId],
  );
};

export const clearTenantSessionContext = async (pool: DatabasePool): Promise<void> => {
  await pool.unsafe(`RESET app.current_tenant_id; RESET app.tenant_id;`);
};

export const verifyTenantSessionContext = async (
  pool: DatabasePool,
): Promise<{ currentTenantId: string | null; tenantId: string | null }> => {
  const result = await pool.unsafe<
    Array<{ current_tenant_id: string | null; tenant_id: string | null }>
  >(`SHOW app.current_tenant_id; SHOW app.tenant_id;`);

  if (result.length >= 2) {
    return {
      currentTenantId: result[0]?.current_tenant_id ?? null,
      tenantId: result[1]?.tenant_id ?? null,
    };
  }

  return { currentTenantId: null, tenantId: null };
};

export const requireTenantContext = (
  tenantId: string | null | undefined,
  operation: string,
): void => {
  const validation = validateTenantContext(tenantId);
  if (!validation.valid) {
    throw new AppError({
      code: ErrorCodes.TENANT_CONTEXT_MISSING,
      message: `Tenant-scoped ${operation} requires valid tenant context`,
      statusCode: 401,
      details: {
        operation,
        errors: validation.errors,
      },
    });
  }
};

export interface TenantScopedRunnerOptions extends TenantContextOptions {
  pool: DatabasePool;
}

export type TenantScopedCallback<T> = (context: {
  tenantId: string;
  userId?: string;
}) => Promise<T>;

export const runWithTenantContext = async <T>(
  options: TenantScopedRunnerOptions,
  callback: TenantScopedCallback<T>,
): Promise<T> => {
  requireTenantContext(options.tenantId, 'operation');

  await setTenantSessionContext(options.pool, options);

  try {
    const context: { tenantId: string; userId?: string } = { tenantId: options.tenantId };
    if (options.userId) {
      context.userId = options.userId;
    }
    return await callback(context);
  } finally {
    await clearTenantSessionContext(options.pool);
  }
};

export const getRequiredSessionKeys = (): readonly string[] => {
  return TENANT_CONTEXT_SESSION_KEYS;
};
