import { ErrorCodes, JWT_ERROR_CODES } from '@the-dmz/shared';
import { PASSWORD_RECOVERY_ERROR_CODES } from '@the-dmz/shared/contracts';

import { AppError } from '../../shared/middleware/error-handler.js';

export class OAuthError extends AppError {
  constructor(options: {
    code?: string;
    message: string;
    statusCode?: number;
    details?: Record<string, unknown>;
  }) {
    super({
      code: options.code ?? ErrorCodes.OAUTH_INVALID_CLIENT,
      message: options.message,
      statusCode: options.statusCode ?? 401,
      ...(options.details !== undefined && { details: options.details }),
    });
  }
}

export class OAuthInvalidClientError extends OAuthError {
  constructor() {
    super({
      code: ErrorCodes.OAUTH_INVALID_CLIENT,
      message: 'Invalid client credentials',
      statusCode: 401,
    });
  }
}

export class OAuthInvalidGrantError extends OAuthError {
  constructor() {
    super({
      code: ErrorCodes.OAUTH_INVALID_GRANT,
      message: 'Invalid grant type',
      statusCode: 400,
    });
  }
}

export class OAuthInsufficientScopeError extends OAuthError {
  constructor(requestedScope: string, requiredScope: string) {
    super({
      code: ErrorCodes.OAUTH_INSUFFICIENT_SCOPE,
      message: 'Insufficient scope for this request',
      statusCode: 403,
      details: { requestedScope, requiredScope },
    });
  }
}

export class OAuthClientRevokedError extends OAuthError {
  constructor() {
    super({
      code: ErrorCodes.OAUTH_CLIENT_REVOKED,
      message: 'OAuth client has been revoked',
      statusCode: 401,
    });
  }
}

export class OAuthClientExpiredError extends OAuthError {
  constructor() {
    super({
      code: ErrorCodes.OAUTH_CLIENT_EXPIRED,
      message: 'OAuth client has expired',
      statusCode: 401,
    });
  }
}

export class AuthError extends AppError {
  constructor(options: {
    code?: string;
    message: string;
    statusCode?: number;
    details?: Record<string, unknown>;
  }) {
    super({
      code: options.code ?? ErrorCodes.AUTH_UNAUTHORIZED,
      message: options.message,
      statusCode: options.statusCode ?? 401,
      ...(options.details !== undefined && { details: options.details }),
    });
  }
}

export class InvalidKeyIdError extends AuthError {
  constructor(kid: string) {
    super({
      code: JWT_ERROR_CODES.AUTH_JWT_INVALID_KEY_ID,
      message: 'Token contains unknown or invalid key ID',
      statusCode: 401,
      details: { kid, reason: 'invalid_key_id' },
    });
  }
}

export class KeyRevokedError extends AuthError {
  constructor(kid: string) {
    super({
      code: JWT_ERROR_CODES.AUTH_JWT_KEY_REVOKED,
      message: 'Token was signed with a revoked key',
      statusCode: 401,
      details: { kid, reason: 'key_revoked' },
    });
  }
}

export class KeyExpiredError extends AuthError {
  constructor(kid: string) {
    super({
      code: JWT_ERROR_CODES.AUTH_JWT_KEY_EXPIRED,
      message: 'Token was signed with an expired key',
      statusCode: 401,
      details: { kid, reason: 'key_expired' },
    });
  }
}

export class MissingKeyIdError extends AuthError {
  constructor() {
    super({
      code: JWT_ERROR_CODES.AUTH_JWT_MISSING_KEY_ID,
      message: 'Token is missing required key ID header',
      statusCode: 401,
      details: { reason: 'missing_kid' },
    });
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      message: 'Invalid credentials',
      statusCode: 401,
    });
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_SESSION_EXPIRED,
      message: 'Session expired',
      statusCode: 401,
    });
  }
}

export class SessionRevokedError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_SESSION_REVOKED,
      message: 'Session has been revoked',
      statusCode: 401,
    });
  }
}

export class UserExistsError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      message: 'User with this email already exists',
      statusCode: 409,
    });
  }
}

export class UserNotFoundError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      message: 'User not found',
      statusCode: 401,
    });
  }
}

