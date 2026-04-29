import { createHash } from 'node:crypto';

import {
  InvalidGeneratedOutputError,
  InvalidPromptTemplateSchemaError,
  MissingPromptTemplateError,
  SafetyRejectionError,
} from './ai-pipeline-errors.js';

import type { GenerationFailureCategory, UsageMetrics } from './ai-pipeline.types.js';

const MAX_GENERATION_RETRIES = 3;
const generationRetryTemperatures = [0.2, 0.1, 0.05, 0] as const;

export const buildGenerationFailureCategory = (error: unknown): GenerationFailureCategory => {
  if (error instanceof InvalidPromptTemplateSchemaError) {
    return 'invalid_output';
  }

  if (error instanceof MissingPromptTemplateError) {
    return 'template_unavailable';
  }

  if (error instanceof SafetyRejectionError) {
    return 'safety_rejection';
  }

  if (error instanceof InvalidGeneratedOutputError) {
    return 'invalid_output';
  }

  if (
    error instanceof Error &&
    (error.message.includes('Structured output validation failed') ||
      error.message.includes('Invalid output schema') ||
      error.message.includes('Unexpected token'))
  ) {
    return 'invalid_output';
  }

  if (error instanceof Error && error.message.includes('Anthropic API key is not configured')) {
    return 'provider_unavailable';
  }

  return 'provider_error';
};

export const clampGenerationRetries = (configuredRetries: number): number =>
  Math.min(MAX_GENERATION_RETRIES, Math.max(0, configuredRetries));

export const getGenerationTemperature = (attemptIndex: number): number => {
  const resolved =
    generationRetryTemperatures[Math.min(attemptIndex, generationRetryTemperatures.length - 1)];

  return resolved ?? generationRetryTemperatures[generationRetryTemperatures.length - 1]!;
};

export const formatGenerationAttemptErrorMessage = (error: unknown): string => {
  if (error instanceof SafetyRejectionError) {
    const findings = error.result.findings
      .map((finding) =>
        finding.path ? `${finding.code} at ${finding.path}: ${finding.message}` : finding.message,
      )
      .filter((entry) => entry.length > 0);

    return findings.join('; ') || error.message;
  }

  return error instanceof Error ? error.message : String(error);
};

export const buildGenerationRetryPrompt = (
  prompt: {
    systemPrompt: string;
    userPrompt: string;
  },
  attemptNumber: number,
  maxAttempts: number,
  error: unknown,
): {
  systemPrompt: string;
  userPrompt: string;
  promptHash: string;
} => {
  const failureCategory = buildGenerationFailureCategory(error);
  const retrySummary = formatGenerationAttemptErrorMessage(error);
  const systemPrompt = `${prompt.systemPrompt.trim()}\n\nRetry policy:\n- The previous response was invalid.\n- Return only a single JSON object that exactly matches the provided schema.\n- Do not include markdown, code fences, commentary, or additional keys.\n- Use only fictional organizations and reserved domains (.example, .invalid, .test).\n- Do not include phone numbers, IP addresses, or operational instructions.`;
  const userPrompt =
    `${prompt.userPrompt}\n\n` +
    `Retry attempt ${attemptNumber} of ${maxAttempts}.\n` +
    `Previous validation category: ${failureCategory}.\n` +
    `Previous validation feedback: ${retrySummary}\n` +
    'Lower creativity and prioritize strict schema compliance and safety. Respond with raw JSON only.';
  const promptHash = createHash('sha256').update(`${systemPrompt}\n${userPrompt}`).digest('hex');

  return {
    systemPrompt,
    userPrompt,
    promptHash,
  };
};

export const mergeUsageMetrics = (current: UsageMetrics, next: UsageMetrics): UsageMetrics => {
  const inputTokens =
    current.inputTokens !== undefined || next.inputTokens !== undefined
      ? (current.inputTokens ?? 0) + (next.inputTokens ?? 0)
      : undefined;
  const outputTokens =
    current.outputTokens !== undefined || next.outputTokens !== undefined
      ? (current.outputTokens ?? 0) + (next.outputTokens ?? 0)
      : undefined;
  const latencyMs =
    current.latencyMs !== undefined || next.latencyMs !== undefined
      ? (current.latencyMs ?? 0) + (next.latencyMs ?? 0)
      : undefined;
  const estimatedCostUsd =
    current.estimatedCostUsd !== undefined || next.estimatedCostUsd !== undefined
      ? Number(((current.estimatedCostUsd ?? 0) + (next.estimatedCostUsd ?? 0)).toFixed(6))
      : undefined;

  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(latencyMs !== undefined ? { latencyMs } : {}),
    ...(estimatedCostUsd !== undefined ? { estimatedCostUsd } : {}),
  };
};
