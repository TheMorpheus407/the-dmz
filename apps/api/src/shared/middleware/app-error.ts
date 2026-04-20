import { ErrorCodes, type ErrorCode } from './error-codes.js';
import { ErrorStatusMap } from './error-status-map.js';
import { ErrorMessages } from './error-messages.js';

export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  cause?: Error | null;
};

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

export const createAppError = (
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
  cause?: Error | null,
): AppError =>
  new AppError({
    code,
    message: message ?? ErrorMessages[code]!,
    statusCode: ErrorStatusMap[code]!,
    ...(details !== undefined && { details }),
    ...(cause !== undefined && { cause }),
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
