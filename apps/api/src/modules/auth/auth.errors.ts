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
