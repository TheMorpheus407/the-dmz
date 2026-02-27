import { ZodError } from 'zod';

import {
  ErrorCodes as SharedErrorCodes,
  ErrorCodeCategory,
  errorCodeMetadata as sharedErrorCodeMetadata,
  JWT_ERROR_CODES,
} from '@the-dmz/shared';

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export const ErrorCodes = {
  ...SharedErrorCodes,
  ...JWT_ERROR_CODES,
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const API_SPECIFIC_CODES: Record<string, { category: ErrorCodeCategory; retryable: boolean }> = {
  INTERNAL_SERVER_ERROR: { category: ErrorCodeCategory.SERVER, retryable: true },
  RESOURCE_NOT_FOUND: { category: ErrorCodeCategory.NOT_FOUND, retryable: false },
  PROFILE_NOT_FOUND: { category: ErrorCodeCategory.NOT_FOUND, retryable: false },
  PROFILE_UPDATE_FAILED: { category: ErrorCodeCategory.SERVER, retryable: false },
};

const allErrorCodeMetadata: Record<string, { category: ErrorCodeCategory; retryable: boolean }> = {
  ...sharedErrorCodeMetadata,
};
for (const [code, meta] of Object.entries(API_SPECIFIC_CODES)) {
  allErrorCodeMetadata[code] = meta;
}

export { allErrorCodeMetadata as errorCodeMetadata };

export const ErrorStatusMap: Record<ErrorCode, number> = {
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.AUTH_UNAUTHORIZED]: 401,
  [ErrorCodes.AUTH_FORBIDDEN]: 403,
  [ErrorCodes.AUTH_INSUFFICIENT_PERMS]: 403,
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCodes.AUTH_SESSION_REVOKED]: 401,
  [ErrorCodes.AUTH_TOKEN_INVALID]: 401,
  [ErrorCodes.AUTH_CSRF_INVALID]: 403,
  [ErrorCodes.TENANT_CONTEXT_MISSING]: 401,
  [ErrorCodes.TENANT_CONTEXT_INVALID]: 401,
  [ErrorCodes.TENANT_NOT_FOUND]: 404,
  [ErrorCodes.TENANT_INACTIVE]: 403,
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.PROFILE_NOT_FOUND]: 404,
  [ErrorCodes.PROFILE_UPDATE_FAILED]: 400,
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCodes.AUTH_MFA_REQUIRED]: 403,
  [ErrorCodes.AUTH_MFA_ALREADY_ENABLED]: 400,
  [ErrorCodes.AUTH_MFA_NOT_ENABLED]: 400,
  [ErrorCodes.AUTH_MFA_INVALID_CODE]: 400,
  [ErrorCodes.AUTH_MFA_EXPIRED]: 400,
  [ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED]: 400,
  [ErrorCodes.AUTH_WEBAUTHN_VERIFICATION_FAILED]: 400,
  [ErrorCodes.AUTH_WEBAUTHN_NOT_SUPPORTED]: 400,
  [ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND]: 404,
  [ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_EXISTS]: 409,
  [ErrorCodes.AUTH_WEBAUTHN_REGISTRATION_FAILED]: 400,
  [ErrorCodes.AUTH_WEBAUTHN_ASSERTION_FAILED]: 400,
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 403,
  [ErrorCodes.AUTH_ACCOUNT_SUSPENDED]: 403,
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCodes.GAME_NOT_FOUND]: 404,
  [ErrorCodes.GAME_STATE_INVALID]: 400,
  [ErrorCodes.TENANT_SUSPENDED]: 403,
  [ErrorCodes.TENANT_BLOCKED]: 403,
  [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 500,
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.AI_GENERATION_FAILED]: 500,
  [ErrorCodes.AUTH_ABUSE_COOLDOWN]: 429,
  [ErrorCodes.AUTH_ABUSE_LOCKED]: 403,
  [ErrorCodes.AUTH_ABUSE_CHALLENGE_REQUIRED]: 403,
  [ErrorCodes.AUTH_ABUSE_IP_BLOCKED]: 403,
  [ErrorCodes.AUTH_PASSWORD_TOO_SHORT]: 400,
  [ErrorCodes.AUTH_PASSWORD_TOO_LONG]: 400,
  [ErrorCodes.AUTH_PASSWORD_TOO_WEAK]: 400,
  [ErrorCodes.AUTH_PASSWORD_COMPROMISED]: 400,
  [ErrorCodes.AUTH_PASSWORD_POLICY_VIOLATION]: 400,
  [JWT_ERROR_CODES.AUTH_JWT_INVALID_KEY_ID]: 401,
  [JWT_ERROR_CODES.AUTH_JWT_KEY_REVOKED]: 401,
  [JWT_ERROR_CODES.AUTH_JWT_KEY_EXPIRED]: 401,
  [JWT_ERROR_CODES.AUTH_JWT_ALGORITHM_MISMATCH]: 401,
  [JWT_ERROR_CODES.AUTH_JWT_INVALID_TOKEN]: 401,
  [JWT_ERROR_CODES.AUTH_JWT_MISSING_KEY_ID]: 401,
  [JWT_ERROR_CODES.AUTH_JWK_NOT_FOUND]: 401,
  [JWT_ERROR_CODES.AUTH_JWT_SIGNING_ERROR]: 500,
  [SharedErrorCodes.OAUTH_INVALID_CLIENT]: 401,
  [SharedErrorCodes.OAUTH_INVALID_GRANT]: 400,
  [SharedErrorCodes.OAUTH_INSUFFICIENT_SCOPE]: 403,
  [SharedErrorCodes.OAUTH_CLIENT_REVOKED]: 401,
  [SharedErrorCodes.OAUTH_CLIENT_EXPIRED]: 401,
  [ErrorCodes.SSO_PROVIDER_NOT_FOUND]: 404,
  [ErrorCodes.SSO_PROVIDER_INACTIVE]: 403,
  [ErrorCodes.SSO_INVALID_ASSERTION]: 401,
  [ErrorCodes.SSO_ASSERTION_EXPIRED]: 401,
  [ErrorCodes.SSO_ASSERTION_REPLAYED]: 401,
  [ErrorCodes.SSO_INVALID_SIGNATURE]: 401,
  [ErrorCodes.SSO_INVALID_ISSUER]: 401,
  [ErrorCodes.SSO_INVALID_AUDIENCE]: 401,
  [ErrorCodes.SSO_INVALID_STATE]: 400,
  [ErrorCodes.SSO_INVALID_NONCE]: 401,
  [ErrorCodes.SSO_MISSING_REQUIRED_CLAIM]: 401,
  [ErrorCodes.SSO_TOKEN_EXPIRED]: 401,
  [ErrorCodes.SSO_TOKEN_INVALID]: 401,
  [ErrorCodes.SSO_METADATA_FETCH_FAILED]: 503,
  [ErrorCodes.SSO_METADATA_INVALID]: 400,
  [ErrorCodes.SSO_CONFIGURATION_ERROR]: 500,
  [ErrorCodes.SSO_ACCOUNT_LINKING_FAILED]: 400,
  [ErrorCodes.SSO_JIT_PROVISIONING_DENIED]: 403,
  [ErrorCodes.SCIM_INVALID_REQUEST]: 400,
  [ErrorCodes.SCIM_USER_NOT_FOUND]: 404,
  [ErrorCodes.SCIM_USER_ALREADY_EXISTS]: 409,
  [ErrorCodes.SCIM_GROUP_NOT_FOUND]: 404,
  [ErrorCodes.SCIM_GROUP_ALREADY_EXISTS]: 409,
  [ErrorCodes.SCIM_INVALID_FILTER]: 400,
  [ErrorCodes.SCIM_TENANT_MISMATCH]: 403,
  [ErrorCodes.SCIM_IDEMPOTENCY_KEY_CONFLICT]: 409,
  [ErrorCodes.SCIM_ROLE_ESCALATION_BLOCKED]: 403,
  [ErrorCodes.SCIM_ATTRIBUTE_MUTABILITY_VIOLATION]: 400,
  [ErrorCodes.SCIM_JIT_CONFLICT]: 409,
  [ErrorCodes.SSO_VALIDATION_REQUIRED]: 400,
  [ErrorCodes.SSO_VALIDATION_STALE]: 400,
  [ErrorCodes.SSO_VALIDATION_FAILED]: 400,
  [ErrorCodes.SSO_ACTIVATION_BLOCKED]: 403,
  [ErrorCodes.SSO_METADATA_UNREACHABLE]: 503,
  [ErrorCodes.SSO_DISCOVERY_FAILED]: 503,
  [ErrorCodes.SSO_JWKS_UNREACHABLE]: 503,
  [ErrorCodes.SSO_CERTIFICATE_EXPIRED]: 400,
  [ErrorCodes.SSO_ISSUER_MISMATCH_CONFIG]: 400,
  [ErrorCodes.SSO_AUDIENCE_MISMATCH_CONFIG]: 400,
  [ErrorCodes.SCIM_VALIDATION_FAILED]: 400,
  [ErrorCodes.SCIM_BASE_URL_UNREACHABLE]: 503,
  [ErrorCodes.SCIM_AUTHENTICATION_FAILED]: 401,
  [ErrorCodes.SCIM_ENDPOINT_UNAVAILABLE]: 503,
  [ErrorCodes.AUTH_SESSION_IDLE_TIMEOUT]: 401,
  [ErrorCodes.AUTH_SESSION_ABSOLUTE_TIMEOUT]: 401,
  [ErrorCodes.AUTH_SESSION_CONCURRENT_LIMIT]: 403,
  [ErrorCodes.AUTH_SESSION_BINDING_VIOLATION]: 401,
  [ErrorCodes.AUTH_SESSION_POLICY_INVALID]: 400,
  [ErrorCodes.AUTH_MFA_POLICY_INVALID]: 400,
  [ErrorCodes.AUTH_MFA_ENROLLMENT_EXPIRED]: 403,
  [ErrorCodes.AUTH_STEP_UP_REQUIRED]: 403,
  [ErrorCodes.AUTH_STEP_UP_FAILED]: 403,
  [ErrorCodes.AUTH_STEP_UP_EXPIRED]: 403,
  [ErrorCodes.AUTH_ADAPTIVE_MFA_TRIGGERED]: 403,
  [ErrorCodes.AUTH_MFA_METHOD_NOT_ALLOWED]: 403,
} as const;

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ErrorCodes.VALIDATION_FAILED]: 'Validation failed',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCodes.NOT_FOUND]: 'Resource not found',
  [ErrorCodes.CONFLICT]: 'Resource conflict',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ErrorCodes.AUTH_UNAUTHORIZED]: 'Authentication required',
  [ErrorCodes.AUTH_FORBIDDEN]: 'Access forbidden',
  [ErrorCodes.AUTH_INSUFFICIENT_PERMS]: 'Insufficient permissions to perform this action',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Session expired or invalid',
  [ErrorCodes.AUTH_SESSION_REVOKED]: 'Session has been revoked',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Invalid or malformed authentication token',
  [ErrorCodes.AUTH_CSRF_INVALID]: 'Invalid or missing CSRF token',
  [ErrorCodes.TENANT_CONTEXT_MISSING]: 'Tenant context is required for this endpoint',
  [ErrorCodes.TENANT_CONTEXT_INVALID]: 'Tenant context is invalid',
  [ErrorCodes.TENANT_NOT_FOUND]: 'Tenant not found',
  [ErrorCodes.TENANT_INACTIVE]: 'Tenant is suspended or deactivated',
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.PROFILE_NOT_FOUND]: 'User profile not found',
  [ErrorCodes.PROFILE_UPDATE_FAILED]: 'Failed to update user profile',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Authentication token expired',
  [ErrorCodes.AUTH_MFA_REQUIRED]: 'Multi-factor authentication required',
  [ErrorCodes.AUTH_MFA_ALREADY_ENABLED]: 'MFA already enabled',
  [ErrorCodes.AUTH_MFA_NOT_ENABLED]: 'MFA not enabled',
  [ErrorCodes.AUTH_MFA_INVALID_CODE]: 'Invalid MFA code',
  [ErrorCodes.AUTH_MFA_EXPIRED]: 'MFA code expired',
  [ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED]: 'WebAuthn challenge expired',
  [ErrorCodes.AUTH_WEBAUTHN_VERIFICATION_FAILED]: 'WebAuthn verification failed',
  [ErrorCodes.AUTH_WEBAUTHN_NOT_SUPPORTED]: 'WebAuthn not supported',
  [ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND]: 'WebAuthn credential not found',
  [ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_EXISTS]: 'WebAuthn credential already exists',
  [ErrorCodes.AUTH_WEBAUTHN_REGISTRATION_FAILED]: 'WebAuthn registration failed',
  [ErrorCodes.AUTH_WEBAUTHN_ASSERTION_FAILED]: 'WebAuthn assertion failed',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'Account is locked',
  [ErrorCodes.AUTH_ACCOUNT_SUSPENDED]: 'Account is suspended',
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 'Invalid format',
  [ErrorCodes.GAME_NOT_FOUND]: 'Game not found',
  [ErrorCodes.GAME_STATE_INVALID]: 'Game state is invalid',
  [ErrorCodes.TENANT_SUSPENDED]: 'Tenant is suspended',
  [ErrorCodes.TENANT_BLOCKED]: 'Tenant is blocked',
  [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 'Internal system error',
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 'System service unavailable',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal error',
  [ErrorCodes.AI_GENERATION_FAILED]: 'AI generation failed',
  [ErrorCodes.AUTH_ABUSE_COOLDOWN]:
    'Too many failed login attempts. Please wait before trying again.',
  [ErrorCodes.AUTH_ABUSE_LOCKED]:
    'Account temporarily locked due to repeated failed login attempts.',
  [ErrorCodes.AUTH_ABUSE_CHALLENGE_REQUIRED]:
    'MFA verification required due to suspicious login activity.',
  [ErrorCodes.AUTH_ABUSE_IP_BLOCKED]:
    'IP address temporarily blocked due to repeated authentication failures.',
  [ErrorCodes.AUTH_PASSWORD_TOO_SHORT]: 'Password is below the minimum length requirement',
  [ErrorCodes.AUTH_PASSWORD_TOO_LONG]: 'Password exceeds the maximum length requirement',
  [ErrorCodes.AUTH_PASSWORD_TOO_WEAK]: 'Password does not meet complexity requirements',
  [ErrorCodes.AUTH_PASSWORD_COMPROMISED]: 'Password found in known data breach',
  [ErrorCodes.AUTH_PASSWORD_POLICY_VIOLATION]: 'Password policy violation',
  [JWT_ERROR_CODES.AUTH_JWT_INVALID_KEY_ID]: 'Token contains unknown or invalid key ID',
  [JWT_ERROR_CODES.AUTH_JWT_KEY_REVOKED]: 'Token was signed with a revoked key',
  [JWT_ERROR_CODES.AUTH_JWT_KEY_EXPIRED]: 'Token was signed with an expired key',
  [JWT_ERROR_CODES.AUTH_JWT_ALGORITHM_MISMATCH]: 'Token algorithm does not match key algorithm',
  [JWT_ERROR_CODES.AUTH_JWT_INVALID_TOKEN]: 'Token is invalid or malformed',
  [JWT_ERROR_CODES.AUTH_JWT_MISSING_KEY_ID]: 'Token is missing required key ID header',
  [JWT_ERROR_CODES.AUTH_JWK_NOT_FOUND]: 'No valid signing key found',
  [JWT_ERROR_CODES.AUTH_JWT_SIGNING_ERROR]: 'Failed to sign token',
  [SharedErrorCodes.OAUTH_INVALID_CLIENT]: 'Invalid client credentials',
  [SharedErrorCodes.OAUTH_INVALID_GRANT]: 'Invalid grant type',
  [SharedErrorCodes.OAUTH_INSUFFICIENT_SCOPE]: 'Insufficient scope for this request',
  [SharedErrorCodes.OAUTH_CLIENT_REVOKED]: 'OAuth client has been revoked',
  [SharedErrorCodes.OAUTH_CLIENT_EXPIRED]: 'OAuth client has expired',
  [ErrorCodes.SSO_PROVIDER_NOT_FOUND]: 'SSO provider not found',
  [ErrorCodes.SSO_PROVIDER_INACTIVE]: 'SSO provider is inactive',
  [ErrorCodes.SSO_INVALID_ASSERTION]: 'Invalid SSO assertion',
  [ErrorCodes.SSO_ASSERTION_EXPIRED]: 'SSO assertion has expired',
  [ErrorCodes.SSO_ASSERTION_REPLAYED]: 'SSO assertion has been replayed',
  [ErrorCodes.SSO_INVALID_SIGNATURE]: 'Invalid SSO signature',
  [ErrorCodes.SSO_INVALID_ISSUER]: 'SSO issuer mismatch',
  [ErrorCodes.SSO_INVALID_AUDIENCE]: 'SSO audience mismatch',
  [ErrorCodes.SSO_INVALID_STATE]: 'Invalid SSO state parameter',
  [ErrorCodes.SSO_INVALID_NONCE]: 'Invalid SSO nonce',
  [ErrorCodes.SSO_MISSING_REQUIRED_CLAIM]: 'SSO response missing required claim',
  [ErrorCodes.SSO_TOKEN_EXPIRED]: 'SSO token has expired',
  [ErrorCodes.SSO_TOKEN_INVALID]: 'SSO token is invalid',
  [ErrorCodes.SSO_METADATA_FETCH_FAILED]: 'Failed to fetch SSO metadata',
  [ErrorCodes.SSO_METADATA_INVALID]: 'SSO metadata is invalid',
  [ErrorCodes.SSO_CONFIGURATION_ERROR]: 'SSO configuration error',
  [ErrorCodes.SSO_ACCOUNT_LINKING_FAILED]: 'SSO account linking failed',
  [ErrorCodes.SSO_JIT_PROVISIONING_DENIED]: 'JIT provisioning denied for SSO user',
  [ErrorCodes.SCIM_INVALID_REQUEST]: 'Invalid SCIM request',
  [ErrorCodes.SCIM_USER_NOT_FOUND]: 'SCIM user not found',
  [ErrorCodes.SCIM_USER_ALREADY_EXISTS]: 'SCIM user already exists',
  [ErrorCodes.SCIM_GROUP_NOT_FOUND]: 'SCIM group not found',
  [ErrorCodes.SCIM_GROUP_ALREADY_EXISTS]: 'SCIM group already exists',
  [ErrorCodes.SCIM_INVALID_FILTER]: 'Invalid SCIM filter syntax',
  [ErrorCodes.SCIM_TENANT_MISMATCH]: 'SCIM tenant mismatch',
  [ErrorCodes.SCIM_IDEMPOTENCY_KEY_CONFLICT]: 'SCIM idempotency key conflict',
  [ErrorCodes.SCIM_ROLE_ESCALATION_BLOCKED]: 'SCIM role escalation blocked by policy',
  [ErrorCodes.SCIM_ATTRIBUTE_MUTABILITY_VIOLATION]: 'SCIM attribute mutability violation',
  [ErrorCodes.SCIM_JIT_CONFLICT]: 'SCIM/JIT reconciliation conflict',
  [ErrorCodes.SSO_VALIDATION_REQUIRED]: 'SSO validation required before activation',
  [ErrorCodes.SSO_VALIDATION_STALE]: 'SSO validation is stale, please re-validate',
  [ErrorCodes.SSO_VALIDATION_FAILED]: 'SSO validation failed',
  [ErrorCodes.SSO_ACTIVATION_BLOCKED]:
    'SSO activation blocked due to validation requirements not met',
  [ErrorCodes.SSO_METADATA_UNREACHABLE]: 'SSO metadata URL is unreachable',
  [ErrorCodes.SSO_DISCOVERY_FAILED]: 'OIDC discovery failed',
  [ErrorCodes.SSO_JWKS_UNREACHABLE]: 'OIDC JWKS endpoint is unreachable',
  [ErrorCodes.SSO_CERTIFICATE_EXPIRED]: 'SSO certificate has expired',
  [ErrorCodes.SSO_ISSUER_MISMATCH_CONFIG]: 'SSO issuer does not match configuration',
  [ErrorCodes.SSO_AUDIENCE_MISMATCH_CONFIG]: 'SSO audience does not match configuration',
  [ErrorCodes.SCIM_VALIDATION_FAILED]: 'SCIM validation failed',
  [ErrorCodes.SCIM_BASE_URL_UNREACHABLE]: 'SCIM base URL is unreachable',
  [ErrorCodes.SCIM_AUTHENTICATION_FAILED]: 'SCIM authentication failed',
  [ErrorCodes.SCIM_ENDPOINT_UNAVAILABLE]: 'SCIM endpoint is unavailable',
  [ErrorCodes.AUTH_SESSION_IDLE_TIMEOUT]: 'Session has been idle for too long',
  [ErrorCodes.AUTH_SESSION_ABSOLUTE_TIMEOUT]: 'Session has exceeded maximum lifetime',
  [ErrorCodes.AUTH_SESSION_CONCURRENT_LIMIT]: 'Maximum concurrent sessions reached',
  [ErrorCodes.AUTH_SESSION_BINDING_VIOLATION]: 'Session binding violation detected',
  [ErrorCodes.AUTH_SESSION_POLICY_INVALID]: 'Invalid session policy configuration',
  [ErrorCodes.AUTH_MFA_POLICY_INVALID]: 'MFA policy configuration is invalid',
  [ErrorCodes.AUTH_MFA_ENROLLMENT_EXPIRED]: 'MFA enrollment grace period has expired',
  [ErrorCodes.AUTH_STEP_UP_REQUIRED]: 'Step-up authentication required for this action',
  [ErrorCodes.AUTH_STEP_UP_FAILED]: 'Step-up authentication failed',
  [ErrorCodes.AUTH_STEP_UP_EXPIRED]: 'Step-up authentication proof has expired',
  [ErrorCodes.AUTH_ADAPTIVE_MFA_TRIGGERED]: 'Adaptive MFA was triggered due to risk detection',
  [ErrorCodes.AUTH_MFA_METHOD_NOT_ALLOWED]: 'MFA method not allowed by tenant policy',
} as const;

