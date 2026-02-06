import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export const ErrorCodes = {
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type AppErrorOptions = {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

const normalizeDetails = (
  details?: Record<string, unknown>,
): Record<string, unknown> => details ?? {};

export const createErrorHandler = () =>
  function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    let statusCode = error.statusCode ?? 500;
    let code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
    let message = "Internal Server Error";
    let details: Record<string, unknown> | undefined;

    if (isAppError(error)) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof ZodError) {
      statusCode = 400;
      code = ErrorCodes.VALIDATION_FAILED;
      message = "Validation failed";
      details = { issues: error.issues };
    } else if (error.validation) {
      statusCode = 400;
      code = ErrorCodes.VALIDATION_FAILED;
      message = "Validation failed";
      details = { issues: error.validation };
    } else if (statusCode === 404) {
      code = ErrorCodes.NOT_FOUND;
      message = "Route not found";
    }

    if (statusCode >= 500) {
      request.log.error({ err: error }, "request failed");
    } else {
      request.log.info({ err: error }, "request error");
    }

    reply.status(statusCode).send({
      success: false,
      error: {
        code,
        message,
        details: normalizeDetails(details),
      },
    });
  };
