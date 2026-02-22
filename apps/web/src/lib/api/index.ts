export { apiClient, ApiClient } from './client';
export { buildApiUrl, defaultApiClientConfig } from './client';
export { mapApiError, mapNetworkError, getErrorMessage } from './error-mapper';
export { getErrorCopy, getSurfaceFromPath, getSeverity, getAriaLivePriority } from './error-copy';
export type { ErrorCopy, RouteSurface } from './error-copy';
export type {
  ApiClientConfig,
  ApiError,
  ApiErrorCategory,
  ApiErrorEnvelope,
  ApiResponse,
  CategorizedApiError,
  RequestOptions,
  RetryConfig,
} from './types';
export {
  apiErrorSchema,
  apiErrorEnvelopeSchema,
  apiSuccessEnvelopeSchema,
  defaultRetryConfig,
} from './types';
export { login, register, refresh, logout, getCurrentUser } from './auth';
export type { AuthResponse, RefreshResponse } from './auth';