export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
};

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

export const createAppError = (
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
): AppError =>
  new AppError({
    code,
    message: message ?? ErrorMessages[code],
    statusCode: ErrorStatusMap[code],
    ...(details !== undefined && { details }),
  });

export const badRequest = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.INVALID_INPUT, message, details);

export const unauthorized = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.AUTH_UNAUTHORIZED, message, details);

export const forbidden = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.AUTH_FORBIDDEN, message, details);

export const insufficientPermissions = (
  message?: string,
  details?: Record<string, unknown>,
): AppError => createAppError(ErrorCodes.AUTH_INSUFFICIENT_PERMS, message, details);

export const notFound = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.RESOURCE_NOT_FOUND, message, details);

export const conflict = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.CONFLICT, message, details);

export const validationFailed = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.VALIDATION_FAILED, message, details);

export const internalError = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.INTERNAL_SERVER_ERROR, message, details);

export const serviceUnavailable = (message?: string, details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.SERVICE_UNAVAILABLE, message, details);

export const tenantContextMissing = (
  message?: string,
  details?: Record<string, unknown>,
): AppError => createAppError(ErrorCodes.TENANT_CONTEXT_MISSING, message, details);

export const tenantContextInvalid = (
  message?: string,
  details?: Record<string, unknown>,
): AppError => createAppError(ErrorCodes.TENANT_CONTEXT_INVALID, message, details);

