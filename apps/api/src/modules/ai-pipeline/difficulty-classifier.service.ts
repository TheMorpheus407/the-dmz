import { parseStructuredOutput } from './output-parser.service.js';

import type {
  ClaudeClient,
  DifficultyClassificationResult,
  PromptTemplateCategory,
  UsageMetrics,
} from './ai-pipeline.types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const clampDifficulty = (value: number): number => Math.min(5, Math.max(1, Math.round(value)));

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const toUsageMetrics = (input: {
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
}): UsageMetrics => ({
  ...(input.inputTokens !== undefined ? { inputTokens: input.inputTokens } : {}),
  ...(input.outputTokens !== undefined ? { outputTokens: input.outputTokens } : {}),
  ...(input.latencyMs !== undefined ? { latencyMs: input.latencyMs } : {}),
  ...(input.estimatedCostUsd !== undefined ? { estimatedCostUsd: input.estimatedCostUsd } : {}),
});

const countSuspiciousLinks = (content: Record<string, unknown>): number => {
  const links = Array.isArray(content['links']) ? content['links'] : [];

  return links.filter((entry) => isRecord(entry) && entry['is_suspicious'] === true).length;
};

const countFailedAuthSignals = (headers: Record<string, unknown>): number =>
  ['spf', 'dkim', 'dmarc'].filter((key) => headers[key] === 'fail').length;

const countPassedAuthSignals = (headers: Record<string, unknown>): number =>
  ['spf', 'dkim', 'dmarc'].filter((key) => headers[key] === 'pass').length;

const countVerificationHooks = (content: Record<string, unknown>, signals: unknown[]): number => {
  const verificationSignals = signals.filter(
    (entry) =>
      isRecord(entry) &&
      typeof entry['type'] === 'string' &&
      /verification|authentic|trusted|known_pattern/i.test(entry['type']),
  ).length;
  const contentText = JSON.stringify(content);
  const verificationTextMatches = contentText.match(
    /\b(verify|verification|cross-check|ledger|packet|offline|trusted)\b/gi,
  );

  return verificationSignals + (verificationTextMatches?.length ?? 0);
};

const heuristicLegitimateDifficulty = (
  content: Record<string, unknown>,
  baselineDifficulty?: number,
): DifficultyClassificationResult => {
  const headers =
    content['headers'] && typeof content['headers'] === 'object'
      ? (content['headers'] as Record<string, unknown>)
      : {};
  const signals = Array.isArray(content['signals']) ? content['signals'] : [];
  const suspiciousLinks = countSuspiciousLinks(content);
  const passedAuthSignals = countPassedAuthSignals(headers);
  const verificationHooks = countVerificationHooks(content, signals);
  const embeddedDifficulty = readNumber(content['difficulty']);

  let score = clampDifficulty(baselineDifficulty ?? embeddedDifficulty ?? 2);

  if (verificationHooks === 0 || passedAuthSignals === 0 || suspiciousLinks > 0) {
    score += 1;
  }

  return {
    difficulty: clampDifficulty(score),
    source: 'heuristic',
    rationale:
      'Computed from baseline difficulty, verification hooks, authentication signals, and suspicious links for a legitimate email.',
  };
};

const heuristicNonEmailDifficulty = (
  content: Record<string, unknown>,
  baselineDifficulty?: number,
): DifficultyClassificationResult => {
  if (baselineDifficulty !== undefined) {
    return {
      difficulty: clampDifficulty(baselineDifficulty),
      source: 'heuristic',
      rationale: 'Non-email content uses the requested/template baseline difficulty for v1.',
    };
  }

  const embeddedDifficulty = readNumber(content['difficulty']);
  if (embeddedDifficulty !== undefined) {
    return {
      difficulty: clampDifficulty(embeddedDifficulty),
      source: 'heuristic',
      rationale: 'Non-email content uses embedded difficulty metadata when available.',
    };
  }

  return {
    difficulty: 3,
    source: 'heuristic',
    rationale: 'Non-email content defaults to tier 3 when no baseline is available for v1.',
  };
};

const heuristicDifficulty = (
  category: PromptTemplateCategory,
  content: Record<string, unknown>,
  attackType?: string,
  baselineDifficulty?: number,
): DifficultyClassificationResult => {
  if (!category.startsWith('email_')) {
    return heuristicNonEmailDifficulty(content, baselineDifficulty);
  }

  if (category === 'email_legitimate') {
    return heuristicLegitimateDifficulty(content, baselineDifficulty);
  }

  const signals = Array.isArray(content['signals']) ? content['signals'] : [];
  const words = JSON.stringify(content).split(/\s+/).filter(Boolean).length;
  const signalDensity = signals.length / Math.max(words / 100, 1);

  let score = 3;

  if (signalDensity >= 4) score -= 1;
  if (signalDensity >= 6) score -= 1;
  if (signals.length <= 1) score += 1;

  const suspiciousLinks = countSuspiciousLinks(content);
  if (suspiciousLinks === 0) score += 1;

  const headers =
    content['headers'] && typeof content['headers'] === 'object'
      ? (content['headers'] as Record<string, unknown>)
      : {};
  const failedAuthSignals = countFailedAuthSignals(headers);
  if (failedAuthSignals >= 2) score -= 1;

  if (
    attackType &&
    ['spear_phishing', 'bec', 'whaling', 'supply_chain', 'insider', 'insider_threat'].includes(
      attackType,
    )
  ) {
    score += 1;
  }

  return {
    difficulty: clampDifficulty(score),
    source: 'heuristic',
    rationale: 'Computed from signal density, auth failures, suspicious links, and attack type.',
  };
};

export const classifyDifficulty = async (options: {
  category: PromptTemplateCategory;
  content: Record<string, unknown>;
  attackType?: string;
  baselineDifficulty?: number;
  claudeClient?: ClaudeClient;
  requestId?: string;
}): Promise<DifficultyClassificationResult> => {
  const fallback = heuristicDifficulty(
    options.category,
    options.content,
    options.attackType,
    options.baselineDifficulty,
  );

  if (!options.claudeClient) {
    return fallback;
  }

  try {
    const response = await options.claudeClient.complete({
      task: 'classification',
      maxTokens: 128,
      temperature: 0,
      systemPrompt:
        'Classify the difficulty of fictional cybersecurity training content. Return JSON only.',
      userPrompt: `Return {"difficulty": 1-5, "rationale": "short string"} for this content:\n${JSON.stringify(options.content)}`,
      ...(options.requestId ? { requestId: options.requestId } : {}),
    });

    const parsed = parseStructuredOutput<{ difficulty: number; rationale?: string }>(
      response.text,
      {
        type: 'object',
        required: ['difficulty'],
        properties: {
          difficulty: { type: 'integer', minimum: 1, maximum: 5 },
          rationale: { type: 'string', minLength: 1 },
        },
      },
    );

    return {
      difficulty: clampDifficulty(parsed.difficulty),
      source: 'model',
      rationale: parsed.rationale ?? 'Model classified difficulty.',
      usage: toUsageMetrics(response),
    };
  } catch {
    return fallback;
  }
};
