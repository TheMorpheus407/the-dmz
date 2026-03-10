import type { AppConfig } from '../../config.js';
import type {
  AiPipelineLogger,
  ClaudeClient,
  ClaudeCompletionRequest,
  ClaudeCompletionResult,
  ClaudeModelAlias,
} from './ai-pipeline.types.js';

export interface ClaudeTransportRequest {
  model: string;
  maxTokens: number;
  temperature?: number;
  systemPrompt: string;
  userPrompt: string;
  requestId?: string;
}

export type ClaudeTransport = (
  request: ClaudeTransportRequest,
) => Promise<Omit<ClaudeCompletionResult, 'latencyMs' | 'estimatedCostUsd'>>;

const noOpLogger: AiPipelineLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const ANTHROPIC_MODEL_ALIASES: Record<ClaudeModelAlias, string> = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
  opus: 'claude-opus-4-6',
};

const MODEL_PRICING_PER_MILLION_TOKENS: Array<{
  matcher: RegExp;
  inputUsd: number;
  outputUsd: number;
}> = [
  { matcher: /^claude-sonnet-4-6(?:-|$)/, inputUsd: 3, outputUsd: 15 },
  { matcher: /^claude-haiku-4-5(?:-|$)/, inputUsd: 1, outputUsd: 5 },
  { matcher: /^claude-opus-4-6(?:-|$)/, inputUsd: 5, outputUsd: 25 },
];
const MAX_CLAUDE_RETRIES = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }

  return undefined;
};

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  return undefined;
};

const readErrorMessage = (payload: Record<string, unknown>): string => {
  const errorValue = payload['error'];
  if (isRecord(errorValue)) {
    return readString(errorValue['message']) ?? 'Anthropic request failed';
  }

  return `Anthropic request failed with status ${readNumber(payload['status']) ?? 'unknown'}`;
};

export const resolveAnthropicModel = (
  config: AppConfig,
  task: ClaudeCompletionRequest['task'],
  override?: string,
): string => {
  const configuredModel =
    override ??
    (task === 'classification' ? config.AI_CLASSIFICATION_MODEL : config.AI_GENERATION_MODEL);
  const normalizedModel = configuredModel.trim().toLowerCase();

  if (normalizedModel in ANTHROPIC_MODEL_ALIASES) {
    return ANTHROPIC_MODEL_ALIASES[normalizedModel as ClaudeModelAlias];
  }

  return configuredModel;
};

export const estimateAnthropicCostUsd = (
  model: string,
  inputTokens?: number,
  outputTokens?: number,
): number | undefined => {
  const pricing = MODEL_PRICING_PER_MILLION_TOKENS.find((entry) => entry.matcher.test(model));
  if (!pricing) {
    return undefined;
  }

  const totalCost =
    ((inputTokens ?? 0) / 1_000_000) * pricing.inputUsd +
    ((outputTokens ?? 0) / 1_000_000) * pricing.outputUsd;

  return Number(totalCost.toFixed(6));
};

export const createFetchClaudeTransport = (options: {
  credential: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): ClaudeTransport => {
  const fetchImpl = options.fetchImpl ?? fetch;

  return async (request) => {
    const response = await fetchImpl(`${options.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': options.credential,
        ...(request.requestId ? { 'x-request-id': request.requestId } : {}),
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0.2,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      }),
    });

    const payload = (await response.json()) as unknown;
    if (!isRecord(payload)) {
      throw new Error(`Anthropic request failed with status ${response.status}`);
    }

    if (!response.ok) {
      const errorMessage = readErrorMessage({
        ...payload,
        status: response.status,
      });
      throw new Error(errorMessage);
    }

    const content = Array.isArray(payload['content']) ? payload['content'] : [];
    const text = content
      .map((entry) => {
        if (!isRecord(entry)) {
          return '';
        }

        return typeof entry['text'] === 'string' ? entry['text'] : '';
      })
      .join('')
      .trim();

    const usage = isRecord(payload['usage']) ? payload['usage'] : undefined;
    const inputTokens = usage ? readNumber(usage['input_tokens']) : undefined;
    const outputTokens = usage ? readNumber(usage['output_tokens']) : undefined;

    return {
      text,
      model: readString(payload['model']) ?? request.model,
      ...(inputTokens !== undefined ? { inputTokens } : {}),
      ...(outputTokens !== undefined ? { outputTokens } : {}),
    };
  };
};

export const createClaudeClient = (options: {
  config: AppConfig;
  logger?: AiPipelineLogger;
  transport?: ClaudeTransport;
  sleep?: (ms: number) => Promise<void>;
}): ClaudeClient => {
  const logger = options.logger ?? noOpLogger;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const transport =
    options.transport ??
    (options.config.ANTHROPIC_API_KEY
      ? createFetchClaudeTransport({
          credential: options.config.ANTHROPIC_API_KEY,
          baseUrl: options.config.ANTHROPIC_API_URL,
        })
      : undefined);

  return {
    complete: async (request) => {
      if (!transport) {
        throw new Error('Anthropic API key is not configured');
      }

      const maxRetries = Math.min(MAX_CLAUDE_RETRIES, Math.max(0, options.config.AI_MAX_RETRIES));
      const maxAttempts = maxRetries + 1;
      const model = resolveAnthropicModel(options.config, request.task, request.model);
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const startedAt = Date.now();

        try {
          const result = await transport({
            model,
            maxTokens: request.maxTokens,
            ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
            systemPrompt: request.systemPrompt,
            userPrompt: request.userPrompt,
            ...(request.requestId ? { requestId: request.requestId } : {}),
          });

          const latencyMs = Date.now() - startedAt;
          const estimatedCostUsd = estimateAnthropicCostUsd(
            result.model,
            result.inputTokens,
            result.outputTokens,
          );
          logger.info(
            {
              requestId: request.requestId,
              task: request.task,
              model: result.model,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
              latencyMs,
              estimatedCostUsd,
            },
            'Claude request completed',
          );

          return {
            ...result,
            latencyMs,
            ...(estimatedCostUsd !== undefined ? { estimatedCostUsd } : {}),
          };
        } catch (error) {
          lastError = error;
          logger.warn(
            {
              requestId: request.requestId,
              task: request.task,
              model,
              attempt,
              maxRetries,
              maxAttempts,
              error: error instanceof Error ? error.message : String(error),
            },
            'Claude request failed',
          );

          if (attempt < maxAttempts) {
            await sleep(options.config.AI_RETRY_DELAY_MS * 2 ** (attempt - 1));
          }
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error('Claude request failed after retries');
    },
  };
};
