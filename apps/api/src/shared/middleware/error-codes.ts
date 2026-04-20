import {
  ErrorCodes as SharedErrorCodes,
  ErrorCodeCategory,
  errorCodeMetadata as sharedErrorCodeMetadata,
  JWT_ERROR_CODES,
} from '@the-dmz/shared';

export { ErrorCodeCategory };

export const ErrorCodes = {
  ...SharedErrorCodes,
  ...JWT_ERROR_CODES,
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
  AUTH_PERMISSION_DECLARATION_MISSING: 'AUTH_PERMISSION_DECLARATION_MISSING',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const API_SPECIFIC_CODES: Record<string, { category: ErrorCodeCategory; retryable: boolean }> = {
  INTERNAL_SERVER_ERROR: { category: ErrorCodeCategory.SERVER, retryable: true },
  RESOURCE_NOT_FOUND: { category: ErrorCodeCategory.NOT_FOUND, retryable: false },
  PROFILE_NOT_FOUND: { category: ErrorCodeCategory.NOT_FOUND, retryable: false },
  PROFILE_UPDATE_FAILED: { category: ErrorCodeCategory.SERVER, retryable: false },
  [JWT_ERROR_CODES.AUTH_JWT_INVALID_KEY_ID]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
  },
  [JWT_ERROR_CODES.AUTH_JWT_KEY_REVOKED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
  },
  [JWT_ERROR_CODES.AUTH_JWT_KEY_EXPIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
  },
  [JWT_ERROR_CODES.AUTH_JWT_ALGORITHM_MISMATCH]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
  },
  [JWT_ERROR_CODES.AUTH_JWT_INVALID_TOKEN]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
  },
  [JWT_ERROR_CODES.AUTH_JWT_MISSING_KEY_ID]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
  },
  [JWT_ERROR_CODES.AUTH_JWK_NOT_FOUND]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
  },
  [JWT_ERROR_CODES.AUTH_JWT_SIGNING_ERROR]: { category: ErrorCodeCategory.SERVER, retryable: true },
};

const allErrorCodeMetadata: Record<string, { category: ErrorCodeCategory; retryable: boolean }> = {
  ...sharedErrorCodeMetadata,
};
for (const [code, meta] of Object.entries(API_SPECIFIC_CODES)) {
  allErrorCodeMetadata[code] = meta;
}

export { allErrorCodeMetadata as errorCodeMetadata };
