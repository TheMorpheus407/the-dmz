import { z } from 'zod';

import {
  apiErrorSchema,
  apiErrorEnvelopeSchema,
  ErrorCodeCategory,
  ErrorCodes,
  type ApiError,
  type ApiErrorEnvelope,
  type ErrorCode,
  type ApiErrorCategory,
} from '@the-dmz/shared';

export { apiErrorSchema, apiErrorEnvelopeSchema, ErrorCodeCategory, ErrorCodes };
export type { ApiError, ApiErrorEnvelope, ErrorCode, ApiErrorCategory };

export const apiSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ApiError;
    };

export interface CategorizedApiError {
  category: ApiErrorCategory;
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  requestId?: string;
  retryable: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [503, 504],
  retryableErrors: ['SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'TIMEOUT', 'AI_GENERATION_FAILED'],
};

export interface RequestOptions<TRequest = unknown> {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path?: string;
  body?: TRequest;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  retry?: Partial<RetryConfig>;
  credentials?: RequestCredentials;
}

export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  credentials?: RequestCredentials;
  timeout?: number;
}

export const defaultApiClientConfig: ApiClientConfig = {
  baseUrl: '/api/v1',
  credentials: 'include',
};
