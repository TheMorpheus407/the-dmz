import {
  createAiGenerationCompletedEvent,
  createAiGenerationFailedEvent,
  createAnalyticsAiGenerationRecordedEvent,
  createSafetyCheckCompletedEvent,
  createHumanReviewRequiredEvent,
} from './ai-pipeline.events.js';

import type { EventBus } from '../../shared/events/event-types.js';
import type {
  GenerationFailureCategory,
  HumanReviewStatus,
  HumanReviewTrigger,
  SafetyFinding,
} from './ai-pipeline.types.js';

export interface GenerationResultForEvents {
  requestId: string;
  tenantId: string;
  userId: string;
  templateId: string;
  templateVersion: string;
  model: string;
  fallbackApplied: boolean;
  failureCategory?: GenerationFailureCategory;
  qualityScore: number;
  difficulty: number;
  safetyFlags: string[];
  safetyFindings: SafetyFinding[];
  reviewStatus: HumanReviewStatus;
  storedContentId: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    estimatedCostUsd?: number;
  };
}

export interface SafetyCheckEventInput {
  correlationId: string;
  tenantId: string;
  userId: string;
  templateId: string;
  templateVersion: string;
  safetyOk: boolean;
  safetyFlags: string[];
  safetyFindings: SafetyFinding[];
  reviewStatus: HumanReviewStatus;
}

export interface HumanReviewEventInput {
  correlationId: string;
  tenantId: string;
  userId: string;
  templateId: string;
  templateVersion: string;
  triggers: HumanReviewTrigger[];
  safetyFindings: SafetyFinding[];
  confidenceScore?: number;
  edgeCasePatterns?: string[];
}

export interface LifecycleEventInput extends GenerationResultForEvents {
  contentType?: never;
}

export interface AnalyticsEventInput extends GenerationResultForEvents {
  contentType: string;
}

export const createSafetyCheckCompletedEventPayload = (
  input: SafetyCheckEventInput,
): Parameters<typeof createSafetyCheckCompletedEvent>[0] => ({
  correlationId: input.correlationId,
  tenantId: input.tenantId,
  userId: input.userId,
  payload: {
    generationId: input.correlationId,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    safetyOk: input.safetyOk,
    safetyFlags: input.safetyFlags,
    safetyFindings: input.safetyFindings,
    requiresHumanReview: input.reviewStatus.requiresReview,
    reviewTriggers: input.reviewStatus.triggers,
    ...(input.reviewStatus.confidenceScore !== undefined
      ? { confidenceScore: input.reviewStatus.confidenceScore }
      : {}),
    ...(input.reviewStatus.edgeCasePatterns !== undefined
      ? { edgeCasePatterns: input.reviewStatus.edgeCasePatterns }
      : {}),
  },
});

export const createHumanReviewRequiredEventPayload = (
  input: HumanReviewEventInput,
): Parameters<typeof createHumanReviewRequiredEvent>[0] => ({
  correlationId: input.correlationId,
  tenantId: input.tenantId,
  userId: input.userId,
  payload: {
    generationId: input.correlationId,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    triggers: input.triggers,
    safetyFindings: input.safetyFindings,
    ...(input.confidenceScore !== undefined ? { confidenceScore: input.confidenceScore } : {}),
    ...(input.edgeCasePatterns !== undefined ? { edgeCasePatterns: input.edgeCasePatterns } : {}),
  },
});

export const createLifecycleEventPayload = (
  input: LifecycleEventInput,
): Parameters<
  typeof createAiGenerationCompletedEvent | typeof createAiGenerationFailedEvent
>[0] => ({
  correlationId: input.requestId,
  tenantId: input.tenantId,
  userId: input.userId,
  payload: {
    generationId: input.requestId,
    requestId: input.requestId,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    model: input.model,
    fallbackApplied: input.fallbackApplied,
    qualityScore: input.qualityScore,
    difficulty: input.difficulty,
    storedContentId: input.storedContentId,
    ...(input.failureCategory ? { errorCategory: input.failureCategory } : {}),
    ...(input.usage.inputTokens !== undefined ? { inputTokens: input.usage.inputTokens } : {}),
    ...(input.usage.outputTokens !== undefined ? { outputTokens: input.usage.outputTokens } : {}),
    ...(input.usage.latencyMs !== undefined ? { latencyMs: input.usage.latencyMs } : {}),
    ...(input.usage.estimatedCostUsd !== undefined
      ? { estimatedCostUsd: input.usage.estimatedCostUsd }
      : {}),
  },
});

export const createAnalyticsEventPayload = (
  input: AnalyticsEventInput,
): Parameters<typeof createAnalyticsAiGenerationRecordedEvent>[0] => ({
  correlationId: input.requestId,
  tenantId: input.tenantId,
  userId: input.userId,
  payload: {
    generationId: input.requestId,
    contentType: input.contentType,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    model: input.model,
    fallbackApplied: input.fallbackApplied,
    qualityScore: input.qualityScore,
    difficulty: input.difficulty,
    safetyFlags: input.safetyFlags,
    safetyFindings: input.safetyFindings,
    requiresHumanReview: input.reviewStatus.requiresReview,
    reviewTriggers: input.reviewStatus.triggers,
    ...(input.reviewStatus.confidenceScore !== undefined
      ? { confidenceScore: input.reviewStatus.confidenceScore }
      : {}),
    ...(input.reviewStatus.edgeCasePatterns !== undefined
      ? { edgeCasePatterns: input.reviewStatus.edgeCasePatterns }
      : {}),
    storedContentId: input.storedContentId,
    ...(input.failureCategory ? { failureCategory: input.failureCategory } : {}),
    ...(input.usage.inputTokens !== undefined ? { inputTokens: input.usage.inputTokens } : {}),
    ...(input.usage.outputTokens !== undefined ? { outputTokens: input.usage.outputTokens } : {}),
    ...(input.usage.latencyMs !== undefined ? { latencyMs: input.usage.latencyMs } : {}),
    ...(input.usage.estimatedCostUsd !== undefined
      ? { estimatedCostUsd: input.usage.estimatedCostUsd }
      : {}),
  },
});

export const createEventPublishingOrchestrator = (eventBus: EventBus) => {
  const publishSafetyCheckCompletedEvent = (input: SafetyCheckEventInput): void => {
    eventBus.publish(
      createSafetyCheckCompletedEvent(createSafetyCheckCompletedEventPayload(input)),
    );
  };

  const publishHumanReviewRequiredEvent = (input: HumanReviewEventInput): void => {
    eventBus.publish(createHumanReviewRequiredEvent(createHumanReviewRequiredEventPayload(input)));
  };

  const publishGenerationLifecycleEvent = (input: LifecycleEventInput): void => {
    const eventPayload = createLifecycleEventPayload(input);
    eventBus.publish(
      input.fallbackApplied
        ? createAiGenerationFailedEvent(eventPayload)
        : createAiGenerationCompletedEvent(eventPayload),
    );
  };

  const publishAnalyticsEvent = (input: AnalyticsEventInput): void => {
    eventBus.publish(createAnalyticsAiGenerationRecordedEvent(createAnalyticsEventPayload(input)));
  };

  return {
    publishSafetyCheckCompletedEvent,
    publishHumanReviewRequiredEvent,
    publishGenerationLifecycleEvent,
    publishAnalyticsEvent,
  };
};

export type EventPublishingOrchestrator = ReturnType<typeof createEventPublishingOrchestrator>;
