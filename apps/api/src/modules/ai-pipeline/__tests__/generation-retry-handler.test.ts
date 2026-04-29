import { describe, expect, it } from 'vitest';

import {
  buildGenerationFailureCategory,
  clampGenerationRetries,
  getGenerationTemperature,
  formatGenerationAttemptErrorMessage,
  buildGenerationRetryPrompt,
  mergeUsageMetrics,
} from '../generation-retry-handler.js';
import {
  InvalidGeneratedOutputError,
  InvalidPromptTemplateSchemaError,
  MissingPromptTemplateError,
  SafetyRejectionError,
} from '../ai-pipeline-errors.js';

describe('generation-retry-handler', () => {
  describe('getGenerationTemperature', () => {
    it('returns 0.2 for attemptIndex 0', () => {
      expect(getGenerationTemperature(0)).toBe(0.2);
    });

    it('returns 0.1 for attemptIndex 1', () => {
      expect(getGenerationTemperature(1)).toBe(0.1);
    });

    it('returns 0.05 for attemptIndex 2', () => {
      expect(getGenerationTemperature(2)).toBe(0.05);
    });

    it('returns 0 for attemptIndex 3', () => {
      expect(getGenerationTemperature(3)).toBe(0);
    });

    it('caps at last temperature for attemptIndex greater than array length', () => {
      expect(getGenerationTemperature(4)).toBe(0);
      expect(getGenerationTemperature(5)).toBe(0);
      expect(getGenerationTemperature(10)).toBe(0);
      expect(getGenerationTemperature(100)).toBe(0);
    });

    it('returns last temperature for negative indices (falls through to default)', () => {
      expect(getGenerationTemperature(-1)).toBe(0);
      expect(getGenerationTemperature(-5)).toBe(0);
    });
  });

  describe('clampGenerationRetries', () => {
    it('returns 0 for negative input', () => {
      expect(clampGenerationRetries(-1)).toBe(0);
      expect(clampGenerationRetries(-10)).toBe(0);
    });

    it('returns the input value when within bounds', () => {
      expect(clampGenerationRetries(0)).toBe(0);
      expect(clampGenerationRetries(1)).toBe(1);
      expect(clampGenerationRetries(2)).toBe(2);
      expect(clampGenerationRetries(3)).toBe(3);
    });

    it('caps at MAX_GENERATION_RETRIES (3) for values above', () => {
      expect(clampGenerationRetries(4)).toBe(3);
      expect(clampGenerationRetries(10)).toBe(3);
      expect(clampGenerationRetries(100)).toBe(3);
    });
  });

  describe('buildGenerationFailureCategory', () => {
    it('returns invalid_output for InvalidPromptTemplateSchemaError', () => {
      const error = new InvalidPromptTemplateSchemaError('schema mismatch');
      expect(buildGenerationFailureCategory(error)).toBe('invalid_output');
    });

    it('returns template_unavailable for MissingPromptTemplateError', () => {
      const error = new MissingPromptTemplateError();
      expect(buildGenerationFailureCategory(error)).toBe('template_unavailable');
    });

    it('returns safety_rejection for SafetyRejectionError', () => {
      const error = new SafetyRejectionError({ ok: false, flags: ['PHISHING'], findings: [] });
      expect(buildGenerationFailureCategory(error)).toBe('safety_rejection');
    });

    it('returns invalid_output for InvalidGeneratedOutputError', () => {
      const error = new InvalidGeneratedOutputError('validation failed');
      expect(buildGenerationFailureCategory(error)).toBe('invalid_output');
    });

    it('returns invalid_output for structured output validation errors', () => {
      const error1 = new Error('Structured output validation failed');
      expect(buildGenerationFailureCategory(error1)).toBe('invalid_output');

      const error2 = new Error('Invalid output schema');
      expect(buildGenerationFailureCategory(error2)).toBe('invalid_output');

      const error3 = new Error('Unexpected token');
      expect(buildGenerationFailureCategory(error3)).toBe('invalid_output');
    });

    it('returns provider_unavailable for missing API key error', () => {
      const error = new Error('Anthropic API key is not configured');
      expect(buildGenerationFailureCategory(error)).toBe('provider_unavailable');
    });

    it('returns provider_error for unknown errors', () => {
      expect(buildGenerationFailureCategory(new Error('some other error'))).toBe(
        'provider_error',
      );
      expect(buildGenerationFailureCategory('string error')).toBe('provider_error');
      expect(buildGenerationFailureCategory(null)).toBe('provider_error');
      expect(buildGenerationFailureCategory(undefined)).toBe('provider_error');
    });
  });

  describe('formatGenerationAttemptErrorMessage', () => {
    it('returns error message for regular errors', () => {
      const error = new Error('something went wrong');
      expect(formatGenerationAttemptErrorMessage(error)).toBe('something went wrong');
    });

    it('returns stringified error for non-Error values', () => {
      expect(formatGenerationAttemptErrorMessage('string error')).toBe('string error');
      expect(formatGenerationAttemptErrorMessage(123)).toBe('123');
      expect(formatGenerationAttemptErrorMessage(null)).toBe('null');
      expect(formatGenerationAttemptErrorMessage(undefined)).toBe('undefined');
    });

    it('formats SafetyRejectionError with findings', () => {
      const error = new SafetyRejectionError({
        ok: false,
        flags: ['PHISHING'],
        findings: [
          { code: 'PHISHING', message: 'Detected phishing content' },
          { code: 'SUSPICIOUS', path: 'body.text', message: 'Suspicious link' },
        ],
      });
      const message = formatGenerationAttemptErrorMessage(error);
      expect(message).toContain('Detected phishing content');
      expect(message).toContain('SUSPICIOUS at body.text: Suspicious link');
    });

    it('returns SafetyRejectionError message when no findings', () => {
      const error = new SafetyRejectionError({ ok: false, flags: ['PHISHING'], findings: [] });
      error.message = 'Safety check failed';
      expect(formatGenerationAttemptErrorMessage(error)).toBe('Safety check failed');
    });
  });

  describe('buildGenerationRetryPrompt', () => {
    it('builds retry prompt with correct structure', () => {
      const prompt = {
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Generate an email about security.',
      };
      const result = buildGenerationRetryPrompt(prompt, 1, 3, new Error('validation failed'));

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userPrompt');
      expect(result).toHaveProperty('promptHash');
      expect(typeof result.promptHash).toBe('string');
    });

    it('includes retry attempt information in user prompt', () => {
      const prompt = {
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Generate an email.',
      };
      const result = buildGenerationRetryPrompt(prompt, 2, 5, new Error('invalid output'));

      expect(result.userPrompt).toContain('Retry attempt 2 of 5');
      expect(result.userPrompt).toContain('invalid output');
    });

    it('generates different hash for different prompts', () => {
      const prompt1 = { systemPrompt: 'System 1', userPrompt: 'User 1' };
      const prompt2 = { systemPrompt: 'System 2', userPrompt: 'User 2' };

      const hash1 = buildGenerationRetryPrompt(prompt1, 1, 3, new Error('err'));
      const hash2 = buildGenerationRetryPrompt(prompt2, 1, 3, new Error('err'));

      expect(hash1.promptHash).not.toBe(hash2.promptHash);
    });

    it('generates same hash for same prompt content', () => {
      const prompt = { systemPrompt: 'Same system', userPrompt: 'Same user' };

      const hash1 = buildGenerationRetryPrompt(prompt, 1, 3, new Error('err'));
      const hash2 = buildGenerationRetryPrompt(prompt, 1, 3, new Error('err'));

      expect(hash1.promptHash).toBe(hash2.promptHash);
    });
  });

  describe('mergeUsageMetrics', () => {
    it('merges usage metrics with all fields defined', () => {
      const current: { inputTokens?: number; outputTokens?: number } = {
        inputTokens: 100,
        outputTokens: 200,
      };
      const next = { inputTokens: 50, outputTokens: 75 };

      const result = mergeUsageMetrics(current, next);

      expect(result.inputTokens).toBe(150);
      expect(result.outputTokens).toBe(275);
    });

    it('handles undefined values in current metrics', () => {
      const current = {};
      const next = { inputTokens: 50, outputTokens: 75 };

      const result = mergeUsageMetrics(current, next);

      expect(result.inputTokens).toBe(50);
      expect(result.outputTokens).toBe(75);
    });

    it('handles undefined values in next metrics', () => {
      const current = { inputTokens: 100, outputTokens: 200 };
      const next = {};

      const result = mergeUsageMetrics(current, next);

      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(200);
    });

    it('merges all metric fields', () => {
      const current = {
        inputTokens: 100,
        outputTokens: 200,
        latencyMs: 1000,
        estimatedCostUsd: 0.5,
      };
      const next = {
        inputTokens: 50,
        outputTokens: 75,
        latencyMs: 500,
        estimatedCostUsd: 0.25,
      };

      const result = mergeUsageMetrics(current, next);

      expect(result.inputTokens).toBe(150);
      expect(result.outputTokens).toBe(275);
      expect(result.latencyMs).toBe(1500);
      expect(result.estimatedCostUsd).toBe(0.75);
    });

    it('rounds estimated cost to 6 decimal places', () => {
      const current = { estimatedCostUsd: 0.1234567 };
      const next = { estimatedCostUsd: 0.7654321 };

      const result = mergeUsageMetrics(current, next);

      expect(result.estimatedCostUsd).toBe(0.888889);
    });
  });
});