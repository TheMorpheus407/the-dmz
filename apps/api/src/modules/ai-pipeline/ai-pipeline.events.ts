import { createDomainEvent } from '../../shared/events/event-bus.js';

import type { GenerationFailureCategory } from './ai-pipeline.types.js';

export const AI_PIPELINE_EVENTS = {
  GENERATION_COMPLETED: 'ai.generation.completed',
  GENERATION_FAILED: 'ai.generation.failed',
  ANALYTICS_GENERATION_RECORDED: 'analytics.ai.generation.recorded',
  CONTENT_POOL_LOW: 'content.pool.low',
} as const;

type AiPipelineEventInput<T> = {
  correlationId: string;
  tenantId: string;
  userId: string;
  payload: T;
};

export interface AiGenerationLifecyclePayload {
  generationId: string;
  requestId: string;
  templateId: string;
  templateVersion: string;
  model: string;
  fallbackApplied: boolean;
  errorCategory?: GenerationFailureCategory;
  qualityScore: number;
  difficulty: number;
  storedContentId: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
}

export interface AnalyticsAiGenerationRecordedPayload {
  generationId: string;
  contentType: string;
  templateId: string;
  templateVersion: string;
  model: string;
  fallbackApplied: boolean;
  failureCategory?: GenerationFailureCategory;
  qualityScore: number;
  difficulty: number;
  safetyFlags: string[];
  storedContentId: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
}

export interface ContentPoolLowPayload {
  generationId: string;
  contentType: string;
  difficulty: number | null;
  currentSize: number;
  targetSize: number;
}

export const createAiGenerationCompletedEvent = (
  input: AiPipelineEventInput<AiGenerationLifecyclePayload>,
) =>
  createDomainEvent({
    eventType: AI_PIPELINE_EVENTS.GENERATION_COMPLETED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'ai-pipeline',
    version: 1,
    payload: input.payload,
  });

export const createAiGenerationFailedEvent = (
  input: AiPipelineEventInput<AiGenerationLifecyclePayload>,
) =>
  createDomainEvent({
    eventType: AI_PIPELINE_EVENTS.GENERATION_FAILED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'ai-pipeline',
    version: 1,
    payload: input.payload,
  });

export const createAnalyticsAiGenerationRecordedEvent = (
  input: AiPipelineEventInput<AnalyticsAiGenerationRecordedPayload>,
) =>
  createDomainEvent({
    eventType: AI_PIPELINE_EVENTS.ANALYTICS_GENERATION_RECORDED,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'ai-pipeline',
    version: 1,
    payload: input.payload,
  });

export const createContentPoolLowEvent = (input: AiPipelineEventInput<ContentPoolLowPayload>) =>
  createDomainEvent({
    eventType: AI_PIPELINE_EVENTS.CONTENT_POOL_LOW,
    correlationId: input.correlationId,
    tenantId: input.tenantId,
    userId: input.userId,
    source: 'ai-pipeline',
    version: 1,
    payload: input.payload,
  });
