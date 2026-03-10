import { describe, expect, it, vi } from 'vitest';

import { loadConfig, type AppConfig } from '../../../config.js';
import {
  createClaudeClient,
  estimateAnthropicCostUsd,
  resolveAnthropicModel,
} from '../claude-client.service.js';

const createTestConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ANTHROPIC_API_KEY: 'test-key',
    AI_MAX_RETRIES: 3,
    AI_RETRY_DELAY_MS: 1,
    ...overrides,
  };
};

describe('claude-client.service', () => {
  it('maps internal generation aliases to official Anthropic model IDs', async () => {
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient error'))
      .mockRejectedValueOnce(new Error('still failing'))
      .mockResolvedValue({
        text: '{"ok":true}',
        model: 'claude-sonnet-4-6',
        inputTokens: 21,
        outputTokens: 34,
      });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClaudeClient({
      config: createTestConfig({ AI_GENERATION_MODEL: 'sonnet' }),
      transport,
      sleep,
    });

    const result = await client.complete({
      task: 'generation',
      systemPrompt: 'system',
      userPrompt: 'user',
      maxTokens: 128,
    });

    expect(transport).toHaveBeenCalledTimes(3);
    expect(transport.mock.calls[0]?.[0].model).toBe('claude-sonnet-4-6');
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('{"ok":true}');
    expect(result.inputTokens).toBe(21);
    expect(result.outputTokens).toBe(34);
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('uses the mapped classification model for classification calls', async () => {
    const transport = vi.fn().mockResolvedValue({
      text: '{"difficulty":3}',
      model: 'claude-haiku-4-5-20251001',
    });
    const client = createClaudeClient({
      config: createTestConfig({ AI_CLASSIFICATION_MODEL: 'haiku' }),
      transport,
    });

    await client.complete({
      task: 'classification',
      systemPrompt: 'system',
      userPrompt: 'user',
      maxTokens: 64,
      temperature: 0,
    });

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[0].model).toBe('claude-haiku-4-5-20251001');
  });

  it('clamps retries to three extra attempts even when config is higher', async () => {
    const transport = vi.fn().mockRejectedValue(new Error('boom'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createClaudeClient({
      config: createTestConfig({ AI_MAX_RETRIES: 5 }),
      transport,
      sleep,
    });

    await expect(
      client.complete({
        task: 'generation',
        systemPrompt: 'system',
        userPrompt: 'user',
        maxTokens: 32,
      }),
    ).rejects.toThrow('boom');

    expect(transport).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('passes explicit Anthropic model IDs through unchanged', () => {
    const config = createTestConfig({
      AI_GENERATION_MODEL: 'claude-sonnet-4-6',
      AI_CLASSIFICATION_MODEL: 'claude-haiku-4-5',
    });

    expect(resolveAnthropicModel(config, 'generation')).toBe('claude-sonnet-4-6');
    expect(resolveAnthropicModel(config, 'classification')).toBe('claude-haiku-4-5');
  });

  it('estimates Anthropic request cost from token usage', () => {
    expect(estimateAnthropicCostUsd('claude-sonnet-4-6', 1_000_000, 1_000_000)).toBe(18);
    expect(estimateAnthropicCostUsd('claude-haiku-4-5-20251001', 500_000, 500_000)).toBe(3);
  });
});
