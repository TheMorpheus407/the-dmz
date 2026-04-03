import { sql } from 'drizzle-orm';

import { getDatabaseClient, type DB } from '../../shared/database/connection.js';
import { generateId as defaultGenerateId } from '../../shared/utils/id.js';
import { scoreEmail as scoreContentQuality } from '../content/index.js';

import * as aiPipelineRepo from './ai-pipeline.repo.js';
import { createClaudeClient, resolveAnthropicModel } from './claude-client.service.js';
import { classifyDifficulty } from './difficulty-classifier.service.js';
import {
  assertCategoryOutputSchema,
  getDefaultOutputSchema,
  parseStructuredOutput,
} from './output-parser.service.js';
import { buildPrompt } from './prompt-engine.service.js';
import { scoreGeneratedContent } from './quality-scorer.service.js';
import { validateGeneratedContentSafety } from './safety-validator.service.js';
import { evaluateHumanReviewTriggers } from './human-review-trigger.service.js';
import { hasConfiguredOutputSchema, isRecord } from './prompt-template-validator.js';
import {
  pickFirstString,
  pickFirstNumber,
  readContextValue,
  readString,
  resolveRequestContext,
  applyResolvedRequestContext,
  buildGenerationContext,
  assertSafeRequestedStorageMetadata,
  emptyTemplateContext,
} from './request-context.js';
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
import { createContentPoolLowEvent } from './ai-pipeline.events.js';

import type {
  CreateAiPipelineServiceOptions,
  PromptTemplateRepository,
  AiPipelineLogger,
  ContentGateway,
  ContentGenerationRequest,
  GeneratedContentResult,
  HumanReviewStatus,
  UsageMetrics,
} from './ai-pipeline.types.js';

const DEFAULT_EMAIL_POOL_LOW_THRESHOLD = 20;

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

interface AiPipelineOrchestratorDependencies {
  logger: AiPipelineLogger;
  promptRepository: PromptTemplateRepository;
  contentGateway: ContentGateway;
  generateId: () => string;
  emailPoolLowThreshold: number;
}

interface CreateAiPipelineOrchestratorOptions {
  config: CreateAiPipelineServiceOptions['config'];
  eventBus: CreateAiPipelineServiceOptions['eventBus'];
  logger?: AiPipelineLogger;
  promptTemplateRepository: PromptTemplateRepository;
  contentGateway?: ContentGateway;
  claudeClient?: ReturnType<typeof createClaudeClient>;
  generateId?: () => string;
  emailPoolLowThreshold?: number;
}

export const createAiPipelineOrchestrator = (
  options: CreateAiPipelineOrchestratorOptions,
): {
  generateContent: (
    tenantId: string,
    userId: string,
    request: ContentGenerationRequest,
  ) => Promise<GeneratedContentResult>;
  getDependencies: () => AiPipelineOrchestratorDependencies;
} => {
  const logger = options.logger ?? {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
  const contentGateway = options.contentGateway ?? {
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
  };
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
    const normalizedRequest: ContentGenerationRequest =
      request.category === 'email_legitimate'
        ? ((({ attackType: _attackType, ...rest }) => rest)(request) as ContentGenerationRequest)
        : request;
    const normalizedContext = normalizedRequest.context;
    let resolvedContext = resolveRequestContext(normalizedRequest, emptyTemplateContext);
    assertSafeRequestedStorageMetadata(normalizedRequest, resolvedContext);
    const requestId = generateId();
    const requestedAttackType = pickFirstString(
      normalizedRequest.attackType,
      readContextValue(normalizedContext, 'attackType'),
      readContextValue(normalizedContext, 'attack_type'),
    );
    const requestedThreatLevel = pickFirstString(
      normalizedRequest.threatLevel,
      readContextValue(normalizedContext, 'threatLevel'),
      readContextValue(normalizedContext, 'threat_level'),
    );
    const requestedDifficulty = pickFirstNumber(
      normalizedRequest.difficulty,
      readContextValue(normalizedContext, 'difficulty'),
    );
    const requestedSeason = pickFirstNumber(
      normalizedRequest.season,
      readContextValue(normalizedContext, 'season'),
    );
    const requestedChapter = pickFirstNumber(
      normalizedRequest.chapter,
      readContextValue(normalizedContext, 'chapter'),
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
      const template = await options.promptTemplateRepository.getActiveForGeneration(
        tenantId,
        templateSelector,
      );

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
          await options.promptTemplateRepository.recordGenerationLog({
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
    await options.promptTemplateRepository.recordGenerationLog({
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
    generateContent,
    getDependencies: () => ({
      logger,
      promptRepository: options.promptTemplateRepository,
      contentGateway,
      generateId,
      emailPoolLowThreshold,
    }),
  };
};

export const createDefaultPromptRepository = (
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
