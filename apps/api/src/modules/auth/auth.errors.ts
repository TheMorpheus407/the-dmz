import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

export class AuthError extends AppError {
  constructor(options: { code?: string; message: string; statusCode?: number }) {
    super({
      code: options.code ?? ErrorCodes.INTERNAL_SERVER_ERROR,
      message: options.message,
      statusCode: options.statusCode ?? 401,
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
