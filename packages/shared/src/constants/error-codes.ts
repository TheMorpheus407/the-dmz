export const ErrorCodeCategory = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  RATE_LIMITING: 'rate_limiting',
  ABUSE: 'abuse',
  SERVER: 'server',
  NETWORK: 'network',
  NOT_FOUND: 'not_found',
  TENANT_BLOCKED: 'tenant_blocked',
} as const;

export type ErrorCodeCategory = (typeof ErrorCodeCategory)[keyof typeof ErrorCodeCategory];

export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_MFA_ALREADY_ENABLED: 'AUTH_MFA_ALREADY_ENABLED',
  AUTH_MFA_NOT_ENABLED: 'AUTH_MFA_NOT_ENABLED',
  AUTH_MFA_INVALID_CODE: 'AUTH_MFA_INVALID_CODE',
  AUTH_MFA_EXPIRED: 'AUTH_MFA_EXPIRED',
  AUTH_WEBAUTHN_CHALLENGE_EXPIRED: 'AUTH_WEBAUTHN_CHALLENGE_EXPIRED',
  AUTH_WEBAUTHN_VERIFICATION_FAILED: 'AUTH_WEBAUTHN_VERIFICATION_FAILED',
  AUTH_WEBAUTHN_NOT_SUPPORTED: 'AUTH_WEBAUTHN_NOT_SUPPORTED',
  AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND: 'AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND',
  AUTH_WEBAUTHN_CREDENTIAL_EXISTS: 'AUTH_WEBAUTHN_CREDENTIAL_EXISTS',
  AUTH_WEBAUTHN_REGISTRATION_FAILED: 'AUTH_WEBAUTHN_REGISTRATION_FAILED',
  AUTH_WEBAUTHN_ASSERTION_FAILED: 'AUTH_WEBAUTHN_ASSERTION_FAILED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  AUTH_CSRF_INVALID: 'AUTH_CSRF_INVALID',
  AUTH_INSUFFICIENT_PERMS: 'AUTH_INSUFFICIENT_PERMS',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_STATE_INVALID: 'GAME_STATE_INVALID',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  TENANT_BLOCKED: 'TENANT_BLOCKED',
  TENANT_CONTEXT_MISSING: 'TENANT_CONTEXT_MISSING',
  TENANT_CONTEXT_INVALID: 'TENANT_CONTEXT_INVALID',
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  AUTH_ABUSE_COOLDOWN: 'AUTH_ABUSE_COOLDOWN',
  AUTH_ABUSE_LOCKED: 'AUTH_ABUSE_LOCKED',
  AUTH_ABUSE_CHALLENGE_REQUIRED: 'AUTH_ABUSE_CHALLENGE_REQUIRED',
  AUTH_ABUSE_IP_BLOCKED: 'AUTH_ABUSE_IP_BLOCKED',
  AUTH_PASSWORD_TOO_SHORT: 'AUTH_PASSWORD_TOO_SHORT',
  AUTH_PASSWORD_TOO_LONG: 'AUTH_PASSWORD_TOO_LONG',
  AUTH_PASSWORD_TOO_WEAK: 'AUTH_PASSWORD_TOO_WEAK',
  AUTH_PASSWORD_COMPROMISED: 'AUTH_PASSWORD_COMPROMISED',
  AUTH_PASSWORD_POLICY_VIOLATION: 'AUTH_PASSWORD_POLICY_VIOLATION',
  OAUTH_INVALID_CLIENT: 'OAUTH_INVALID_CLIENT',
  OAUTH_INVALID_GRANT: 'OAUTH_INVALID_GRANT',
  OAUTH_INSUFFICIENT_SCOPE: 'OAUTH_INSUFFICIENT_SCOPE',
  OAUTH_CLIENT_REVOKED: 'OAUTH_CLIENT_REVOKED',
  OAUTH_CLIENT_EXPIRED: 'OAUTH_CLIENT_EXPIRED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ErrorCodeMetadata {
  category: ErrorCodeCategory;
  retryable: boolean;
  messageKey: string;
}

