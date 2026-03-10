import type {
  PromptTemplateCategory,
  QualityScoreBreakdown,
  QualityScoreResult,
} from './ai-pipeline.types.js';

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const getSignalType = (signal: unknown): string | undefined => {
  if (!isRecord(signal) || typeof signal['type'] !== 'string') {
    return undefined;
  }

  return signal['type'];
};

const collectText = (value: unknown, parts: string[] = []): string[] => {
  if (typeof value === 'string') {
    parts.push(value);
    return parts;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectText(entry, parts));
    return parts;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectText(entry, parts));
  }

  return parts;
};

const wordCount = (content: Record<string, unknown>): number =>
  collectText(content).join(' ').split(/\s+/).filter(Boolean).length;

export const scoreGeneratedContent = (
  category: PromptTemplateCategory,
  content: Record<string, unknown>,
  context: Record<string, unknown>,
): QualityScoreResult => {
  const words = Math.max(wordCount(content), 1);
  const signals = Array.isArray(content['signals']) ? content['signals'].length : 0;
  const links = Array.isArray(content['links']) ? content['links'].length : 0;
  const attachments = Array.isArray(content['attachments']) ? content['attachments'].length : 0;
  const uniqueSignalTypes = new Set(
    Array.isArray(content['signals'])
      ? content['signals']
          .map((signal) => getSignalType(signal))
          .filter((value): value is string => typeof value === 'string')
      : [],
  );

  const plausibility = category.startsWith('email_')
    ? clamp(0.55 + Math.min(words, 180) / 400 + Math.min(links + attachments, 3) * 0.05)
    : clamp(0.6 + Math.min(words, 220) / 500);
  const signalClarity = clamp(0.35 + Math.min(signals, 4) * 0.15);
  const variety = clamp(
    0.35 + uniqueSignalTypes.size * 0.12 + Math.min(links + attachments, 2) * 0.08,
  );
  const pedagogicalValue = clamp(0.4 + Math.min(signals, 5) * 0.1);

  const contextNeedles = [
    context['faction'],
    context['attackType'],
    context['threatLevel'],
    context['season'],
    context['chapter'],
  ]
    .filter(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number',
    )
    .map((value) => String(value).toLowerCase());
  const contentText = collectText(content).join(' ').toLowerCase();
  const narrativeHits = contextNeedles.filter((needle) => contentText.includes(needle)).length;
  const narrativeAlignment = clamp(0.45 + narrativeHits * 0.12);

  const breakdown: QualityScoreBreakdown = {
    plausibility,
    signalClarity,
    variety,
    pedagogicalValue,
    narrativeAlignment,
  };

  const score = clamp(
    breakdown.plausibility * 0.25 +
      breakdown.signalClarity * 0.2 +
      breakdown.variety * 0.15 +
      breakdown.pedagogicalValue * 0.2 +
      breakdown.narrativeAlignment * 0.2,
  );

  return {
    score,
    breakdown,
  };
};