export class MfaRequiredError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_MFA_REQUIRED,
      message: 'MFA verification required for this action',
      statusCode: 403,
    });
  }
}

export class MfaNotEnabledError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_MFA_NOT_ENABLED,
      message: 'MFA is not enabled for this user',
      statusCode: 400,
    });
  }
}

export class WebauthnChallengeExpiredError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_WEBAUTHN_CHALLENGE_EXPIRED,
      message: 'WebAuthn challenge has expired',
      statusCode: 400,
    });
  }
}

export class WebauthnVerificationFailedError extends AuthError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_WEBAUTHN_VERIFICATION_FAILED,
      message: 'WebAuthn verification failed',
      statusCode: 400,
    });
  }
}

export interface PasswordPolicyErrorDetails {
  policyRequirements: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    characterClassesRequired: number;
    characterClassesMet: number;
  };
  violations: string[];
  [key: string]: unknown;
}

export class PasswordPolicyError extends AuthError {
  constructor(details: PasswordPolicyErrorDetails) {
    const code = determinePasswordErrorCode(details.violations);
    super({
      code,
      message: getPasswordErrorMessage(code),
      statusCode: 400,
      details,
    });
  }
}

const determinePasswordErrorCode = (violations: string[]): string => {
  if (violations.some((v) => v.includes('compromised'))) {
    return ErrorCodes.AUTH_PASSWORD_COMPROMISED;
  }
  if (violations.some((v) => v.includes('tooShort') || v.includes('minLength'))) {
    return ErrorCodes.AUTH_PASSWORD_TOO_SHORT;
  }
  if (violations.some((v) => v.includes('tooLong') || v.includes('maxLength'))) {
    return ErrorCodes.AUTH_PASSWORD_TOO_LONG;
  }
  if (violations.length > 0) {
    return ErrorCodes.AUTH_PASSWORD_TOO_WEAK;
  }
  return ErrorCodes.AUTH_PASSWORD_POLICY_VIOLATION;
};

const getPasswordErrorMessage = (code: string): string => {
  const messages: Record<string, string> = {
    [ErrorCodes.AUTH_PASSWORD_TOO_SHORT]: 'Password is below the minimum length requirement',
    [ErrorCodes.AUTH_PASSWORD_TOO_LONG]: 'Password exceeds the maximum length requirement',
    [ErrorCodes.AUTH_PASSWORD_TOO_WEAK]:
      'Password does not meet complexity requirements. Must contain at least 3 of 4: uppercase, lowercase, numbers, special characters.',
    [ErrorCodes.AUTH_PASSWORD_COMPROMISED]:
      'Password found in known data breach. Please choose a different password.',
    [ErrorCodes.AUTH_PASSWORD_POLICY_VIOLATION]: 'Password policy violation',
  };
  return messages[code] ?? 'Password policy violation';
};

export class PasswordResetTokenExpiredError extends AuthError {
  constructor() {
    super({
      code: PASSWORD_RECOVERY_ERROR_CODES.EXPIRED,
      message: 'Password reset token has expired',
      statusCode: 400,
      details: { reason: 'expired' },
    });
  }
}

export class PasswordResetTokenInvalidError extends AuthError {
  constructor() {
    super({
      code: PASSWORD_RECOVERY_ERROR_CODES.INVALID,
      message: 'Password reset token is invalid',
      statusCode: 400,
      details: { reason: 'invalid' },
    });
  }
}

export class PasswordResetTokenAlreadyUsedError extends AuthError {
  constructor() {
    super({
      code: PASSWORD_RECOVERY_ERROR_CODES.ALREADY_USED,
      message: 'Password reset token has already been used',
      statusCode: 400,
      details: { reason: 'already_used' },
    });
  }
}

export class PasswordResetRateLimitedError extends AuthError {
  constructor(retryAfterSeconds: number) {
    super({
      code: PASSWORD_RECOVERY_ERROR_CODES.RATE_LIMITED,
      message: 'Too many password reset requests. Please try again later.',
      statusCode: 429,
      details: { reason: 'rate_limited', retryAfterSeconds },
    });
  }
}
