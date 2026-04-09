import { createHash } from 'node:crypto';

import type { ContentGateway, ContentGenerationRequest } from './ai-pipeline.types.js';

export const fictionalFactions = [
  'Sovereign Compact',
  'Nexion Industries',
  'Librarians',
  'Hacktivists',
  'Criminal Networks',
] as const;

const FICTIONAL_FACTIONS = new Set<string>(fictionalFactions);

const FALLBACK_TEMPLATE_ID = 'handcrafted-fallback';
const FALLBACK_TEMPLATE_VERSION = '0.0.0';

const normalizeComparableString = (value?: string | null): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

const matchesFallbackStringContext = (
  templateValue: string | null | undefined,
  requestValue: string | undefined,
): boolean => {
  const normalizedTemplate = normalizeComparableString(templateValue);
  const normalizedRequest = normalizeComparableString(requestValue);

  return !normalizedTemplate || !normalizedRequest || normalizedTemplate === normalizedRequest;
};

const matchesFallbackNumericContext = (
  templateValue: number | null | undefined,
  requestValue: number | undefined,
): boolean => templateValue == null || requestValue == null || templateValue === requestValue;

const scoreFallbackStringContext = (
  templateValue: string | null | undefined,
  requestValue: string | undefined,
  exactMatchWeight: number,
): number => {
  const normalizedTemplate = normalizeComparableString(templateValue);
  const normalizedRequest = normalizeComparableString(requestValue);

  if (!normalizedTemplate || !normalizedRequest) {
    return 0;
  }

  return normalizedTemplate === normalizedRequest ? exactMatchWeight : 0;
};

const scoreFallbackDifficulty = (
  templateValue: number | undefined,
  requestValue: number | undefined,
): number => {
  if (templateValue == null || requestValue == null) {
    return 0;
  }

  const distance = Math.abs(templateValue - requestValue);
  return Math.max(0, 20 - distance * 6);
};

const scoreFallbackNumericContext = (
  templateValue: number | null | undefined,
  requestValue: number | undefined,
  exactMatchWeight: number,
): number => {
  if (templateValue == null || requestValue == null) {
    return 0;
  }

  return templateValue === requestValue ? exactMatchWeight : 0;
};

export type FallbackEmailCategory = 'email_phishing' | 'email_legitimate';
export type FallbackEmailRequest = ContentGenerationRequest & { category: FallbackEmailCategory };

export type FallbackEmailTemplate = Awaited<
  ReturnType<ContentGateway['listFallbackEmailTemplates']>
>[number];
export type PoolEmailTemplate = Awaited<ReturnType<ContentGateway['listEmailTemplates']>>[number];

const fallbackEmailContentTypeAliases = {
  email_phishing: ['email_phishing', 'phishing'],
  email_legitimate: ['email_legitimate', 'legitimate'],
} as const;

const matchesFallbackTemplateRequest = (
  template: FallbackEmailTemplate,
  request: FallbackEmailRequest,
): boolean =>
  matchesFallbackStringContext(template.faction, request.faction) &&
  matchesFallbackStringContext(template.attackType, request.attackType) &&
  matchesFallbackStringContext(template.threatLevel, request.threatLevel) &&
  matchesFallbackNumericContext(template.difficulty, request.difficulty) &&
  matchesFallbackNumericContext(template.season, request.season) &&
  matchesFallbackNumericContext(template.chapter, request.chapter);

const countFallbackMatchedSelectors = (
  template: FallbackEmailTemplate,
  request: FallbackEmailRequest,
): number => {
  let matchedSelectors = 0;

  if (
    normalizeComparableString(template.faction) &&
    normalizeComparableString(template.faction) === normalizeComparableString(request.faction)
  ) {
    matchedSelectors += 1;
  }
  if (
    normalizeComparableString(template.attackType) &&
    normalizeComparableString(template.attackType) === normalizeComparableString(request.attackType)
  ) {
    matchedSelectors += 1;
  }
  if (
    normalizeComparableString(template.threatLevel) &&
    normalizeComparableString(template.threatLevel) ===
      normalizeComparableString(request.threatLevel)
  ) {
    matchedSelectors += 1;
  }
  if (
    template.difficulty != null &&
    request.difficulty != null &&
    template.difficulty === request.difficulty
  ) {
    matchedSelectors += 1;
  }
  if (template.season != null && request.season != null && template.season === request.season) {
    matchedSelectors += 1;
  }
  if (template.chapter != null && request.chapter != null && template.chapter === request.chapter) {
    matchedSelectors += 1;
  }

  return matchedSelectors;
};

const countFallbackExtraSelectors = (
  template: FallbackEmailTemplate,
  request: FallbackEmailRequest,
): number =>
  [
    [template.faction, request.faction],
    [template.attackType, request.attackType],
    [template.threatLevel, request.threatLevel],
    [template.difficulty, request.difficulty],
    [template.season, request.season],
    [template.chapter, request.chapter],
  ].filter(([templateValue, requestValue]) => templateValue != null && requestValue == null).length;

