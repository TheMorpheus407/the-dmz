import { badRequest } from '../../shared/middleware/error-handler.js';

import { validateGeneratedContentSafety } from './safety-validator.service.js';
import { isRecord } from './prompt-template-validator.js';

import type { ContentGenerationRequest } from './ai-pipeline.types.js';

export const emptyTemplateContext = {
  attackType: null,
  threatLevel: null,
  difficulty: null,
  season: null,
  chapter: null,
} as const;

export const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

export const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const readContextValue = (
  context: Record<string, unknown> | undefined,
  key: string,
): unknown => (isRecord(context) ? context[key] : undefined);

export const pickFirstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const stringValue = readString(value);
    if (stringValue) {
      return stringValue;
    }
  }

  return undefined;
};

export const pickFirstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numericValue = readNumber(value);
    if (numericValue !== undefined) {
      return numericValue;
    }
  }

  return undefined;
};

type ResolvedRequestContext = Pick<
  ContentGenerationRequest,
  | 'faction'
  | 'attackType'
  | 'threatLevel'
  | 'difficulty'
  | 'season'
  | 'chapter'
  | 'language'
  | 'locale'
>;

export const resolveRequestContext = (
  request: ContentGenerationRequest,
  template: {
    attackType: string | null;
    threatLevel: string | null;
    difficulty: number | null;
    season: number | null;
    chapter: number | null;
  },
): ResolvedRequestContext => {
  const faction = pickFirstString(request.faction, readContextValue(request.context, 'faction'));
  const attackType = pickFirstString(
    ...(request.category === 'email_legitimate'
      ? []
      : [
          request.attackType,
          readContextValue(request.context, 'attackType'),
          readContextValue(request.context, 'attack_type'),
          template.attackType,
        ]),
  );
  const threatLevel = pickFirstString(
    request.threatLevel,
    readContextValue(request.context, 'threatLevel'),
    readContextValue(request.context, 'threat_level'),
    template.threatLevel,
  );
  const difficulty = pickFirstNumber(
    request.difficulty,
    readContextValue(request.context, 'difficulty'),
    template.difficulty,
  );
  const season = pickFirstNumber(
    request.season,
    readContextValue(request.context, 'season'),
    template.season,
  );
  const chapter = pickFirstNumber(
    request.chapter,
    readContextValue(request.context, 'chapter'),
    template.chapter,
  );

  return {
    ...(faction ? { faction } : {}),
    ...(attackType ? { attackType } : {}),
    ...(threatLevel ? { threatLevel } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(season !== undefined ? { season } : {}),
    ...(chapter !== undefined ? { chapter } : {}),
    ...(request.language ? { language: request.language } : {}),
    ...(request.locale ? { locale: request.locale } : {}),
  };
};

export const applyResolvedRequestContext = (
  request: ContentGenerationRequest,
  resolvedContext: ResolvedRequestContext,
): ContentGenerationRequest => ({
  ...request,
  ...(resolvedContext.faction ? { faction: resolvedContext.faction } : {}),
  ...(resolvedContext.attackType ? { attackType: resolvedContext.attackType } : {}),
  ...(resolvedContext.threatLevel ? { threatLevel: resolvedContext.threatLevel } : {}),
  ...(resolvedContext.difficulty !== undefined ? { difficulty: resolvedContext.difficulty } : {}),
  ...(resolvedContext.season !== undefined ? { season: resolvedContext.season } : {}),
  ...(resolvedContext.chapter !== undefined ? { chapter: resolvedContext.chapter } : {}),
  ...(resolvedContext.language ? { language: resolvedContext.language } : {}),
  ...(resolvedContext.locale ? { locale: resolvedContext.locale } : {}),
});

export const buildGenerationContext = (
  request: ContentGenerationRequest,
  resolvedContext: ResolvedRequestContext,
): Record<string, unknown> => ({
  ...request.context,
  category: request.category,
  faction: resolvedContext.faction,
  threatLevel: resolvedContext.threatLevel,
  attackType: resolvedContext.attackType,
  difficulty: resolvedContext.difficulty,
  season: resolvedContext.season,
  chapter: resolvedContext.chapter,
  locale: resolvedContext.locale,
  language: resolvedContext.language,
});

export const assertSafeRequestedStorageMetadata = (
  request: ContentGenerationRequest,
  resolvedContext: ResolvedRequestContext,
): void => {
  const metadataCandidate = {
    ...(request.contentName ? { contentName: request.contentName } : {}),
    ...(resolvedContext.faction ? { faction: resolvedContext.faction } : {}),
  };

  if (Object.keys(metadataCandidate).length === 0) {
    return;
  }

  const metadataSafety = validateGeneratedContentSafety(request.category, metadataCandidate);
  if (!metadataSafety.ok) {
    throw badRequest('Generation request metadata failed safety validation', {
      fields: Object.keys(metadataCandidate),
      flags: metadataSafety.flags,
      findings: metadataSafety.findings,
    });
  }
};
