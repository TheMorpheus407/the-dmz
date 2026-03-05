import { ErrorCodes } from '@the-dmz/shared/constants';

export class EmailIntegrationNotFoundError extends Error {
  code = ErrorCodes.EMAIL_CONFIG_NOT_FOUND;
  statusCode = 404;

  constructor(id: string) {
    super(`Email integration with id "${id}" not found`);
    this.name = 'EmailIntegrationNotFoundError';
  }
}

export class EmailConfigInvalidError extends Error {
  code = ErrorCodes.EMAIL_CONFIG_INVALID;
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'EmailConfigInvalidError';
  }
}

export class EmailAuthPostureInsufficientError extends Error {
  code = ErrorCodes.EMAIL_AUTH_POSTURE_INSUFFICIENT;
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'EmailAuthPostureInsufficientError';
  }
}

export class EmailDkimKeyTooShortError extends Error {
  code = ErrorCodes.EMAIL_DKIM_KEY_TOO_SHORT;
  statusCode = 400;

  constructor(keySize: number, minSize: number) {
    super(`DKIM key size ${keySize} is below minimum ${minSize} bits`);
    this.name = 'EmailDkimKeyTooShortError';
  }
}

export class EmailTenantIsolationViolationError extends Error {
  code = ErrorCodes.EMAIL_TENANT_ISOLATION_VIOLATED;
  statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = 'EmailTenantIsolationViolationError';
  }
}

export class EmailStatusTransitionInvalidError extends Error {
  code = ErrorCodes.EMAIL_STATUS_TRANSITION_INVALID;
  statusCode = 400;

  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition from ${fromStatus} to ${toStatus}`);
    this.name = 'EmailStatusTransitionInvalidError';
  }
}

export class EmailValidationFailedError extends Error {
  code = ErrorCodes.EMAIL_VALIDATION_FAILED;
  statusCode = 400;

  constructor(failures: Array<{ reason: string; message: string }>) {
    super(`Email validation failed: ${failures.map((f) => f.message).join(', ')}`);
    this.name = 'EmailValidationFailedError';
    this.failures = failures;
  }

  failures: Array<{ reason: string; message: string }>;
}

export const EMAIL_ERROR_CODES = {
  CONFIG_INVALID: ErrorCodes.EMAIL_CONFIG_INVALID,
  CONFIG_NOT_FOUND: ErrorCodes.EMAIL_CONFIG_NOT_FOUND,
  AUTH_POSTURE_INSUFFICIENT: ErrorCodes.EMAIL_AUTH_POSTURE_INSUFFICIENT,
  DKIM_KEY_TOO_SHORT: ErrorCodes.EMAIL_DKIM_KEY_TOO_SHORT,
  DKIM_KEY_INVALID: ErrorCodes.EMAIL_DKIM_KEY_INVALID,
  SPF_NOT_CONFIGURED: ErrorCodes.EMAIL_SPF_NOT_CONFIGURED,
  SPF_INVALID: ErrorCodes.EMAIL_SPF_INVALID,
  DMARC_NOT_CONFIGURED: ErrorCodes.EMAIL_DMARC_NOT_CONFIGURED,
  DMARC_INVALID: ErrorCodes.EMAIL_DMARC_INVALID,
  TENANT_ISOLATION_VIOLATED: ErrorCodes.EMAIL_TENANT_ISOLATION_VIOLATED,
  CREDENTIAL_EXPIRED: ErrorCodes.EMAIL_CREDENTIAL_EXPIRED,
  CREDENTIAL_INVALID: ErrorCodes.EMAIL_CREDENTIAL_INVALID,
  CREDENTIAL_REVOKED: ErrorCodes.EMAIL_CREDENTIAL_REVOKED,
  GATEWAY_CONFIG_INVALID: ErrorCodes.EMAIL_GATEWAY_CONFIG_INVALID,
  GATEWAY_NOT_SUPPORTED: ErrorCodes.EMAIL_GATEWAY_NOT_SUPPORTED,
  STATUS_TRANSITION_INVALID: ErrorCodes.EMAIL_STATUS_TRANSITION_INVALID,
  VALIDATION_FAILED: ErrorCodes.EMAIL_VALIDATION_FAILED,
  NETWORK_UNREACHABLE: ErrorCodes.EMAIL_NETWORK_UNREACHABLE,
  RATE_LIMIT_EXCEEDED: ErrorCodes.EMAIL_RATE_LIMIT_EXCEEDED,
} as const;
