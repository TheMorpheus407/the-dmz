import type { ApiError, ApiErrorCategory, CategorizedApiError } from './types.js';

const AUTHENTICATION_CODES = [
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'AUTH_MFA_REQUIRED',
  'AUTH_ACCOUNT_LOCKED',
];

const AUTHORIZATION_CODES = [
  'AUTH_INSUFFICIENT_PERMS',
  'AUTH_ACCOUNT_SUSPENDED',
  'AUTH_MFA_REQUIRED',
];

const VALIDATION_CODES = ['VALIDATION_FAILED', 'INVALID_INPUT'];

const RATE_LIMIT_CODES = ['RATE_LIMIT_EXCEEDED'];

const SERVER_CODES = ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'AI_GENERATION_FAILED'];

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

function isRetryableCategory(category: ApiErrorCategory): boolean {
  return category === 'rate_limiting';
}

export function mapApiError(error: ApiError, httpStatus: number): CategorizedApiError {
  const category = error.code ? categorizeErrorCode(error.code) : categorizeByStatus(httpStatus);

  const result: CategorizedApiError = {
    category,
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    status: httpStatus,
    retryable: isRetryableCategory(category) || httpStatus === 503,
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