export const rateLimitExceeded = (details?: Record<string, unknown>): AppError =>
  createAppError(ErrorCodes.RATE_LIMIT_EXCEEDED, undefined, details);

const isAppError = (error: unknown): error is AppError => error instanceof AppError;
const INVALID_JSON_BODY_ERROR_CODE = 'FST_ERR_CTP_INVALID_JSON_BODY';

const normalizeDetails = (details?: Record<string, unknown>): Record<string, unknown> =>
  details ?? {};

export const createErrorHandler = () =>
  function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    let statusCode = error.statusCode ?? 500;
    let code: string = ErrorCodes.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let details: Record<string, unknown> | undefined;

    if (isAppError(error)) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof ZodError) {
      statusCode = 400;
      code = ErrorCodes.VALIDATION_FAILED;
      message = 'Validation failed';
      details = { issues: error.issues };
    } else if (error.validation) {
      statusCode = 400;
      code = ErrorCodes.VALIDATION_FAILED;
      message = 'Validation failed';
      details = { issues: error.validation };
    } else if (error.code === INVALID_JSON_BODY_ERROR_CODE && statusCode === 400) {
      code = ErrorCodes.VALIDATION_FAILED;
      message = 'Validation failed';
      details = { reason: error.message };
    } else if (statusCode === 404) {
      code = ErrorCodes.NOT_FOUND;
      message = 'Route not found';
    }

    if (statusCode >= 500) {
      request.log.error(
        {
          err: error,
          requestId: request.id,
          code,
          tenantId: request.tenantContext?.tenantId,
          userId: request.tenantContext?.userId,
        },
        'request failed',
      );
    } else {
      request.log.warn(
        {
          err: error,
          requestId: request.id,
          code,
          tenantId: request.tenantContext?.tenantId,
          userId: request.tenantContext?.userId,
        },
        'request error',
      );
    }

    const errorPayload = {
      code,
      message,
      details: normalizeDetails(details),
      requestId: request.id,
    };

    reply.status(statusCode).send({
      success: false,
      error: errorPayload,
    });
  };
