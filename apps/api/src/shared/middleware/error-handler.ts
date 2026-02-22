import { ZodError } from 'zod';

import {
  ErrorCodes as SharedErrorCodes,
  ErrorCodeCategory,
  errorCodeMetadata as sharedErrorCodeMetadata,
} from '@the-dmz/shared';

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export const ErrorCodes = {
  ...SharedErrorCodes,
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const API_SPECIFIC_CODES: Record<string, { category: ErrorCodeCategory; retryable: boolean }> = {
  INTERNAL_SERVER_ERROR: { category: ErrorCodeCategory.SERVER, retryable: true },
  RESOURCE_NOT_FOUND: { category: ErrorCodeCategory.NOT_FOUND, retryable: false },
  PROFILE_NOT_FOUND: { category: ErrorCodeCategory.NOT_FOUND, retryable: false },
  PROFILE_UPDATE_FAILED: { category: ErrorCodeCategory.SERVER, retryable: false },
};

const allErrorCodeMetadata: Record<string, { category: ErrorCodeCategory; retryable: boolean }> = {
  ...sharedErrorCodeMetadata,
};
for (const [code, meta] of Object.entries(API_SPECIFIC_CODES)) {
  allErrorCodeMetadata[code] = meta;
}

export { allErrorCodeMetadata as errorCodeMetadata };

export const ErrorStatusMap: Record<ErrorCode, number> = {
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.AUTH_UNAUTHORIZED]: 401,
  [ErrorCodes.AUTH_FORBIDDEN]: 403,
  [ErrorCodes.AUTH_INSUFFICIENT_PERMS]: 403,
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCodes.AUTH_TOKEN_INVALID]: 401,
  [ErrorCodes.AUTH_CSRF_INVALID]: 403,
  [ErrorCodes.TENANT_CONTEXT_MISSING]: 401,
  [ErrorCodes.TENANT_CONTEXT_INVALID]: 401,
  [ErrorCodes.TENANT_NOT_FOUND]: 404,
  [ErrorCodes.TENANT_INACTIVE]: 403,
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.PROFILE_NOT_FOUND]: 404,
  [ErrorCodes.PROFILE_UPDATE_FAILED]: 400,
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCodes.AUTH_MFA_REQUIRED]: 401,
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 403,
  [ErrorCodes.AUTH_ACCOUNT_SUSPENDED]: 403,
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCodes.GAME_NOT_FOUND]: 404,
  [ErrorCodes.GAME_STATE_INVALID]: 400,
  [ErrorCodes.TENANT_SUSPENDED]: 403,
  [ErrorCodes.TENANT_BLOCKED]: 403,
  [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 500,
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.AI_GENERATION_FAILED]: 500,
} as const;

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ErrorCodes.VALIDATION_FAILED]: 'Validation failed',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCodes.NOT_FOUND]: 'Resource not found',
  [ErrorCodes.CONFLICT]: 'Resource conflict',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ErrorCodes.AUTH_UNAUTHORIZED]: 'Authentication required',
  [ErrorCodes.AUTH_FORBIDDEN]: 'Access forbidden',
  [ErrorCodes.AUTH_INSUFFICIENT_PERMS]: 'Insufficient permissions to perform this action',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Session expired or invalid',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Invalid or malformed authentication token',
  [ErrorCodes.AUTH_CSRF_INVALID]: 'Invalid or missing CSRF token',
  [ErrorCodes.TENANT_CONTEXT_MISSING]: 'Tenant context is required for this endpoint',
  [ErrorCodes.TENANT_CONTEXT_INVALID]: 'Tenant context is invalid',
  [ErrorCodes.TENANT_NOT_FOUND]: 'Tenant not found',
  [ErrorCodes.TENANT_INACTIVE]: 'Tenant is suspended or deactivated',
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.PROFILE_NOT_FOUND]: 'User profile not found',
  [ErrorCodes.PROFILE_UPDATE_FAILED]: 'Failed to update user profile',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Authentication token expired',
  [ErrorCodes.AUTH_MFA_REQUIRED]: 'Multi-factor authentication required',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'Account is locked',
  [ErrorCodes.AUTH_ACCOUNT_SUSPENDED]: 'Account is suspended',
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 'Invalid format',
  [ErrorCodes.GAME_NOT_FOUND]: 'Game not found',
  [ErrorCodes.GAME_STATE_INVALID]: 'Game state is invalid',
  [ErrorCodes.TENANT_SUSPENDED]: 'Tenant is suspended',
  [ErrorCodes.TENANT_BLOCKED]: 'Tenant is blocked',
  [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 'Internal system error',
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 'System service unavailable',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal error',
  [ErrorCodes.AI_GENERATION_FAILED]: 'AI generation failed',
} as const;

