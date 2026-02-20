import { ZodError } from 'zod';

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export const ErrorCodes = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  TENANT_CONTEXT_MISSING: 'TENANT_CONTEXT_MISSING',
  TENANT_CONTEXT_INVALID: 'TENANT_CONTEXT_INVALID',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

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

    const errorPayload: {
      code: string;
      message: string;
      details: Record<string, unknown>;
      requestId?: string;
    } = {
      code,
      message,
      details: normalizeDetails(details),
    };

    if (code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
      errorPayload.requestId = request.id;
    }

    if (
      code === ErrorCodes.AUTH_UNAUTHORIZED ||
      code === ErrorCodes.TENANT_CONTEXT_MISSING ||
      code === ErrorCodes.TENANT_CONTEXT_INVALID
    ) {
      errorPayload.requestId = request.id;
    }

    reply.status(statusCode).send({
      success: false,
      error: errorPayload,
    });
  };