export const errorCodeMetadata: Record<ErrorCode, ErrorCodeMetadata> = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.invalidCredentials',
  },
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.tokenExpired',
  },
  [ErrorCodes.AUTH_TOKEN_INVALID]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.tokenInvalid',
  },
  [ErrorCodes.AUTH_MFA_REQUIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.mfaRequired',
  },
  [ErrorCodes.AUTH_MFA_ALREADY_ENABLED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.mfaAlreadyEnabled',
  },
  [ErrorCodes.AUTH_MFA_NOT_ENABLED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.mfaNotEnabled',
  },
  [ErrorCodes.AUTH_MFA_INVALID_CODE]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.mfaInvalidCode',
  },
  [ErrorCodes.AUTH_MFA_EXPIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.mfaExpired',
  },
  [ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.webauthnChallengeExpired',
  },
  [ErrorCodes.AUTH_WEBAUTHN_VERIFICATION_FAILED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.webauthnVerificationFailed',
  },
  [ErrorCodes.AUTH_WEBAUTHN_NOT_SUPPORTED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.webauthnNotSupported',
  },
  [ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.webauthnCredentialNotFound',
  },
  [ErrorCodes.AUTH_WEBAUTHN_CREDENTIAL_EXISTS]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.webauthnCredentialExists',
  },
  [ErrorCodes.AUTH_WEBAUTHN_REGISTRATION_FAILED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.webauthnRegistrationFailed',
  },
  [ErrorCodes.AUTH_WEBAUTHN_ASSERTION_FAILED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.webauthnAssertionFailed',
  },
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.accountLocked',
  },
  [ErrorCodes.AUTH_FORBIDDEN]: {
    category: ErrorCodeCategory.AUTHORIZATION,
    retryable: false,
    messageKey: 'errors.auth.forbidden',
  },
  [ErrorCodes.AUTH_UNAUTHORIZED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.unauthorized',
  },
  [ErrorCodes.AUTH_SESSION_EXPIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.sessionExpired',
  },
  [ErrorCodes.AUTH_SESSION_REVOKED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.sessionRevoked',
  },
  [ErrorCodes.AUTH_CSRF_INVALID]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.csrfInvalid',
  },
  [ErrorCodes.AUTH_INSUFFICIENT_PERMS]: {
    category: ErrorCodeCategory.AUTHORIZATION,
    retryable: false,
    messageKey: 'errors.auth.insufficientPerms',
  },
  [ErrorCodes.AUTH_ACCOUNT_SUSPENDED]: {
    category: ErrorCodeCategory.AUTHORIZATION,
    retryable: false,
    messageKey: 'errors.auth.accountSuspended',
  },
  [ErrorCodes.VALIDATION_FAILED]: {
    category: ErrorCodeCategory.VALIDATION,
    retryable: false,
    messageKey: 'errors.validation.failed',
  },
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: {
    category: ErrorCodeCategory.VALIDATION,
    retryable: false,
    messageKey: 'errors.validation.invalidFormat',
  },
  [ErrorCodes.INVALID_INPUT]: {
    category: ErrorCodeCategory.VALIDATION,
    retryable: false,
    messageKey: 'errors.validation.invalidInput',
  },
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: {
    category: ErrorCodeCategory.RATE_LIMITING,
    retryable: true,
    messageKey: 'errors.rateLimit.exceeded',
  },
  [ErrorCodes.GAME_NOT_FOUND]: {
    category: ErrorCodeCategory.NOT_FOUND,
    retryable: false,
    messageKey: 'errors.game.notFound',
  },
  [ErrorCodes.GAME_STATE_INVALID]: {
    category: ErrorCodeCategory.SERVER,
    retryable: false,
    messageKey: 'errors.game.stateInvalid',
  },
  [ErrorCodes.TENANT_NOT_FOUND]: {
    category: ErrorCodeCategory.NOT_FOUND,
    retryable: false,
    messageKey: 'errors.tenant.notFound',
  },
  [ErrorCodes.TENANT_SUSPENDED]: {
    category: ErrorCodeCategory.AUTHORIZATION,
    retryable: false,
    messageKey: 'errors.tenant.suspended',
  },
  [ErrorCodes.TENANT_INACTIVE]: {
    category: ErrorCodeCategory.AUTHORIZATION,
    retryable: false,
    messageKey: 'errors.tenant.inactive',
  },
  [ErrorCodes.TENANT_BLOCKED]: {
    category: ErrorCodeCategory.TENANT_BLOCKED,
    retryable: false,
    messageKey: 'errors.tenant.blocked',
  },
  [ErrorCodes.TENANT_CONTEXT_MISSING]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.tenant.contextMissing',
  },
  [ErrorCodes.TENANT_CONTEXT_INVALID]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.tenant.contextInvalid',
  },
  [ErrorCodes.SYSTEM_INTERNAL_ERROR]: {
    category: ErrorCodeCategory.SERVER,
    retryable: true,
    messageKey: 'errors.system.internalError',
  },
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: {
    category: ErrorCodeCategory.SERVER,
    retryable: true,
    messageKey: 'errors.system.serviceUnavailable',
  },
  [ErrorCodes.INTERNAL_ERROR]: {
    category: ErrorCodeCategory.SERVER,
    retryable: false,
    messageKey: 'errors.server.internalError',
  },
  [ErrorCodes.SERVICE_UNAVAILABLE]: {
    category: ErrorCodeCategory.SERVER,
    retryable: true,
    messageKey: 'errors.server.unavailable',
  },
  [ErrorCodes.AI_GENERATION_FAILED]: {
    category: ErrorCodeCategory.SERVER,
    retryable: true,
    messageKey: 'errors.ai.generationFailed',
  },
  [ErrorCodes.NOT_FOUND]: {
    category: ErrorCodeCategory.NOT_FOUND,
    retryable: false,
    messageKey: 'errors.notFound',
  },
  [ErrorCodes.CONFLICT]: {
    category: ErrorCodeCategory.SERVER,
    retryable: false,
    messageKey: 'errors.conflict',
  },
  [ErrorCodes.AUTH_ABUSE_COOLDOWN]: {
    category: ErrorCodeCategory.RATE_LIMITING,
    retryable: true,
    messageKey: 'errors.auth.abuseCooldown',
  },
  [ErrorCodes.AUTH_ABUSE_LOCKED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.abuseLocked',
  },
  [ErrorCodes.AUTH_ABUSE_CHALLENGE_REQUIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.abuseChallengeRequired',
  },
  [ErrorCodes.AUTH_ABUSE_IP_BLOCKED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: true,
    messageKey: 'errors.auth.abuseIpBlocked',
  },
  [ErrorCodes.AUTH_PASSWORD_TOO_SHORT]: {
    category: ErrorCodeCategory.VALIDATION,
    retryable: false,
    messageKey: 'errors.auth.passwordTooShort',
  },
  [ErrorCodes.AUTH_PASSWORD_TOO_LONG]: {
    category: ErrorCodeCategory.VALIDATION,
    retryable: false,
    messageKey: 'errors.auth.passwordTooLong',
  },
  [ErrorCodes.AUTH_PASSWORD_TOO_WEAK]: {
    category: ErrorCodeCategory.VALIDATION,
    retryable: false,
    messageKey: 'errors.auth.passwordTooWeak',
  },
  [ErrorCodes.AUTH_PASSWORD_COMPROMISED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.auth.passwordCompromised',
  },
  [ErrorCodes.AUTH_PASSWORD_POLICY_VIOLATION]: {
    category: ErrorCodeCategory.VALIDATION,
    retryable: false,
    messageKey: 'errors.auth.passwordPolicyViolation',
  },
  [ErrorCodes.OAUTH_INVALID_CLIENT]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.oauth.invalidClient',
  },
  [ErrorCodes.OAUTH_INVALID_GRANT]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.oauth.invalidGrant',
  },
  [ErrorCodes.OAUTH_INSUFFICIENT_SCOPE]: {
    category: ErrorCodeCategory.AUTHORIZATION,
    retryable: false,
    messageKey: 'errors.oauth.insufficientScope',
  },
  [ErrorCodes.OAUTH_CLIENT_REVOKED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.oauth.clientRevoked',
  },
  [ErrorCodes.OAUTH_CLIENT_EXPIRED]: {
    category: ErrorCodeCategory.AUTHENTICATION,
    retryable: false,
    messageKey: 'errors.oauth.clientExpired',
  },
};

export const allErrorCodes: readonly ErrorCode[] = Object.keys(ErrorCodes) as ErrorCode[];

export const errorCodeCategories: readonly ErrorCodeCategory[] = Object.values(ErrorCodeCategory);