export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
};

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

export const createAppError = (
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
): AppError =>
  new AppError({
    code,
    message: message ?? ErrorMessages[code],
    statusCode: ErrorStatusMap[code],
    ...(details !== undefined && { details }),
  });

export const badRequest = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.INVALID_INPUT, message, details);

export const unauthorized = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.AUTH_UNAUTHORIZED, message, details);

export const forbidden = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.AUTH_FORBIDDEN, message, details);

export const insufficientPermissions = (
  message?: string,
  details?: Record<string, unknown>,
): AppError => createAppError(ErrorCodes.AUTH_INSUFFICIENT_PERMS, message, details);

export const notFound = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.RESOURCE_NOT_FOUND, message, details);

export const conflict = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.CONFLICT, message, details);

export const validationFailed = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.VALIDATION_FAILED, message, details);

export const internalError = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.INTERNAL_SERVER_ERROR, message, details);

export const serviceUnavailable = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.SERVICE_UNAVAILABLE, message, details);

export const tenantContextMissing = (
  message?: string,
  details?: Record<string, unknown>,
): AppError => createAppError(ErrorCodes.TENANT_CONTEXT_MISSING, message, details);

export const tenantContextInvalid = (
  message?: string,
  details?: Record<string, unknown>,
): AppError => createAppError(ErrorCodes.TENANT_CONTEXT_INVALID, message, details);

export const rateLimitExceeded = (details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.RATE_LIMIT_EXCEEDED, undefined, details);

const isAppError = (error: unknown): error is AppError => error instanceof AppError;
const INVALID_JSON_BODY_ERROR_CODE = 'FST_ERR_CTP_INVALID_JSON_BODY';

const normalizeDetails = (details?: Record<string, unknown>): Record<string, unknown> =>
  details ?? {};

export const createErrorHandler = () =>
  function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    let statusCode = error.statusCode ?? 500;
    let code: string = ErrorCodes.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let details: Record<string, unknown> | undefined;

    if (isAppError(error)) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof ZodError) {
      statusCode = 400;
      code = ErrorCodes.VALIDATION_FAILED;
      message = 'Validation failed';
      details = { issues: error.issues };
    } else if (error.validation) {
      statusCode = 400;
      code = ErrorCodes.VALIDATION_FAILED;
      message = 'Validation failed';
      details = { issues: error.validation };
    } else if (error.code === INVALID_JSON_BODY_ERROR_CODE && statusCode === 400) {
      code = ErrorCodes.VALIDATION_FAILED;
      message = 'Validation failed';
      details = { reason: error.message };
    } else if (statusCode === 404) {
      code = ErrorCodes.NOT_FOUND;
      message = 'Route not found';
    }

    if (statusCode >= 500) {
      request.log.error(
        {
          err: error,
          requestId: request.id,
          code,
          tenantId: request.tenantContext?.tenantId,
          userId: request.tenantContext?.userId,
        },
        'request failed',
      );
    } else {
      request.log.warn(
        {
          err: error,
          requestId: request.id,
          code,
          tenantId: request.tenantContext?.tenantId,
          userId: request.tenantContext?.userId,
        },
        'request error',
      );
    }

    const errorPayload = {
      code,
      message,
      details: normalizeDetails(details),
      requestId: request.id,
    };

    reply.status(statusCode).send({
      success: false,
      error: errorPayload,
    });
  };
