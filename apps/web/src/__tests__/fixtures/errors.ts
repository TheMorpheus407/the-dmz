import type { CategorizedApiError } from '$lib/api/types';

export const createTestAuthError = (
  overrides?: Partial<CategorizedApiError>,
): CategorizedApiError => ({
  category: 'authentication',
  code: 'AUTH_TOKEN_EXPIRED',
  status: 401,
  retryable: false,
  message: 'Token expired',
  ...overrides,
});

export const createTestNetworkError = (
  overrides?: Partial<CategorizedApiError>,
): CategorizedApiError => ({
  category: 'network',
  code: 'NETWORK_ERROR',
  status: 0,
  retryable: true,
  message: 'Network request failed',
  ...overrides,
});

export const createTestServerError = (
  overrides?: Partial<CategorizedApiError>,
): CategorizedApiError => ({
  message: 'Internal server error',
  category: 'server',
  code: 'INTERNAL_SERVER_ERROR',
  status: 500,
  retryable: false,
  ...overrides,
});

export const createTestValidationError = (
  overrides?: Partial<CategorizedApiError>,
): CategorizedApiError => ({
  message: 'Validation failed',
  category: 'validation',
  code: 'VALIDATION_ERROR',
  status: 400,
  retryable: false,
  ...overrides,
});

export const createTestAuthorizationError = (
  overrides?: Partial<CategorizedApiError>,
): CategorizedApiError => ({
  message: 'Access denied',
  category: 'authorization',
  code: 'ACCESS_DENIED',
  status: 403,
  retryable: false,
  ...overrides,
});
