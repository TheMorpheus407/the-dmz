import {
  PrototypePollutionError,
  sanitizeValue,
  type SanitizeValueOptions,
} from '../utils/sanitizer.js';

import { AppError, ErrorCodes } from './error-handler.js';

import type { FastifyRequest } from 'fastify';

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const applySanitizedValue = <T>(currentValue: T, sanitizedValue: T): T => {
  if (!isRecordValue(currentValue) || !isRecordValue(sanitizedValue)) {
    return sanitizedValue;
  }

  const mutableCurrentValue = currentValue as Record<string, unknown>;

  for (const key of Object.keys(mutableCurrentValue)) {
    delete mutableCurrentValue[key];
  }

  for (const [key, value] of Object.entries(sanitizedValue)) {
    mutableCurrentValue[key] = value;
  }

  return currentValue as T;
};

export async function sanitizeInputHook(request: FastifyRequest): Promise<void> {
  const routeSanitizeConfig = request.routeOptions.config?.sanitize;
  const sanitizeOptions: SanitizeValueOptions = {
    enforcePrototypePollution: routeSanitizeConfig?.enforcePrototypePollution ?? true,
  };
  if (routeSanitizeConfig?.skipHtmlFields !== undefined) {
    sanitizeOptions.skipHtmlFields = routeSanitizeConfig.skipHtmlFields;
  }

  try {
    request.body = applySanitizedValue(request.body, sanitizeValue(request.body, sanitizeOptions));
    request.query = applySanitizedValue(
      request.query,
      sanitizeValue(request.query, sanitizeOptions),
    );
    request.params = applySanitizedValue(
      request.params,
      sanitizeValue(request.params, sanitizeOptions),
    );
  } catch (error) {
    if (error instanceof PrototypePollutionError) {
      throw new AppError({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Request payload contains forbidden patterns',
        statusCode: 400,
        details: {
          reason: error.message,
          field: error.field,
        },
      });
    }

    throw error;
  }
}
