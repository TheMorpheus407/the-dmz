import type { PaginationMeta } from './common.js';
import type { ApiError, ApiErrorEnvelope } from '../schemas/api-envelope.schema.js';
import type { ErrorCodeCategory } from '../constants/error-codes.js';

export type { ApiError, ApiErrorEnvelope };

export type ApiErrorCategory = ErrorCodeCategory;

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
};