export const compareFallbackTemplates = (
  left: FallbackEmailTemplate,
  right: FallbackEmailTemplate,
  request: FallbackEmailRequest,
): number => {
  const leftScore =
    scoreFallbackStringContext(left.faction, request.faction, 40) +
    scoreFallbackStringContext(left.attackType, request.attackType, 100) +
    scoreFallbackStringContext(left.threatLevel, request.threatLevel, 60) +
    scoreFallbackNumericContext(left.season, request.season, 30) +
    scoreFallbackNumericContext(left.chapter, request.chapter, 15) +
    scoreFallbackDifficulty(left.difficulty, request.difficulty);
  const rightScore =
    scoreFallbackStringContext(right.faction, request.faction, 40) +
    scoreFallbackStringContext(right.attackType, request.attackType, 100) +
    scoreFallbackStringContext(right.threatLevel, request.threatLevel, 60) +
    scoreFallbackNumericContext(right.season, request.season, 30) +
    scoreFallbackNumericContext(right.chapter, request.chapter, 15) +
    scoreFallbackDifficulty(right.difficulty, request.difficulty);

  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  const leftMatchedSelectors = countFallbackMatchedSelectors(left, request);
  const rightMatchedSelectors = countFallbackMatchedSelectors(right, request);
  if (rightMatchedSelectors !== leftMatchedSelectors) {
    return rightMatchedSelectors - leftMatchedSelectors;
  }

  const leftExtraSelectors = countFallbackExtraSelectors(left, request);
  const rightExtraSelectors = countFallbackExtraSelectors(right, request);
  if (leftExtraSelectors !== rightExtraSelectors) {
    return leftExtraSelectors - rightExtraSelectors;
  }

  return 0;
};

export const normalizeFaction = (value?: string): string =>
  value && FICTIONAL_FACTIONS.has(value) ? value : 'Librarians';

export const buildFallbackPromptHash = (request: ContentGenerationRequest): string => {
  return createHash('sha256')
    .update(
      JSON.stringify({
        mode: 'handcrafted-fallback',
        category: request.category,
        templateId: request.templateId ?? null,
        templateName: request.templateName ?? null,
        contentName: request.contentName ?? null,
        threatLevel: request.threatLevel ?? null,
        difficulty: request.difficulty ?? null,
        faction: request.faction ?? null,
        attackType: request.attackType ?? null,
        season: request.season ?? null,
        chapter: request.chapter ?? null,
        language: request.language ?? null,
        locale: request.locale ?? null,
        context:
          typeof request.context === 'object' && request.context !== null ? request.context : null,
      }),
    )
    .digest('hex');
};

export { FALLBACK_TEMPLATE_ID, FALLBACK_TEMPLATE_VERSION };

export const listFallbackEmailTemplatesForRequest = async (
  tenantId: string,
  request: FallbackEmailRequest,
  contentGateway: ContentGateway,
): Promise<FallbackEmailTemplate[]> => {
  const contentTypes = fallbackEmailContentTypeAliases[request.category];
  const templates: FallbackEmailTemplate[] = [];
  const seenTemplateIds = new Set<string>();

  for (const contentType of contentTypes) {
    const entries = await contentGateway.listFallbackEmailTemplates(tenantId, {
      isActive: true,
      contentType,
      ...(request.difficulty !== undefined ? { difficulty: request.difficulty } : {}),
      ...(request.faction ? { faction: request.faction } : {}),
      ...(request.attackType ? { attackType: request.attackType } : {}),
      ...(request.threatLevel ? { threatLevel: request.threatLevel } : {}),
      ...(request.season !== undefined ? { season: request.season } : {}),
      ...(request.chapter !== undefined ? { chapter: request.chapter } : {}),
    });

    for (const entry of entries) {
      if (
        seenTemplateIds.has(entry.id) ||
        !isHandcraftedFallbackTemplate(entry) ||
        !matchesFallbackTemplateRequest(entry, request)
      ) {
        continue;
      }
      seenTemplateIds.add(entry.id);
      templates.push(entry);
    }
  }

  return templates;
};

export const listDifficultyPoolEmailTemplates = async (
  tenantId: string,
  request: FallbackEmailRequest,
  contentGateway: ContentGateway,
): Promise<PoolEmailTemplate[]> => {
  const contentTypes = fallbackEmailContentTypeAliases[request.category];
  const templates: PoolEmailTemplate[] = [];
  const seenTemplateIds = new Set<string>();

  for (const contentType of contentTypes) {
    const entries = await contentGateway.listEmailTemplates(tenantId, {
      isActive: true,
      contentType,
      ...(request.difficulty !== undefined ? { difficulty: request.difficulty } : {}),
    });

    for (const entry of entries) {
      if (seenTemplateIds.has(entry.id) || !isGeneratedPoolTemplate(entry)) {
        continue;
      }

      seenTemplateIds.add(entry.id);
      templates.push(entry);
    }
  }

  return templates;
};

import { isRecord } from '../../shared/utils/type-guards.js';

const hasGeneratedFallbackPayload = (template: { metadata?: Record<string, unknown> }): boolean =>
  isRecord(template.metadata) &&
  Object.prototype.hasOwnProperty.call(template.metadata, 'generatedContent');

export const isGeneratedPoolTemplate = (
  template: FallbackEmailTemplate | PoolEmailTemplate,
): boolean => template.isAiGenerated === true || hasGeneratedFallbackPayload(template);

export const isHandcraftedFallbackTemplate = (template: FallbackEmailTemplate): boolean =>
  template.isAiGenerated !== true && !hasGeneratedFallbackPayload(template);
