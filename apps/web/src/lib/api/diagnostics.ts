import type { CategorizedApiError } from './types.js';

export interface ErrorDiagnostics {
  requestId: string | undefined;
  errorCode: string | undefined;
  httpStatus: number;
  retryAfterSeconds: number | undefined;
  isRetryable: boolean;
  category: string;
}

export function extractErrorDiagnostics(
  error: CategorizedApiError | undefined,
): ErrorDiagnostics | null {
  if (!error) {
    return null;
  }

  return {
    requestId: error.requestId,
    errorCode: error.code,
    httpStatus: error.status,
    retryAfterSeconds: error.retryAfterSeconds,
    isRetryable: error.retryable,
    category: error.category,
  };
}

export function getDebugInfoForSupport(error: CategorizedApiError | undefined): string {
  const diagnostics = extractErrorDiagnostics(error);
  if (!diagnostics || !diagnostics.requestId) {
    return '';
  }

  const parts = [`Ref: ${diagnostics.requestId}`];
  if (diagnostics.errorCode) {
    parts.push(`Code: ${diagnostics.errorCode}`);
  }
  if (diagnostics.httpStatus) {
    parts.push(`Status: ${diagnostics.httpStatus}`);
  }

  return parts.join(' | ');
}

export const ERROR_DIAGNOSTICS_ATTRIBUTE = 'data-error-request-id';

export function getRequestIdSelector(): string {
  return `[${ERROR_DIAGNOSTICS_ATTRIBUTE}]`;
}

export function getRequestIdFromElement(element: Element | null): string | null {
  if (!element) {
    return null;
  }
  return element.getAttribute(ERROR_DIAGNOSTICS_ATTRIBUTE);
}
