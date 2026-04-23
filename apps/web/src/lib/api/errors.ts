import type { CategorizedApiError } from './types.js';

export function createInvalidResponseError(
  message: string = 'Invalid response from server',
  requestId?: string,
): CategorizedApiError {
  return {
    category: 'server',
    code: 'INVALID_RESPONSE',
    message,
    status: 500,
    retryable: false,
    ...(requestId !== undefined && { requestId }),
  };
}
