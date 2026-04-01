import { ErrorCodes } from '@the-dmz/shared/constants';

export class SSOValidationError extends Error {
  code: string;
  statusCode: number;
  correlationId: string | undefined;

  constructor(params: {
    message: string;
    code: string;
    statusCode: number;
    correlationId?: string;
  }) {
    super(params.message);
    this.name = 'SSOValidationError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.correlationId = params.correlationId ?? undefined;
  }
}

export const createProviderNotFoundError = (correlationId?: string) =>
  new SSOValidationError({
    message: 'SSO provider not found',
    code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
    statusCode: 404,
    ...(correlationId !== undefined && { correlationId }),
  });

export const createConfigurationError = (message: string, correlationId?: string) =>
  new SSOValidationError({
    message,
    code: ErrorCodes.SSO_CONFIGURATION_ERROR,
    statusCode: 400,
    ...(correlationId !== undefined && { correlationId }),
  });

export const createInternalError = (message: string, correlationId?: string) =>
  new SSOValidationError({
    message,
    code: ErrorCodes.INTERNAL_ERROR,
    statusCode: 500,
    ...(correlationId !== undefined && { correlationId }),
  });

export const createActivationBlockedError = (message: string, correlationId?: string) =>
  new SSOValidationError({
    message,
    code: ErrorCodes.SSO_ACTIVATION_BLOCKED,
    statusCode: 400,
    ...(correlationId !== undefined && { correlationId }),
  });
