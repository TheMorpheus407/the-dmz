import { sql } from 'drizzle-orm';

import { getDatabaseClient, type DB } from '../../shared/database/connection.js';
import { badRequest, conflict } from '../../shared/middleware/error-handler.js';
import { generateId as defaultGenerateId } from '../../shared/utils/id.js';
// eslint-disable-next-line import-x/no-restricted-paths
import { scoreEmail as scoreContentQuality } from '../content/index.js';

import * as aiPipelineRepo from './ai-pipeline.repo.js';
import { createClaudeClient, resolveAnthropicModel } from './claude-client.service.js';
import { classifyDifficulty } from './difficulty-classifier.service.js';
import {
  assertCategoryOutputSchema,
  getDefaultOutputSchema,
  parseStructuredOutput,
} from './output-parser.service.js';
import { createContentPoolLowEvent } from './ai-pipeline.events.js';
import { buildPrompt } from './prompt-engine.service.js';
import { scoreGeneratedContent } from './quality-scorer.service.js';
import { validateGeneratedContentSafety } from './safety-validator.service.js';
import { evaluateHumanReviewTriggers } from './human-review-trigger.service.js';
import {
  type AiPipelineLogger,
  type AiPipelineService,
  type ContentGateway,
  type ContentGenerationRequest,
  type CreateAiPipelineServiceOptions,
  type GeneratedContentResult,
  type HumanReviewStatus,
  type PromptTemplateInput,
  type PromptTemplateRepository,
  type PromptTemplateUpdate,
  type UsageMetrics,
} from './ai-pipeline.types.js';
import { isPromptTemplateCategory } from './prompt-template-category.js';
import {
  SafetyRejectionError,
  InvalidGeneratedOutputError,
  MissingPromptTemplateError,
  InvalidPromptTemplateSchemaError,
} from './ai-pipeline-errors.js';
import {
  FALLBACK_TEMPLATE_ID,
  FALLBACK_TEMPLATE_VERSION,
  type FallbackEmailRequest,
  type FallbackEmailTemplate,
  listFallbackEmailTemplatesForRequest,
  listDifficultyPoolEmailTemplates,
  compareFallbackTemplates,
  buildFallbackPromptHash,
  isHandcraftedFallbackTemplate,
} from './fallback-template-selector.js';
import {
  composeEmailBody,
  buildHandcraftedFallback,
  sanitizeEmailContentForCategory,
  buildStructuredFallbackFromTemplate,
} from './content-builder.js';
import {
  buildGenerationFailureCategory,
  clampGenerationRetries,
  resolveGenerationTemperature,
  formatGenerationAttemptErrorMessage,
  buildGenerationRetryPrompt,
  mergeUsageMetrics,
} from './generation-retry-handler.js';
import { createContentStorageOrchestrator } from './content-storage-orchestrator.js';
import { createEventPublishingOrchestrator } from './event-publishing-orchestrator.js';

const DEFAULT_EMAIL_POOL_LOW_THRESHOLD = 20;
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';
const PROMPT_TEMPLATE_NAME_VERSION_CONSTRAINT = 'ai_prompt_templates_name_version_idx';

const noOpLogger: AiPipelineLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readObjectString = (value: Record<string, unknown>, key: string): string | undefined =>
  readString(value[key]);

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

const hasConfiguredOutputSchema = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length > 0;

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

  const storageOrchestrator = createContentStorageOrchestrator(contentGateway);
  const eventOrchestrator = createEventPublishingOrchestrator(options.eventBus);

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
    let failureCategory: ReturnType<typeof buildGenerationFailureCategory> | undefined;
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

    const contentHeaders = isRecord(content['headers']) ? content['headers'] : {};
    const contentQualityInput = {
      subject: readString(contentHeaders['subject']) ?? '',
      body: composeEmailBody(content),
      fromName: readString(content['fromName']),
      fromEmail: readString(content['fromEmail']),
      replyTo: readString(contentHeaders['reply_to']),
      headers: contentHeaders as Record<string, string>,
      faction: resolvedContext.faction,
      attackType: resolvedContext.attackType,
      difficulty: difficulty.difficulty,
      worldState: {
        day: resolvedContext.season,
        threatLevel: resolvedContext.threatLevel,
      },
    };
    const contentQuality = scoreContentQuality(contentQualityInput);
    content['content_quality'] = {
      overall: contentQuality.overall,
      status: contentQuality.status,
      flags: contentQuality.flags,
      breakdown: contentQuality.breakdown,
    };

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

      eventOrchestrator.publishSafetyCheckCompletedEvent({
        correlationId: requestId,
        tenantId,
        userId,
        templateId,
        templateVersion,
        safetyOk: safety.ok,
        safetyFlags: safety.flags,
        safetyFindings: safety.findings,
        reviewStatus,
      });

      if (reviewStatus.requiresReview) {
        eventOrchestrator.publishHumanReviewRequiredEvent({
          correlationId: requestId,
          tenantId,
          userId,
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
        });
      }
    }

    const storedContent = await storageOrchestrator.storeGeneratedContent({
      tenantId,
      requestId,
      templateName,
      request: effectiveRequest,
      resolvedContext,
      content,
      quality,
      difficulty,
      safety,
      model,
      fallbackApplied,
      usage,
    });

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
      requestId,
      tenantId,
      userId,
      templateId,
      templateVersion,
      model,
      fallbackApplied,
      ...(failureCategory ? { failureCategory } : {}),
      qualityScore: quality.score,
      difficulty: difficulty.difficulty,
      safetyFlags: safety.flags,
      safetyFindings: safety.findings,
      reviewStatus,
      storedContentId: storedContent.id,
      usage: {
        ...(usage.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
        ...(usage.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
        ...(usage.latencyMs !== undefined ? { latencyMs: usage.latencyMs } : {}),
        ...(usage.estimatedCostUsd !== undefined
          ? { estimatedCostUsd: usage.estimatedCostUsd }
          : {}),
      },
    };

    eventOrchestrator.publishGenerationLifecycleEvent(lifecycleEventInput);

    eventOrchestrator.publishAnalyticsEvent({
      ...lifecycleEventInput,
      contentType: normalizedRequest.category,
    });

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
