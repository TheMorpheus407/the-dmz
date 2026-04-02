import { ErrorCodes } from '@the-dmz/shared/constants';

import { AppError } from '../../shared/middleware/error-handler.js';

export class EmailIntegrationNotFoundError extends AppError {
  constructor(id: string) {
    super({
      code: ErrorCodes.EMAIL_CONFIG_NOT_FOUND,
      message: `Email integration with id "${id}" not found`,
      statusCode: 404,
    });
    this.name = 'EmailIntegrationNotFoundError';
  }
}

export class EmailConfigInvalidError extends AppError {
  constructor(message: string) {
    super({
      code: ErrorCodes.EMAIL_CONFIG_INVALID,
      message,
      statusCode: 400,
    });
    this.name = 'EmailConfigInvalidError';
  }
}

export class EmailAuthPostureInsufficientError extends AppError {
  constructor(message: string) {
    super({
      code: ErrorCodes.EMAIL_AUTH_POSTURE_INSUFFICIENT,
      message,
      statusCode: 400,
    });
    this.name = 'EmailAuthPostureInsufficientError';
  }
}

export class EmailDkimKeyTooShortError extends AppError {
  constructor(keySize: number, minSize: number) {
    super({
      code: ErrorCodes.EMAIL_DKIM_KEY_TOO_SHORT,
      message: `DKIM key size ${keySize} is below minimum ${minSize} bits`,
      statusCode: 400,
    });
    this.name = 'EmailDkimKeyTooShortError';
  }
}

export class EmailTenantIsolationViolationError extends AppError {
  constructor(message: string) {
    super({
      code: ErrorCodes.EMAIL_TENANT_ISOLATION_VIOLATED,
      message,
      statusCode: 403,
    });
    this.name = 'EmailTenantIsolationViolationError';
  }
}

export class EmailStatusTransitionInvalidError extends AppError {
  constructor(fromStatus: string, toStatus: string) {
    super({
      code: ErrorCodes.EMAIL_STATUS_TRANSITION_INVALID,
      message: `Cannot transition from ${fromStatus} to ${toStatus}`,
      statusCode: 400,
    });
    this.name = 'EmailStatusTransitionInvalidError';
  }
}

export class EmailValidationFailedError extends AppError {
  constructor(failures: Array<{ reason: string; message: string }> | null | undefined) {
    const safeFailures = failures ?? [];
    super({
      code: ErrorCodes.EMAIL_VALIDATION_FAILED,
      message: `Email validation failed: ${safeFailures.map((f) => f.message).join(', ')}`,
      statusCode: 400,
      details: { failures: safeFailures },
    });
    this.name = 'EmailValidationFailedError';
  }
}
