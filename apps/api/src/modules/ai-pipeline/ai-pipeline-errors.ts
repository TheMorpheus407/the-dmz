import type { SafetyValidationResult } from './ai-pipeline.types.js';

export class SafetyRejectionError extends Error {
  public readonly result: SafetyValidationResult;

  public constructor(result: SafetyValidationResult) {
    super(`Generated content failed safety validation: ${result.flags.join(', ')}`);
    this.name = 'SafetyRejectionError';
    this.result = result;
  }
}

export interface InvalidGeneratedOutputErrorTelemetry {
  requestId: string;
  tenantId: string;
  category: string;
  failureCategory?: string;
  attempt?: number;
  maxAttempts?: number;
}

export class InvalidGeneratedOutputError extends Error {
  public readonly telemetry: InvalidGeneratedOutputErrorTelemetry;

  public constructor(message: string, telemetry: InvalidGeneratedOutputErrorTelemetry) {
    super(message);
    this.name = 'InvalidGeneratedOutputError';
    this.telemetry = telemetry;
  }
}

export class MissingPromptTemplateError extends Error {
  public constructor() {
    super('No active prompt template matched the request');
    this.name = 'MissingPromptTemplateError';
  }
}

export class InvalidPromptTemplateSchemaError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidPromptTemplateSchemaError';
  }
}
