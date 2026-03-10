import { createHash } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { getDatabaseClient, type DB } from '../../shared/database/connection.js';
import { badRequest, conflict } from '../../shared/middleware/error-handler.js';
import { generateId as defaultGenerateId } from '../../shared/utils/id.js';

import * as aiPipelineRepo from './ai-pipeline.repo.js';
import { createClaudeClient, resolveAnthropicModel } from './claude-client.service.js';
import { classifyDifficulty } from './difficulty-classifier.service.js';
import {
  assertCategoryOutputSchema,
  getDefaultOutputSchema,
  parseStructuredOutput,
} from './output-parser.service.js';
import {
  createAiGenerationCompletedEvent,
  createAiGenerationFailedEvent,
  createAnalyticsAiGenerationRecordedEvent,
  createContentPoolLowEvent,
  createHumanReviewRequiredEvent,
  createSafetyCheckCompletedEvent,
} from './ai-pipeline.events.js';
import { buildPrompt } from './prompt-engine.service.js';
import { scoreGeneratedContent } from './quality-scorer.service.js';
import { validateGeneratedContentSafety } from './safety-validator.service.js';
import { evaluateHumanReviewTriggers } from './human-review-trigger.service.js';
import {
  fictionalFactions,
  type AiPipelineLogger,
  type AiPipelineService,
  type ContentGateway,
  type ContentGenerationRequest,
  type CreateAiPipelineServiceOptions,
  type GeneratedContentResult,
  type GenerationFailureCategory,
  type GeneratablePromptTemplateCategory,
  type HumanReviewStatus,
  type PromptTemplateInput,
  type PromptTemplateRepository,
  type PromptTemplateUpdate,
  type SafetyValidationResult,
  type StoredContentReference,
  type UsageMetrics,
} from './ai-pipeline.types.js';
import { isPromptTemplateCategory } from './prompt-template-category.js';

const DEFAULT_EMAIL_POOL_LOW_THRESHOLD = 20;
const MAX_GENERATION_RETRIES = 3;
const FALLBACK_TEMPLATE_ID = 'handcrafted-fallback';
const FALLBACK_TEMPLATE_VERSION = '0.0.0';
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';
const PROMPT_TEMPLATE_NAME_VERSION_CONSTRAINT = 'ai_prompt_templates_name_version_idx';
const generationRetryTemperatures = [0.2, 0.1, 0.05, 0] as const;
const FICTIONAL_FACTIONS = new Set<string>(fictionalFactions);

const noOpLogger: AiPipelineLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

class SafetyRejectionError extends Error {
  public readonly result: SafetyValidationResult;

  public constructor(result: SafetyValidationResult) {
    super(`Generated content failed safety validation: ${result.flags.join(', ')}`);
    this.name = 'SafetyRejectionError';
    this.result = result;
  }
}

class InvalidGeneratedOutputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidGeneratedOutputError';
  }
}

class MissingPromptTemplateError extends Error {
  public constructor() {
    super('No active prompt template matched the request');
    this.name = 'MissingPromptTemplateError';
  }
}

class InvalidPromptTemplateSchemaError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidPromptTemplateSchemaError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];

const readBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const readObjectString = (value: Record<string, unknown>, key: string): string | undefined =>
  readString(value[key]);

const mailboxAddressRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const isPromptTemplateUniqueViolation = (error: unknown): error is Record<string, unknown> => {
  if (!isRecord(error)) {
    return false;
  }

  if (readObjectString(error, 'code') !== POSTGRES_UNIQUE_VIOLATION_CODE) {
    return false;
  }

  const constraint =
    readObjectString(error, 'constraint_name') ?? readObjectString(error, 'constraint');
  return constraint === undefined || constraint === PROMPT_TEMPLATE_NAME_VERSION_CONSTRAINT;
};

const throwPromptTemplateConflict = (
  tenantId: string,
  details: {
    promptTemplateId?: string;
    name?: string;
    version?: string;
  },
): never => {
  throw conflict('A prompt template with this name and version already exists', {
    resource: 'prompt_template',
    tenantId,
    conflictFields: ['name', 'version'],
    ...(details.promptTemplateId ? { promptTemplateId: details.promptTemplateId } : {}),
    ...(details.name ? { name: details.name } : {}),
    ...(details.version ? { version: details.version } : {}),
  });
};

const toPromptTemplateConflictDetails = (details: {
  promptTemplateId?: string | undefined;
  name?: string | undefined;
  version?: string | undefined;
}): {
  promptTemplateId?: string;
  name?: string;
  version?: string;
} => ({
  ...(details.promptTemplateId !== undefined ? { promptTemplateId: details.promptTemplateId } : {}),
  ...(details.name !== undefined ? { name: details.name } : {}),
  ...(details.version !== undefined ? { version: details.version } : {}),
});

const rethrowPromptTemplateWriteError = (
  error: unknown,
  tenantId: string,
  details: {
    promptTemplateId?: string;
    name?: string;
    version?: string;
  },
): never => {
  if (isPromptTemplateUniqueViolation(error)) {
    throwPromptTemplateConflict(tenantId, details);
  }

  throw error;
};

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const sanitizeMailboxDisplayName = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : null;
};

const parseMailboxHeader = (
  value: unknown,
): {
  address: string | null;
  displayName: string | null;
} => {
  const raw = readString(value);
  if (!raw) {
    return {
      address: null,
      displayName: null,
    };
  }

  const angleMatch = raw.match(/^(?<display>.*)<\s*(?<address>[^<>\s]+@[^<>\s]+)\s*>$/);
  const matchedAddress = angleMatch?.groups?.['address'];
  if (matchedAddress) {
    return {
      address: matchedAddress.trim(),
      displayName: sanitizeMailboxDisplayName(angleMatch.groups?.['display']),
    };
  }

  const addressMatch = raw.match(mailboxAddressRegex);
  if (addressMatch?.[0]) {
    return {
      address: addressMatch[0],
      displayName: null,
    };
  }

  return {
    address: null,
    displayName: sanitizeMailboxDisplayName(raw),
  };
};

const deriveSenderNameFromSignature = (content: Record<string, unknown>): string | null => {
  const body = isRecord(content['body']) ? content['body'] : {};
  const signature = readString(body['signature']);
  if (!signature) {
    return null;
  }

  const [primaryLine] = signature.split('\n');
  const candidate = primaryLine?.split(',')[0]?.trim();
  return candidate && candidate.length > 0 ? candidate : null;
};

const deriveSenderNameFromAddress = (address: string | null): string | null => {
  const localPart = address?.split('@')[0]?.trim();
  if (!localPart) {
    return null;
  }

  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  return normalized.length > 0 ? toTitleCase(normalized) : null;
};

const omitAttackType = (request: ContentGenerationRequest): ContentGenerationRequest => {
  const { attackType: _attackType, ...requestWithoutAttackType } = request;
  return requestWithoutAttackType;
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

const emptyTemplateContext = {
  attackType: null,
  threatLevel: null,
  difficulty: null,
  season: null,
  chapter: null,
} as const;

const readContextValue = (context: Record<string, unknown> | undefined, key: string): unknown =>
  isRecord(context) ? context[key] : undefined;

const pickFirstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const stringValue = readString(value);
    if (stringValue) {
      return stringValue;
    }
  }

  return undefined;
};

const pickFirstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numericValue = readNumber(value);
    if (numericValue !== undefined) {
      return numericValue;
    }
  }

  return undefined;
};

const readContentString = (
  content: Record<string, unknown>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = readString(content[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
};

const readContentNumber = (
  content: Record<string, unknown>,
  ...keys: string[]
): number | undefined => {
  for (const key of keys) {
    const value = readNumber(content[key]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

const sanitizeEmailContentForCategory = (
  category: FallbackEmailCategory | GeneratablePromptTemplateCategory,
  content: Record<string, unknown>,
): Record<string, unknown> => {
  if (category !== 'email_legitimate') {
    return content;
  }

  const { attack_type: _attackType, attackType: _attackTypeCamel, ...sanitized } = content;
  return sanitized;
};

const resolveRequestContext = (
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

const applyResolvedRequestContext = (
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

const buildGenerationContext = (
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

const assertSafeRequestedStorageMetadata = (
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

const buildFallbackPromptHash = (request: ContentGenerationRequest): string =>
  createHash('sha256')
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
        context: isRecord(request.context) ? request.context : null,
      }),
    )
    .digest('hex');

const normalizeFaction = (value?: string): string =>
  value && FICTIONAL_FACTIONS.has(value) ? value : 'Librarians';

const factionDomainMap: Record<string, string> = {
  'Sovereign Compact': 'compact',
  'Nexion Industries': 'nexion',
  Librarians: 'librarians',
  Hacktivists: 'hacktivists',
  'Criminal Networks': 'networks',
};

const fallbackEmailContentTypeAliases = {
  email_phishing: ['email_phishing', 'phishing'],
  email_legitimate: ['email_legitimate', 'legitimate'],
} as const;
type FallbackEmailCategory = keyof typeof fallbackEmailContentTypeAliases;
type FallbackEmailRequest = ContentGenerationRequest & { category: FallbackEmailCategory };

type FallbackEmailTemplate = Awaited<
  ReturnType<ContentGateway['listFallbackEmailTemplates']>
>[number];
type PoolEmailTemplate = Awaited<ReturnType<ContentGateway['listEmailTemplates']>>[number];

const fallbackTimestamp = '2063-09-14T14:22:00Z';
const bodyUrlRegex = /https?:\/\/[^\s)"'<>]+/gi;
const defaultFallbackJustification = 'Review the request details carefully.';
const defaultFallbackCallToAction =
  'Use your standard verification process before approving this request.';

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

const splitTemplateParagraphs = (body: string): string[] =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(' '),
    )
    .filter((paragraph) => paragraph.length > 0);

const looksLikeGreeting = (paragraph?: string): boolean =>
  !!paragraph &&
  (/^(dear|hi|hello|greetings|gatekeeper|director|team)\b/i.test(paragraph) ||
    /,$/.test(paragraph));

const looksLikeSignature = (paragraph?: string): boolean =>
  !!paragraph &&
  (paragraph.length <= 120 ||
    /(?:regards|thanks|desk|office|team|coordinator|liaison|records|security|support)\b/i.test(
      paragraph,
    ));

const readSignalEntries = (metadata: Record<string, unknown>): Array<Record<string, unknown>> =>
  Array.isArray(metadata['signals'])
    ? metadata['signals'].filter((entry): entry is Record<string, unknown> => isRecord(entry))
    : [];

const readAttachmentEntries = (
  metadata: Record<string, unknown>,
): Array<Record<string, unknown>> =>
  Array.isArray(metadata['attachments'])
    ? metadata['attachments'].filter((entry): entry is Record<string, unknown> => isRecord(entry))
    : [];

const readLinkEntries = (metadata: Record<string, unknown>): Array<Record<string, unknown>> =>
  Array.isArray(metadata['links'])
    ? metadata['links'].filter((entry): entry is Record<string, unknown> => isRecord(entry))
    : [];

const normalizeAttachmentType = (filename?: string): string => {
  const match = filename?.match(/\.([A-Za-z0-9]+)$/);

  return match?.[1]?.toLowerCase() ?? 'file';
};

const buildStructuredFallbackFromTemplate = (
  template: FallbackEmailTemplate,
  request: FallbackEmailRequest,
): Record<string, unknown> => {
  const metadata = isRecord(template.metadata) ? template.metadata : {};
  const factionName = normalizeFaction(template.faction ?? request.faction);
  const factionDomain = factionDomainMap[factionName];
  const paragraphs = splitTemplateParagraphs(template.body);
  const greeting = looksLikeGreeting(paragraphs[0]) ? paragraphs.shift() : undefined;
  const signature =
    paragraphs.length > 1 && looksLikeSignature(paragraphs.at(-1)) ? paragraphs.pop() : undefined;
  const resolvedAttackType =
    request.category === 'email_legitimate'
      ? undefined
      : (pickFirstString(template.attackType, request.attackType) ?? 'email_phishing');
  const resolvedDifficulty = pickFirstNumber(template.difficulty, request.difficulty) ?? 2;
  const resolvedThreatLevel = pickFirstString(template.threatLevel, request.threatLevel) ?? 'LOW';
  const resolvedSeason = pickFirstNumber(template.season, request.season);
  const resolvedChapter = pickFirstNumber(template.chapter, request.chapter);
  const summary = paragraphs[0] ?? template.subject;
  const justification = paragraphs[1] ?? defaultFallbackJustification;
  const callToAction = paragraphs[2] ?? defaultFallbackCallToAction;

  const metadataLinks = readLinkEntries(metadata).flatMap((entry) => {
    const url = readString(entry['url']);
    if (!url) {
      return [];
    }

    return [
      {
        label: readString(entry['label']) ?? 'Referenced link',
        url,
        is_suspicious: readBoolean(entry['is_suspicious']) ?? request.category === 'email_phishing',
      },
    ];
  });
  const bodyLinks = Array.from(template.body.matchAll(bodyUrlRegex)).map((match, index) => ({
    label: `Referenced link ${index + 1}`,
    url: match[0],
    is_suspicious: request.category === 'email_phishing',
  }));
  const seenLinkUrls = new Set<string>();
  const links = [...metadataLinks, ...bodyLinks].filter((entry) => {
    if (seenLinkUrls.has(entry.url)) {
      return false;
    }
    seenLinkUrls.add(entry.url);
    return true;
  });

  const attachments = readAttachmentEntries(metadata).flatMap((entry) => {
    const name = readString(entry['name']);
    if (!name) {
      return [];
    }

    return [
      {
        name,
        type: readString(entry['type']) ?? normalizeAttachmentType(name),
        is_suspicious: readBoolean(entry['is_suspicious']) ?? request.category === 'email_phishing',
      },
    ];
  });

  const signals = readSignalEntries(metadata).flatMap((entry) => {
    const type = readString(entry['type']);
    const explanation = readString(entry['explanation']) ?? readString(entry['description']);

    if (!type || !explanation) {
      return [];
    }

    return [
      {
        type,
        location: readString(entry['location']) ?? 'body.summary',
        explanation,
      },
    ];
  });

  const fromEmail = template.fromEmail ?? `liaison@${factionDomain}.invalid`;
  const replyTo = template.replyTo ?? fromEmail;

  return {
    content_type: 'email',
    headers: {
      from: fromEmail,
      to: 'intake@archive.invalid',
      subject: template.subject,
      date: fallbackTimestamp,
      message_id: `<fallback-${template.id}@archive.invalid>`,
      reply_to: replyTo,
      spf: request.category === 'email_legitimate' ? 'pass' : 'fail',
      dkim: request.category === 'email_legitimate' ? 'pass' : 'neutral',
      dmarc: request.category === 'email_legitimate' ? 'pass' : 'fail',
    },
    body: {
      greeting: greeting ?? 'Gatekeeper,',
      summary,
      justification,
      call_to_action: callToAction,
      signature: signature ?? template.fromName ?? `Records Desk, ${factionName}`,
    },
    links,
    attachments,
    signals,
    safety_flags: ['ok'],
    faction: factionName,
    difficulty: resolvedDifficulty,
    threat_level: resolvedThreatLevel,
    ...(resolvedAttackType ? { attack_type: resolvedAttackType } : {}),
    ...(resolvedSeason !== undefined ? { season: resolvedSeason } : {}),
    ...(resolvedChapter !== undefined ? { chapter: resolvedChapter } : {}),
  };
};

const hasGeneratedFallbackPayload = (template: { metadata?: Record<string, unknown> }): boolean =>
  isRecord(template.metadata) && Object.hasOwn(template.metadata, 'generatedContent');

const isGeneratedPoolTemplate = (template: FallbackEmailTemplate | PoolEmailTemplate): boolean =>
  template.isAiGenerated === true || hasGeneratedFallbackPayload(template);

const isHandcraftedFallbackTemplate = (template: FallbackEmailTemplate): boolean =>
  template.isAiGenerated !== true && !hasGeneratedFallbackPayload(template);

const listFallbackEmailTemplatesForRequest = async (
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

const listDifficultyPoolEmailTemplates = async (
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

const compareFallbackTemplates = (
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

const composeEmailBody = (content: Record<string, unknown>): string => {
  const body = isRecord(content['body']) ? content['body'] : {};
  const sections = [
    body['greeting'],
    body['summary'],
    body['justification'],
    body['call_to_action'],
    body['signature'],
  ];

  return sections
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n\n');
};

const composeDocumentBody = (
  category: Extract<GeneratablePromptTemplateCategory, 'intel_brief' | 'scenario_variation'>,
  content: Record<string, unknown>,
): string => {
  if (category === 'intel_brief') {
    const executiveSummary =
      readString(content['executive_summary']) ?? 'Intelligence summary unavailable.';
    const observedIndicators = readStringArray(content['observed_indicators']);
    const expectedTactics = readStringArray(content['expected_adversary_tactics']);
    const recommendedPosture =
      readString(content['recommended_posture']) ?? 'Maintain current posture.';

    return [
      executiveSummary,
      observedIndicators.length > 0
        ? `Observed indicators:\n- ${observedIndicators.join('\n- ')}`
        : undefined,
      expectedTactics.length > 0
        ? `Expected adversary tactics:\n- ${expectedTactics.join('\n- ')}`
        : undefined,
      `Recommended posture:\n${recommendedPosture}`,
    ]
      .filter((section): section is string => typeof section === 'string' && section.length > 0)
      .join('\n\n');
  }

  const summary = readString(content['summary']) ?? 'Scenario variation summary unavailable.';
  const triggerConditions = readStringArray(content['trigger_conditions']);
  const requiredDeliverables = readStringArray(content['required_deliverables']);
  const followUpTriggers = readStringArray(content['follow_up_triggers']);

  return [
    summary,
    triggerConditions.length > 0
      ? `Trigger conditions:\n- ${triggerConditions.join('\n- ')}`
      : undefined,
    requiredDeliverables.length > 0
      ? `Required deliverables:\n- ${requiredDeliverables.join('\n- ')}`
      : undefined,
    followUpTriggers.length > 0
      ? `Follow-up triggers:\n- ${followUpTriggers.join('\n- ')}`
      : undefined,
  ]
    .filter((section): section is string => typeof section === 'string' && section.length > 0)
    .join('\n\n');
};

const deriveDocumentTitle = (
  request: ContentGenerationRequest,
  fallbackName: string,
  content: Record<string, unknown>,
): string =>
  request.contentName ??
  readString(content['title']) ??
  readString(content['name']) ??
  readString(content['executive_summary'])?.slice(0, 120) ??
  fallbackName;

const buildHandcraftedFallback = (
  category: GeneratablePromptTemplateCategory,
  request: ContentGenerationRequest,
): Record<string, unknown> => {
  const factionName = normalizeFaction(request.faction);
  const factionDomain = factionDomainMap[factionName];
  const attackType =
    category === 'email_legitimate' ? request.attackType : (request.attackType ?? 'email_phishing');
  const difficulty = request.difficulty ?? 2;
  const threatLevel = request.threatLevel ?? 'LOW';

  if (category === 'email_legitimate') {
    return {
      content_type: 'email',
      headers: {
        from: `records-desk@${factionDomain}.test`,
        to: 'intake@archive.invalid',
        subject: 'Archive Access Verification Packet',
        date: '2063-09-14T14:22:00Z',
        message_id: '<fallback-legit@archive.test>',
        reply_to: `records-desk@${factionDomain}.test`,
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
      },
      body: {
        greeting: 'Gatekeeper,',
        summary: 'Please review the attached verification packet for a standard access renewal.',
        justification:
          'The request references the quarterly archive rotation already listed in the verification packet.',
        call_to_action: 'Cross-check the packet against your intake ledger before approval.',
        signature: `Records Desk, ${factionName}`,
      },
      links: [
        {
          label: 'Verification Ledger',
          url: 'https://verification.archive.test/ledger',
          is_suspicious: false,
        },
      ],
      attachments: [{ name: 'verification_packet.pdf', type: 'pdf', is_suspicious: false }],
      signals: [
        {
          type: 'verification_hint',
          location: 'body.call_to_action',
          explanation: 'The request includes a clear offline verification step.',
        },
      ],
      safety_flags: ['ok'],
      faction: factionName,
      difficulty,
      threat_level: threatLevel,
      ...(attackType ? { attack_type: attackType } : {}),
      ...(request.season !== undefined ? { season: request.season } : {}),
      ...(request.chapter !== undefined ? { chapter: request.chapter } : {}),
    };
  }

  if (category === 'intel_brief') {
    return {
      content_type: 'intel_brief',
      executive_summary:
        'Threat telemetry suggests a focused access-manipulation wave against archive intake procedures.',
      observed_indicators: [
        'Increased use of urgency language in access requests',
        'Credential refresh narratives tied to routine maintenance',
        'Sender identities leaning on trusted internal sounding roles',
      ],
      expected_adversary_tactics: [attackType, 'credential_harvesting'],
      recommended_posture:
        'Require offline verification for any request that introduces urgency or unexpected identity changes.',
      safety_flags: ['ok'],
    };
  }

  if (category === 'scenario_variation') {
    return {
      content_type: 'scenario_variation',
      name: request.contentName ?? 'Archive relay sync anomaly',
      summary:
        'A staggered campaign attempts to blend routine archive relay maintenance with escalating credential abuse.',
      trigger_conditions: [
        `Threat level remains at ${threatLevel}`,
        'Player processes a suspicious maintenance-themed access request',
      ],
      required_deliverables: ['email_wave', 'intel_brief'],
      follow_up_triggers: ['verification_requested', 'delayed_response'],
      safety_flags: ['ok'],
    };
  }

  return {
    content_type: 'email',
    headers: {
      from: `liaison@${factionDomain}.invalid`,
      to: 'intake@archive.invalid',
      subject: 'Immediate Credential Refresh Required',
      date: '2063-09-14T14:22:00Z',
      message_id: `<fallback-phishing@${factionDomain}.invalid>`,
      reply_to: `liaison@${factionDomain}.invalid`,
      spf: 'fail',
      dkim: 'neutral',
      dmarc: 'fail',
    },
    body: {
      greeting: 'Director,',
      summary: 'A priority credential refresh is required to maintain archive access.',
      justification:
        'Signal-loss mitigation rotated our access relay, so your current access token must be updated.',
      call_to_action:
        'Open the verification portal now and complete the credential sync before shift change.',
      signature: `Liaison Desk, ${factionName} Relay`,
    },
    links: [
      {
        label: 'Credential Sync Portal',
        url: `https://verify.${factionDomain}.invalid/portal`,
        is_suspicious: true,
      },
    ],
    attachments: [{ name: 'relay_notice.pdf', type: 'pdf', is_suspicious: false }],
    signals: [
      {
        type: 'domain_mismatch',
        location: 'headers.from',
        explanation: 'The sender uses an unexpected domain for the claimed organization.',
      },
      {
        type: 'urgency',
        location: 'body.call_to_action',
        explanation: 'The message pressures the player to act immediately.',
      },
    ],
    safety_flags: ['ok'],
    faction: factionName,
    attack_type: attackType,
    difficulty,
    threat_level: threatLevel,
    ...(request.season !== undefined ? { season: request.season } : {}),
    ...(request.chapter !== undefined ? { chapter: request.chapter } : {}),
  };
};

const buildGenerationFailureCategory = (error: unknown): GenerationFailureCategory => {
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

const hasConfiguredOutputSchema = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length > 0;

const clampGenerationRetries = (configuredRetries: number): number =>
  Math.min(MAX_GENERATION_RETRIES, Math.max(0, configuredRetries));

const resolveGenerationTemperature = (attemptIndex: number): number => {
  const resolved =
    generationRetryTemperatures[Math.min(attemptIndex, generationRetryTemperatures.length - 1)];

  return resolved ?? generationRetryTemperatures[generationRetryTemperatures.length - 1]!;
};

const formatGenerationAttemptErrorMessage = (error: unknown): string => {
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

const buildGenerationRetryPrompt = (
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

const mergeUsageMetrics = (current: UsageMetrics, next: UsageMetrics): UsageMetrics => {
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

const assertSemanticVersion = (version: string): void => {
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
    throw badRequest('Prompt template version must use semantic versioning (major.minor.patch)', {
      field: 'version',
    });
  }
};

const validatePromptTemplateInput = (
  input: PromptTemplateInput | PromptTemplateUpdate,
  options: { requireOutputSchema: boolean },
  category?: PromptTemplateInput['category'],
): void => {
  if (input.version !== undefined) {
    assertSemanticVersion(input.version);
  }

  if (options.requireOutputSchema && input.outputSchema === undefined) {
    throw badRequest(
      'Prompt template outputSchema is required and must define at least one schema rule',
      { field: 'outputSchema' },
    );
  }

  if (input.outputSchema !== undefined) {
    if (!category) {
      throw badRequest('Prompt template category is required when validating outputSchema', {
        field: 'category',
      });
    }

    if (!hasConfiguredOutputSchema(input.outputSchema)) {
      throw badRequest('Prompt template outputSchema must define at least one schema rule', {
        field: 'outputSchema',
      });
    }

    try {
      assertCategoryOutputSchema(category, input.outputSchema);
    } catch (error) {
      throw badRequest(
        error instanceof Error ? error.message : 'Prompt template outputSchema is invalid',
        { field: 'outputSchema' },
      );
    }
  }
};

const createDefaultPromptRepository = (
  config: CreateAiPipelineServiceOptions['config'],
): PromptTemplateRepository => {
  const db = getDatabaseClient(config);

  const executeTenantScopedPromptQuery = async <T>(
    tenantId: string,
    query: (transaction: DB) => Promise<T>,
  ): Promise<T> =>
    db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select
              set_config('app.current_tenant_id', ${tenantId}, true),
              set_config('app.tenant_id', ${tenantId}, true)`,
      );

      return query(transaction as unknown as DB);
    });

  return {
    list: (tenantId, filters) =>
      executeTenantScopedPromptQuery(tenantId, (transaction) =>
        aiPipelineRepo.listPromptTemplates(transaction, tenantId, filters),
      ),
    getById: (tenantId, id) =>
      executeTenantScopedPromptQuery(tenantId, (transaction) =>
        aiPipelineRepo.findPromptTemplateById(transaction, tenantId, id),
      ),
    getActiveForGeneration: (tenantId, selector) =>
      executeTenantScopedPromptQuery(tenantId, (transaction) =>
        aiPipelineRepo.findActivePromptTemplate(transaction, tenantId, selector),
      ),
    create: (tenantId, input) =>
      executeTenantScopedPromptQuery(tenantId, (transaction) =>
        aiPipelineRepo.createPromptTemplate(transaction, tenantId, input),
      ),
    update: (tenantId, id, input) =>
      executeTenantScopedPromptQuery(tenantId, (transaction) =>
        aiPipelineRepo.updatePromptTemplate(transaction, tenantId, id, input),
      ),
    delete: (tenantId, id) =>
      executeTenantScopedPromptQuery(tenantId, (transaction) =>
        aiPipelineRepo.deletePromptTemplate(transaction, tenantId, id),
      ),
    recordGenerationLog: async (entry) => {
      try {
        await executeTenantScopedPromptQuery(entry.tenantId, (transaction) =>
          aiPipelineRepo.createAiGenerationLogEntry(transaction, entry),
        );
      } catch {
        // AI generation logging should never block content fallback or storage.
      }
    },
  };
};

const createMissingContentGateway = (): ContentGateway => ({
  createEmailTemplate: async () => {
    throw new Error('contentGateway is required to store generated email content');
  },
  listEmailTemplates: async () => {
    throw new Error('contentGateway is required to inspect generated email pool entries');
  },
  listFallbackEmailTemplates: async () => {
    throw new Error('contentGateway is required to inspect fallback email templates');
  },
  createDocumentTemplate: async () => {
    throw new Error('contentGateway is required to store generated document content');
  },
  createScenario: async () => {
    throw new Error('contentGateway is required to store generated scenario content');
  },
});

const resolveFallbackEmailContent = async (
  tenantId: string,
  request: FallbackEmailRequest,
  contentGateway: ContentGateway,
  logger: AiPipelineLogger,
): Promise<Record<string, unknown>> => {
  let fallbackTemplates: FallbackEmailTemplate[];

  try {
    fallbackTemplates = await listFallbackEmailTemplatesForRequest(
      tenantId,
      request,
      contentGateway,
    );
  } catch (error) {
    logger.warn(
      {
        tenantId,
        category: request.category,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to inspect curated fallback email templates; using built-in fallback',
    );
    return buildHandcraftedFallback(request.category, request);
  }

  const orderedTemplates = [...fallbackTemplates].sort((left, right) =>
    compareFallbackTemplates(left, right, request),
  );

  for (const fallbackTemplate of orderedTemplates) {
    if (!isHandcraftedFallbackTemplate(fallbackTemplate)) {
      logger.warn(
        {
          fallbackTemplateId: fallbackTemplate.id,
          category: request.category,
        },
        'Skipping non-handcrafted fallback email template',
      );
      continue;
    }

    const rawCandidate = buildStructuredFallbackFromTemplate(fallbackTemplate, request);

    try {
      const candidate = parseStructuredOutput<Record<string, unknown>>(
        JSON.stringify(sanitizeEmailContentForCategory(request.category, rawCandidate)),
        getDefaultOutputSchema(request.category),
      );
      const safety = validateGeneratedContentSafety(request.category, candidate);
      if (!safety.ok) {
        logger.warn(
          {
            fallbackTemplateId: fallbackTemplate.id,
            category: request.category,
            flags: safety.flags,
          },
          'Skipping unsafe handcrafted fallback template',
        );
        continue;
      }

      candidate['safety_flags'] = safety.flags;
      return candidate;
    } catch (error) {
      logger.warn(
        {
          fallbackTemplateId: fallbackTemplate.id,
          category: request.category,
          error: error instanceof Error ? error.message : String(error),
        },
        'Skipping invalid fallback template payload',
      );
    }
  }

  return buildHandcraftedFallback(request.category, request);
};

const storeGeneratedContent = async (
  tenantId: string,
  requestId: string,
  templateName: string,
  request: ContentGenerationRequest,
  resolvedContext: ResolvedRequestContext,
  content: Record<string, unknown>,
  quality: GeneratedContentResult['quality'],
  difficulty: GeneratedContentResult['difficulty'],
  safety: GeneratedContentResult['safety'],
  model: string,
  fallbackApplied: boolean,
  contentGateway: ContentGateway,
  usage: UsageMetrics,
): Promise<StoredContentReference> => {
  if (request.category === 'email_phishing' || request.category === 'email_legitimate') {
    const headers = isRecord(content['headers']) ? content['headers'] : {};
    const subject = readString(headers['subject']) ?? 'Generated AI content';
    const sender = parseMailboxHeader(headers['from']);
    const replyToMailbox = parseMailboxHeader(headers['reply_to']);
    const fromEmail = sender.address;
    const fromName =
      sender.displayName ??
      deriveSenderNameFromSignature(content) ??
      deriveSenderNameFromAddress(sender.address);
    const preferredStringMetadata = (...values: [unknown, ...unknown[]]): string | undefined =>
      fallbackApplied
        ? pickFirstString(...values)
        : pickFirstString(values[1], values[0], ...values.slice(2));
    const preferredNumericMetadata = (...values: [unknown, ...unknown[]]): number | undefined =>
      fallbackApplied
        ? pickFirstNumber(...values)
        : pickFirstNumber(values[1], values[0], ...values.slice(2));
    const storedFaction =
      preferredStringMetadata(
        readContentString(content, 'faction'),
        request.faction,
        resolvedContext.faction,
      ) ?? null;
    const storedAttackType =
      request.category === 'email_legitimate'
        ? null
        : (preferredStringMetadata(
            readContentString(content, 'attack_type', 'attackType'),
            request.attackType,
            resolvedContext.attackType,
          ) ?? null);
    const storedThreatLevel =
      preferredStringMetadata(
        readContentString(content, 'threat_level', 'threatLevel'),
        request.threatLevel,
        resolvedContext.threatLevel,
      ) ?? 'LOW';
    const storedSeason =
      preferredNumericMetadata(
        readContentNumber(content, 'season'),
        request.season,
        resolvedContext.season,
      ) ?? null;
    const storedChapter =
      preferredNumericMetadata(
        readContentNumber(content, 'chapter'),
        request.chapter,
        resolvedContext.chapter,
      ) ?? null;

    const storedRecord = await contentGateway.createEmailTemplate(tenantId, {
      name: request.contentName ?? `${templateName} generated ${requestId}`,
      subject,
      body: composeEmailBody(content),
      fromName,
      fromEmail,
      replyTo: replyToMailbox.address ?? readString(headers['reply_to']) ?? null,
      contentType: request.category,
      difficulty: difficulty.difficulty,
      faction: storedFaction,
      attackType: storedAttackType,
      threatLevel: storedThreatLevel,
      season: storedSeason,
      chapter: storedChapter,
      language: resolvedContext.language ?? 'en',
      locale: resolvedContext.locale ?? 'en-US',
      metadata: {
        generatedContent: content,
        quality,
        difficulty,
        safety,
        requestId,
        fallbackApplied,
        model,
        usage,
      },
      isAiGenerated: !fallbackApplied,
      isActive: true,
    });

    return {
      kind: 'email',
      id: storedRecord.id,
    };
  }

  if (request.category === 'intel_brief') {
    const storedRecord = await contentGateway.createDocumentTemplate(tenantId, {
      name: request.contentName ?? `${templateName} intelligence brief`,
      documentType: 'INTELLIGENCE_BRIEF',
      title: deriveDocumentTitle(request, `${templateName} intelligence brief`, content),
      content: composeDocumentBody('intel_brief', content),
      difficulty: difficulty.difficulty,
      faction: request.faction ?? resolvedContext.faction ?? null,
      season: request.season ?? resolvedContext.season ?? null,
      chapter: request.chapter ?? resolvedContext.chapter ?? null,
      language: resolvedContext.language ?? 'en',
      locale: resolvedContext.locale ?? 'en-US',
      metadata: {
        generatedContent: content,
        quality,
        difficulty,
        safety,
        requestId,
        fallbackApplied,
        model,
        usage,
      },
      isActive: true,
    });

    return {
      kind: 'document',
      id: storedRecord.id,
    };
  }

  const storedRecord = await contentGateway.createScenario(tenantId, {
    name:
      request.contentName ??
      deriveDocumentTitle(request, `${templateName} scenario variation`, content),
    description: readString(content['summary']) ?? 'Generated scenario variation',
    difficulty: difficulty.difficulty,
    faction: request.faction ?? resolvedContext.faction ?? null,
    season: request.season ?? resolvedContext.season ?? null,
    chapter: request.chapter ?? resolvedContext.chapter ?? null,
    language: resolvedContext.language ?? 'en',
    locale: resolvedContext.locale ?? 'en-US',
    metadata: {
      generatedContent: content,
      quality,
      difficulty,
      safety,
      requestId,
      fallbackApplied,
      model,
      usage,
    },
    isActive: true,
  });

  return {
    kind: 'scenario',
    id: storedRecord.id,
  };
};

const maybeEmitLowPoolEvent = async (params: {
  tenantId: string;
  userId: string;
  requestId: string;
  request: ContentGenerationRequest;
  contentGateway: ContentGateway;
  eventBus: CreateAiPipelineServiceOptions['eventBus'];
  threshold: number;
}): Promise<void> => {
  if (
    params.request.category !== 'email_phishing' &&
    params.request.category !== 'email_legitimate'
  ) {
    return;
  }

  const poolTemplates = await listDifficultyPoolEmailTemplates(
    params.tenantId,
    params.request as FallbackEmailRequest,
    params.contentGateway,
  );
  const currentSize = poolTemplates.length;

  if (currentSize >= params.threshold) {
    return;
  }

  params.eventBus.publish(
    createContentPoolLowEvent({
      correlationId: params.requestId,
      tenantId: params.tenantId,
      userId: params.userId,
      payload: {
        generationId: params.requestId,
        contentType: params.request.category,
        difficulty: params.request.difficulty ?? null,
        currentSize,
        targetSize: params.threshold,
      },
    }),
  );
};

export const createAiPipelineService = (
  options: CreateAiPipelineServiceOptions,
): AiPipelineService => {
  const logger = options.logger ?? noOpLogger;
  const promptRepository =
    options.promptTemplateRepository ?? createDefaultPromptRepository(options.config);
  const contentGateway = options.contentGateway ?? createMissingContentGateway();
  const claudeClient =
    options.claudeClient ?? createClaudeClient({ config: options.config, logger });
  const generateId = options.generateId ?? defaultGenerateId;
  const emailPoolLowThreshold = options.emailPoolLowThreshold ?? DEFAULT_EMAIL_POOL_LOW_THRESHOLD;

  const defaultReviewStatus: HumanReviewStatus = {
    requiresReview: false,
    triggers: [],
  };

  const generateContent = async (
    tenantId: string,
    userId: string,
    request: ContentGenerationRequest,
  ): Promise<GeneratedContentResult> => {
    const normalizedRequest =
      request.category === 'email_legitimate' ? omitAttackType(request) : request;
    let resolvedContext = resolveRequestContext(normalizedRequest, emptyTemplateContext);
    assertSafeRequestedStorageMetadata(normalizedRequest, resolvedContext);
    const requestId = generateId();
    const requestedAttackType = pickFirstString(
      normalizedRequest.attackType,
      readContextValue(normalizedRequest.context, 'attackType'),
      readContextValue(normalizedRequest.context, 'attack_type'),
    );
    const requestedThreatLevel = pickFirstString(
      normalizedRequest.threatLevel,
      readContextValue(normalizedRequest.context, 'threatLevel'),
      readContextValue(normalizedRequest.context, 'threat_level'),
    );
    const requestedDifficulty = pickFirstNumber(
      normalizedRequest.difficulty,
      readContextValue(normalizedRequest.context, 'difficulty'),
    );
    const requestedSeason = pickFirstNumber(
      normalizedRequest.season,
      readContextValue(normalizedRequest.context, 'season'),
    );
    const requestedChapter = pickFirstNumber(
      normalizedRequest.chapter,
      readContextValue(normalizedRequest.context, 'chapter'),
    );
    const templateSelector = {
      category: normalizedRequest.category,
      ...(normalizedRequest.templateId ? { templateId: normalizedRequest.templateId } : {}),
      ...(normalizedRequest.templateName ? { templateName: normalizedRequest.templateName } : {}),
      ...(requestedAttackType ? { attackType: requestedAttackType } : {}),
      ...(requestedThreatLevel ? { threatLevel: requestedThreatLevel } : {}),
      ...(requestedDifficulty !== undefined ? { difficulty: requestedDifficulty } : {}),
      ...(requestedSeason !== undefined ? { season: requestedSeason } : {}),
      ...(requestedChapter !== undefined ? { chapter: requestedChapter } : {}),
    };
    let templateId = FALLBACK_TEMPLATE_ID;
    let templateVersion = FALLBACK_TEMPLATE_VERSION;
    let templateName = normalizedRequest.templateName ?? `${normalizedRequest.category} fallback`;
    let promptHash = buildFallbackPromptHash(normalizedRequest);
    let effectiveRequest = applyResolvedRequestContext(normalizedRequest, resolvedContext);
    let generationContext = buildGenerationContext(normalizedRequest, resolvedContext);

    let content: Record<string, unknown> | undefined;
    let fallbackApplied = false;
    let failureCategory: GenerationFailureCategory | undefined;
    let model = 'handcrafted-fallback';
    let attemptedModel: string | undefined;
    let lastValidationError: unknown;
    let usage: UsageMetrics = {};

    try {
      const template = await promptRepository.getActiveForGeneration(tenantId, templateSelector);

      if (!template) {
        throw new MissingPromptTemplateError();
      }

      templateId = template.id;
      templateVersion = template.version;
      templateName = template.name;
      resolvedContext = resolveRequestContext(normalizedRequest, template);
      effectiveRequest = applyResolvedRequestContext(normalizedRequest, resolvedContext);
      generationContext = buildGenerationContext(normalizedRequest, resolvedContext);

      let promptTemplateOutputSchema = getDefaultOutputSchema(normalizedRequest.category);
      if (!hasConfiguredOutputSchema(template.outputSchema)) {
        logger.warn(
          {
            templateId: template.id,
            category: normalizedRequest.category,
          },
          'Prompt template missing output schema; using category default schema',
        );
      } else {
        try {
          promptTemplateOutputSchema = assertCategoryOutputSchema(
            normalizedRequest.category,
            template.outputSchema,
          );
        } catch (error) {
          throw new InvalidPromptTemplateSchemaError(
            error instanceof Error ? error.message : 'Prompt template outputSchema is invalid',
          );
        }
      }
      const prompt = buildPrompt(
        {
          systemPrompt: template.systemPrompt,
          userTemplate: template.userTemplate,
          outputSchema: promptTemplateOutputSchema,
        },
        generationContext,
      );
      promptHash = prompt.promptHash;
      attemptedModel = resolveAnthropicModel(options.config, 'generation');

      const maxGenerationAttempts = clampGenerationRetries(options.config.AI_MAX_RETRIES) + 1;

      for (let attemptIndex = 0; attemptIndex < maxGenerationAttempts; attemptIndex += 1) {
        const attemptNumber = attemptIndex + 1;
        const attemptPrompt =
          attemptIndex === 0 || lastValidationError === undefined
            ? prompt
            : buildGenerationRetryPrompt(
                prompt,
                attemptNumber,
                maxGenerationAttempts,
                lastValidationError,
              );
        promptHash = attemptPrompt.promptHash;

        const completion = await claudeClient.complete({
          task: 'generation',
          requestId,
          systemPrompt: attemptPrompt.systemPrompt,
          userPrompt: attemptPrompt.userPrompt,
          maxTokens: template.tokenBudget,
          temperature: resolveGenerationTemperature(attemptIndex),
          model: attemptedModel,
        });

        model = completion.model;
        const attemptUsage = {
          ...(completion.inputTokens !== undefined ? { inputTokens: completion.inputTokens } : {}),
          ...(completion.outputTokens !== undefined
            ? { outputTokens: completion.outputTokens }
            : {}),
          ...(completion.latencyMs !== undefined ? { latencyMs: completion.latencyMs } : {}),
          ...(completion.estimatedCostUsd !== undefined
            ? { estimatedCostUsd: completion.estimatedCostUsd }
            : {}),
        } satisfies UsageMetrics;
        usage = mergeUsageMetrics(usage, attemptUsage);

        try {
          const parsedContent = sanitizeEmailContentForCategory(
            normalizedRequest.category,
            parseStructuredOutput<Record<string, unknown>>(
              completion.text,
              promptTemplateOutputSchema,
            ),
          );
          const generatedSafety = validateGeneratedContentSafety(
            normalizedRequest.category,
            parsedContent,
          );
          if (!generatedSafety.ok) {
            throw new SafetyRejectionError(generatedSafety);
          }

          content = parsedContent;
          failureCategory = undefined;
          lastValidationError = undefined;
          break;
        } catch (error) {
          const validationError =
            error instanceof SafetyRejectionError
              ? error
              : new InvalidGeneratedOutputError(
                  error instanceof Error ? error.message : String(error),
                );

          failureCategory = buildGenerationFailureCategory(validationError);
          lastValidationError = validationError;
          await promptRepository.recordGenerationLog({
            tenantId,
            requestId,
            promptHash,
            model,
            contentType: normalizedRequest.category,
            status: 'REJECTED',
            errorMessage: formatGenerationAttemptErrorMessage(validationError),
            generationParams: {
              templateId,
              attempt: attemptNumber,
              maxAttempts: maxGenerationAttempts,
              failureCategory,
              fallbackApplied: false,
              retryScheduled: attemptNumber < maxGenerationAttempts,
            },
            ...(attemptUsage.inputTokens !== undefined
              ? { inputTokens: attemptUsage.inputTokens }
              : {}),
            ...(attemptUsage.outputTokens !== undefined
              ? { outputTokens: attemptUsage.outputTokens }
              : {}),
          });

          if (attemptNumber === maxGenerationAttempts) {
            throw validationError;
          }

          logger.warn(
            {
              requestId,
              tenantId,
              category: normalizedRequest.category,
              attempt: attemptNumber,
              maxAttempts: maxGenerationAttempts,
              error: formatGenerationAttemptErrorMessage(validationError),
              failureCategory,
            },
            'Generated content failed validation; retrying Claude generation',
          );
        }
      }

      if (!content) {
        throw new InvalidGeneratedOutputError('Claude generation returned no valid content');
      }
    } catch (error) {
      fallbackApplied = true;
      failureCategory = buildGenerationFailureCategory(error);
      if (model === 'handcrafted-fallback' && attemptedModel) {
        model = attemptedModel;
      }

      logger.warn(
        {
          requestId,
          tenantId,
          category: normalizedRequest.category,
          error: error instanceof Error ? error.message : String(error),
          failureCategory,
        },
        'AI generation failed, switching to handcrafted fallback',
      );

      content =
        normalizedRequest.category === 'email_phishing' ||
        normalizedRequest.category === 'email_legitimate'
          ? await resolveFallbackEmailContent(
              tenantId,
              effectiveRequest as FallbackEmailRequest,
              contentGateway,
              logger,
            )
          : buildHandcraftedFallback(normalizedRequest.category, effectiveRequest);
    }

    if (!content) {
      throw new Error('AI pipeline did not produce content');
    }

    content = sanitizeEmailContentForCategory(normalizedRequest.category, content);

    const safety = validateGeneratedContentSafety(normalizedRequest.category, content);
    if (!safety.ok) {
      throw new Error(`Fallback content failed safety validation: ${safety.flags.join(', ')}`);
    }
    content['safety_flags'] = safety.flags;

    const quality = scoreGeneratedContent(normalizedRequest.category, content, generationContext);
    const difficulty = await classifyDifficulty({
      category: normalizedRequest.category,
      content,
      ...(effectiveRequest.attackType ? { attackType: effectiveRequest.attackType } : {}),
      ...(effectiveRequest.difficulty !== undefined
        ? { baselineDifficulty: effectiveRequest.difficulty }
        : {}),
      ...(!fallbackApplied ? { claudeClient } : {}),
      requestId,
    });
    usage = mergeUsageMetrics(usage, difficulty.usage ?? {});

    let reviewStatus: HumanReviewStatus = defaultReviewStatus;
    if (!fallbackApplied) {
      reviewStatus = await evaluateHumanReviewTriggers(
        effectiveRequest,
        templateId,
        templateVersion,
        quality,
        safety.findings,
        content,
      );

      options.eventBus.publish(
        createSafetyCheckCompletedEvent({
          correlationId: requestId,
          tenantId,
          userId,
          payload: {
            generationId: requestId,
            correlationId: requestId,
            tenantId,
            templateId,
            templateVersion,
            safetyOk: safety.ok,
            safetyFlags: safety.flags,
            safetyFindings: safety.findings,
            requiresHumanReview: reviewStatus.requiresReview,
            reviewTriggers: reviewStatus.triggers,
            ...(reviewStatus.confidenceScore !== undefined
              ? { confidenceScore: reviewStatus.confidenceScore }
              : {}),
            ...(reviewStatus.edgeCasePatterns !== undefined
              ? { edgeCasePatterns: reviewStatus.edgeCasePatterns }
              : {}),
          },
        }),
      );

      if (reviewStatus.requiresReview) {
        options.eventBus.publish(
          createHumanReviewRequiredEvent({
            correlationId: requestId,
            tenantId,
            userId,
            payload: {
              generationId: requestId,
              correlationId: requestId,
              tenantId,
              templateId,
              templateVersion,
              triggers: reviewStatus.triggers,
              safetyFindings: safety.findings,
              ...(reviewStatus.confidenceScore !== undefined
                ? { confidenceScore: reviewStatus.confidenceScore }
                : {}),
              ...(reviewStatus.edgeCasePatterns !== undefined
                ? { edgeCasePatterns: reviewStatus.edgeCasePatterns }
                : {}),
            },
          }),
        );
      }
    }

    const storedContent = await storeGeneratedContent(
      tenantId,
      requestId,
      templateName,
      effectiveRequest,
      resolvedContext,
      content,
      quality,
      difficulty,
      safety,
      model,
      fallbackApplied,
      contentGateway,
      usage,
    );

    const status = fallbackApplied ? 'FAILED' : 'SUCCESS';
    await promptRepository.recordGenerationLog({
      tenantId,
      requestId,
      promptHash,
      model,
      contentType: normalizedRequest.category,
      status,
      generationParams: {
        generationId: requestId,
        templateId,
        templateVersion,
        fallbackApplied,
        qualityScore: quality.score,
        difficulty: difficulty.difficulty,
        estimatedCostUsd: usage.estimatedCostUsd,
        failureCategory,
        ...(normalizedRequest.templateId
          ? { requestedTemplateId: normalizedRequest.templateId }
          : {}),
        ...(normalizedRequest.templateName
          ? { requestedTemplateName: normalizedRequest.templateName }
          : {}),
      },
      ...(usage.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
      ...(usage.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
      ...(failureCategory ? { errorMessage: failureCategory } : {}),
    });

    const lifecycleEventInput = {
      correlationId: requestId,
      tenantId,
      userId,
      payload: {
        generationId: requestId,
        requestId,
        templateId,
        templateVersion,
        model,
        fallbackApplied,
        qualityScore: quality.score,
        difficulty: difficulty.difficulty,
        storedContentId: storedContent.id,
        ...(failureCategory ? { errorCategory: failureCategory } : {}),
        ...(usage.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
        ...(usage.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
        ...(usage.latencyMs !== undefined ? { latencyMs: usage.latencyMs } : {}),
        ...(usage.estimatedCostUsd !== undefined
          ? { estimatedCostUsd: usage.estimatedCostUsd }
          : {}),
      },
    };

    options.eventBus.publish(
      fallbackApplied
        ? createAiGenerationFailedEvent(lifecycleEventInput)
        : createAiGenerationCompletedEvent(lifecycleEventInput),
    );

    options.eventBus.publish(
      createAnalyticsAiGenerationRecordedEvent({
        correlationId: requestId,
        tenantId,
        userId,
        payload: {
          generationId: requestId,
          contentType: normalizedRequest.category,
          templateId,
          templateVersion,
          model,
          fallbackApplied,
          qualityScore: quality.score,
          difficulty: difficulty.difficulty,
          safetyFlags: safety.flags,
          safetyFindings: safety.findings,
          requiresHumanReview: reviewStatus.requiresReview,
          reviewTriggers: reviewStatus.triggers,
          ...(reviewStatus.confidenceScore !== undefined
            ? { confidenceScore: reviewStatus.confidenceScore }
            : {}),
          ...(reviewStatus.edgeCasePatterns !== undefined
            ? { edgeCasePatterns: reviewStatus.edgeCasePatterns }
            : {}),
          storedContentId: storedContent.id,
          ...(failureCategory ? { failureCategory } : {}),
          ...(usage.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
          ...(usage.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
          ...(usage.latencyMs !== undefined ? { latencyMs: usage.latencyMs } : {}),
          ...(usage.estimatedCostUsd !== undefined
            ? { estimatedCostUsd: usage.estimatedCostUsd }
            : {}),
        },
      }),
    );

    try {
      await maybeEmitLowPoolEvent({
        tenantId,
        userId,
        requestId,
        request: {
          ...effectiveRequest,
          difficulty: difficulty.difficulty,
        },
        contentGateway,
        eventBus: options.eventBus,
        threshold: emailPoolLowThreshold,
      });
    } catch (error) {
      logger.warn(
        {
          requestId,
          tenantId,
          category: normalizedRequest.category,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to inspect email pool state after generation',
      );
    }

    return {
      requestId,
      templateId,
      templateVersion,
      model,
      fallbackApplied,
      ...(failureCategory ? { failureCategory } : {}),
      promptHash,
      content,
      quality,
      difficulty,
      safety,
      reviewStatus,
      storedContent,
      usage,
    };
  };

  return {
    listPromptTemplates: (tenantId, filters) => promptRepository.list(tenantId, filters),
    getPromptTemplate: (tenantId, id) => promptRepository.getById(tenantId, id),
    createPromptTemplate: (tenantId, input) => {
      validatePromptTemplateInput(input, { requireOutputSchema: true }, input.category);
      return promptRepository.create(tenantId, input).catch((error: unknown) =>
        rethrowPromptTemplateWriteError(
          error,
          tenantId,
          toPromptTemplateConflictDetails({
            name: input.name,
            version: input.version,
          }),
        ),
      );
    },
    updatePromptTemplate: async (tenantId, id, input) => {
      const shouldValidateSchema = input.outputSchema !== undefined || input.category !== undefined;
      const existingTemplate = shouldValidateSchema
        ? await promptRepository.getById(tenantId, id)
        : undefined;
      const validationCategory =
        input.category ??
        (isPromptTemplateCategory(existingTemplate?.category)
          ? existingTemplate.category
          : undefined);
      const existingOutputSchema =
        existingTemplate !== undefined && hasConfiguredOutputSchema(existingTemplate.outputSchema)
          ? existingTemplate.outputSchema
          : undefined;

      if (
        shouldValidateSchema &&
        existingTemplate !== undefined &&
        validationCategory === undefined
      ) {
        throw badRequest('Prompt template category must be a supported AI pipeline category', {
          field: 'category',
        });
      }

      if (input.outputSchema !== undefined && validationCategory === undefined) {
        return promptRepository.update(tenantId, id, input);
      }

      if (
        shouldValidateSchema &&
        existingTemplate !== undefined &&
        input.outputSchema === undefined &&
        existingOutputSchema === undefined
      ) {
        throw badRequest('Prompt template outputSchema must define at least one schema rule', {
          field: 'outputSchema',
        });
      }

      const validationInput =
        shouldValidateSchema && validationCategory !== undefined
          ? {
              ...input,
              ...(input.outputSchema !== undefined
                ? { outputSchema: input.outputSchema }
                : existingOutputSchema !== undefined
                  ? { outputSchema: existingOutputSchema }
                  : {}),
            }
          : input;

      validatePromptTemplateInput(
        validationInput,
        { requireOutputSchema: false },
        validationCategory,
      );
      try {
        return await promptRepository.update(tenantId, id, input);
      } catch (error) {
        return rethrowPromptTemplateWriteError(
          error,
          tenantId,
          toPromptTemplateConflictDetails({
            promptTemplateId: id,
            name: input.name,
            version: input.version,
          }),
        );
      }
    },
    deletePromptTemplate: (tenantId, id) => promptRepository.delete(tenantId, id),
    generateContent,
    generateEmail: (tenantId, userId, request) => generateContent(tenantId, userId, request),
    generateIntelBrief: (tenantId, userId, request) =>
      generateContent(tenantId, userId, {
        ...request,
        category: 'intel_brief',
      }),
    generateScenarioVariation: (tenantId, userId, request) =>
      generateContent(tenantId, userId, {
        ...request,
        category: 'scenario_variation',
      }),
  };
};
