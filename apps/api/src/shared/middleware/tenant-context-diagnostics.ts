import { ErrorCodes } from './error-handler.js';

import type { FastifyRequest } from 'fastify';

export interface TenantContextDiagnostic {
  requestId: string;
  tenantId: string | null;
  userId: string | null;
  tenantContextPresent: boolean;
  tenantContextValid: boolean;
  dbSessionContextSet: boolean;
  module?: string;
}

export const getTenantContextDiagnostic = (request: FastifyRequest): TenantContextDiagnostic => {
  const tenantContextPresent = !!request.tenantContext;
  const tenantContextValid = tenantContextPresent ? !!request.tenantContext?.tenantId : false;

  return {
    requestId: request.id,
    tenantId: request.tenantContext?.tenantId ?? null,
    userId: request.tenantContext?.userId ?? null,
    tenantContextPresent,
    tenantContextValid,
    dbSessionContextSet: false,
  };
};

export const createTenantContextErrorLog = (
  request: FastifyRequest,
  errorCode: string,
  context?: Record<string, unknown>,
): Record<string, unknown> => {
  const diagnostic = getTenantContextDiagnostic(request);

  return {
    ...diagnostic,
    errorCode,
    ...context,
  };
};

export const isTenantContextError = (errorCode: string): boolean => {
  return (
    errorCode === ErrorCodes.TENANT_CONTEXT_MISSING ||
    errorCode === ErrorCodes.TENANT_CONTEXT_INVALID ||
    errorCode === ErrorCodes.TENANT_NOT_FOUND ||
    errorCode === ErrorCodes.TENANT_INACTIVE ||
    errorCode === ErrorCodes.TENANT_SUSPENDED ||
    errorCode === ErrorCodes.TENANT_BLOCKED
  );
};
