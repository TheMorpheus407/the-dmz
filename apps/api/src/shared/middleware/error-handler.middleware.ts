import { ZodError } from 'zod';

import { sanitizeContext } from '@the-dmz/shared';

import { ErrorCodes } from './error-codes.js';
import { AppError } from './app-error.js';

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

const isAppError = (error: unknown): error is AppError => error instanceof AppError;
const INVALID_JSON_BODY_ERROR_CODE = 'FST_ERR_CTP_INVALID_JSON_BODY';

const normalizeDetails = (details?: Record<string, unknown>): Record<string, unknown> =>
  details ?? {};

const captureSentryError = async (
  error: FastifyError,
  request: FastifyRequest,
  code: string,
): Promise<void> => {
  try {
    const Sentry = await import('@sentry/node');
    const sentry = Sentry.default ?? Sentry;

    const context = sanitizeContext({
      requestId: request.id,
      code,
      tenantId: request.tenantContext?.tenantId,
      userId: request.tenantContext?.userId,
      method: request.method,
      url: request.url,
      statusCode: error.statusCode ?? 500,
    });

    sentry.captureException(error, { extra: context });
  } catch {
    // Sentry capture failed, continue without error tracking
  }
};

export const createErrorHandler = () =>
  async function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
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
      await captureSentryError(error, request, code);
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
