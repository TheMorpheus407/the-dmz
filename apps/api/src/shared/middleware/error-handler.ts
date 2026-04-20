export { ErrorCodes, type ErrorCode, ErrorCodeCategory, errorCodeMetadata } from './error-codes.js';

export { ErrorStatusMap } from './error-status-map.js';
export { ErrorMessages } from './error-messages.js';

export {
  AppError,
  type AppErrorOptions,
  createAppError,
  badRequest,
  unauthorized,
  forbidden,
  insufficientPermissions,
  notFound,
  conflict,
  validationFailed,
  internalError,
  serviceUnavailable,
  tenantContextMissing,
  tenantContextInvalid,
  rateLimitExceeded,
} from './app-error.js';

export { createErrorHandler } from './error-handler.middleware.js';
