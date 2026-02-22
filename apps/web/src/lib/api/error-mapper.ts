import { errorCodeMetadata, type ErrorCode } from '@the-dmz/shared';

import type { ApiError, ApiErrorCategory, CategorizedApiError } from './types.js';

const AUTHENTICATION_CODES = [
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'AUTH_MFA_REQUIRED',
  'AUTH_ACCOUNT_LOCKED',
  'AUTH_SESSION_EXPIRED',
  'AUTH_CSRF_INVALID',
  'TENANT_CONTEXT_MISSING',
  'TENANT_CONTEXT_INVALID',
];

const AUTHORIZATION_CODES = [
  'AUTH_INSUFFICIENT_PERMS',
  'AUTH_ACCOUNT_SUSPENDED',
  'AUTH_FORBIDDEN',
  'TENANT_SUSPENDED',
  'TENANT_INACTIVE',
  'TENANT_BLOCKED',
];

const VALIDATION_CODES = ['VALIDATION_FAILED', 'INVALID_INPUT', 'VALIDATION_INVALID_FORMAT'];

const RATE_LIMIT_CODES = ['RATE_LIMIT_EXCEEDED'];

const SERVER_CODES = [
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'AI_GENERATION_FAILED',
  'SYSTEM_INTERNAL_ERROR',
  'SYSTEM_SERVICE_UNAVAILABLE',
  'GAME_STATE_INVALID',
  'PROFILE_UPDATE_FAILED',
  'RESOURCE_NOT_FOUND',
  'PROFILE_NOT_FOUND',
];

const NOT_FOUND_CODES = ['NOT_FOUND', 'GAME_NOT_FOUND', 'TENANT_NOT_FOUND'];

function categorizeErrorCode(code: string): ApiErrorCategory {
  if (AUTHENTICATION_CODES.includes(code)) {
    return 'authentication';
  }
  if (AUTHORIZATION_CODES.includes(code)) {
    return 'authorization';
  }
  if (VALIDATION_CODES.includes(code)) {
    return 'validation';
  }
  if (RATE_LIMIT_CODES.includes(code)) {
    return 'rate_limiting';
  }
  if (NOT_FOUND_CODES.includes(code)) {
    return 'not_found';
  }
  if (SERVER_CODES.includes(code)) {
    return 'server';
  }
  return 'server';
}

function categorizeByStatus(status: number): ApiErrorCategory {
  if (status === 401) {
    return 'authentication';
  }
  if (status === 403) {
    return 'authorization';
  }
  if (status === 400 || status === 422) {
    return 'validation';
  }
  if (status === 429) {
    return 'rate_limiting';
  }
  if (status >= 500) {
    return 'server';
  }
  return 'server';
}

function getRetryableFromMetadata(code: string): boolean | undefined {
  const metadata = errorCodeMetadata[code as ErrorCode];
  return metadata?.retryable;
}

function isRetryableCategory(category: ApiErrorCategory): boolean {
  return category === 'rate_limiting';
}

export function mapApiError(error: ApiError, httpStatus: number): CategorizedApiError {
  const category = error.code ? categorizeErrorCode(error.code) : categorizeByStatus(httpStatus);

  const metadataRetryable = error.code ? getRetryableFromMetadata(error.code) : undefined;
  const categoryRetryable = isRetryableCategory(category);

  const result: CategorizedApiError = {
    category,
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    status: httpStatus,
    retryable: (metadataRetryable ?? categoryRetryable) || httpStatus === 503,
  };

  if (error.details) {
    result.details = error.details;
  }
  if (error.requestId) {
    result.requestId = error.requestId;
  }

  return result;
}

export function mapNetworkError(_error: Error): CategorizedApiError {
  return {
    category: 'network',
    code: 'NETWORK_ERROR',
    message: 'Network request failed. Please check your connection.',
    status: 0,
    retryable: true,
  };
}

export function getErrorMessage(error: CategorizedApiError): string {
  switch (error.category) {
    case 'authentication':
      return 'Your session has expired. Please log in again.';
    case 'authorization':
      return 'You do not have permission to perform this action.';
    case 'validation':
      return error.message || 'Please check your input and try again.';
    case 'rate_limiting':
      return 'Too many requests. Please wait a moment and try again.';
    case 'server':
      return 'Something went wrong on our end. Please try again later.';
    case 'network':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An unexpected error occurred.';
  }
}
