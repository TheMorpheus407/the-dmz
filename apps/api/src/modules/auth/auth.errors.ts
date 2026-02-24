import { ErrorCodes } from '@the-dmz/shared';

import { AppError } from '../../shared/middleware/error-handler.js';

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
