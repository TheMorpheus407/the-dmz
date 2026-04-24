import { describe, expect, it, vi } from 'vitest';

import {
  createEventPublishingOrchestrator,
  createSafetyCheckCompletedEventPayload,
  createHumanReviewRequiredEventPayload,
  createLifecycleEventPayload,
  createAnalyticsEventPayload,
} from '../event-publishing-orchestrator.js';

import type { EventBus } from '../../../shared/events/event-types.js';
import type {
  GenerationFailureCategory,
  HumanReviewTrigger,
  SafetyFinding,
} from '../ai-pipeline.types.js';

describe('event-publishing-orchestrator', () => {
  describe('payload creation functions', () => {
    const baseInput = {
      correlationId: 'test-correlation-id',
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
      templateId: 'test-template-id',
      templateVersion: '1.0.0',
    };

    describe('createSafetyCheckCompletedEventPayload', () => {
      it('creates safety check event payload', () => {
        const input = {
          ...baseInput,
          safetyOk: true,
          safetyFlags: [] as string[],
          safetyFindings: [] as SafetyFinding[],
          reviewStatus: {
            requiresReview: false,
            triggers: [] as HumanReviewTrigger[],
          },
        };

        const result = createSafetyCheckCompletedEventPayload(input);

        expect(result.correlationId).toBe('test-correlation-id');
        expect(result.tenantId).toBe('test-tenant-id');
        expect(result.payload.generationId).toBe('test-correlation-id');
        expect(result.payload.templateId).toBe('test-template-id');
        expect(result.payload.safetyOk).toBe(true);
        expect(result.payload.requiresHumanReview).toBe(false);
      });

      it('includes optional review status fields when present', () => {
        const input = {
          ...baseInput,
          safetyOk: true,
          safetyFlags: [] as string[],
          safetyFindings: [] as SafetyFinding[],
          reviewStatus: {
            requiresReview: true,
            triggers: ['LOW_CONFIDENCE'] as HumanReviewTrigger[],
            confidenceScore: 0.3,
            edgeCasePatterns: ['pattern1'],
          },
        };

        const result = createSafetyCheckCompletedEventPayload(input);

        expect(result.payload.requiresHumanReview).toBe(true);
        expect(result.payload.confidenceScore).toBe(0.3);
        expect(result.payload.edgeCasePatterns).toEqual(['pattern1']);
      });
    });

    describe('createHumanReviewRequiredEventPayload', () => {
      it('creates human review event payload', () => {
        const input = {
          ...baseInput,
          triggers: ['LOW_CONFIDENCE'] as HumanReviewTrigger[],
          safetyFindings: [] as SafetyFinding[],
        };

        const result = createHumanReviewRequiredEventPayload(input);

        expect(result.correlationId).toBe('test-correlation-id');
        expect(result.payload.generationId).toBe('test-correlation-id');
        expect(result.payload.triggers).toHaveLength(1);
        expect(result.payload.triggers[0]).toBe('LOW_CONFIDENCE');
      });

      it('includes optional fields when present', () => {
        const input = {
          ...baseInput,
          triggers: ['LOW_CONFIDENCE'] as HumanReviewTrigger[],
          safetyFindings: [{ code: 'test_code', message: 'test message' }] as SafetyFinding[],
          confidenceScore: 0.25,
          edgeCasePatterns: ['edge_case_1'],
        };

        const result = createHumanReviewRequiredEventPayload(input);

        expect(result.payload.confidenceScore).toBe(0.25);
        expect(result.payload.edgeCasePatterns).toEqual(['edge_case_1']);
      });
    });

    describe('createLifecycleEventPayload', () => {
      it('creates lifecycle event payload for successful generation', () => {
        const input = {
          requestId: 'test-request-id',
          tenantId: 'test-tenant-id',
          userId: 'test-user-id',
          templateId: 'test-template-id',
          templateVersion: '1.0.0',
          model: 'claude-3-5-sonnet',
          fallbackApplied: false,
          qualityScore: 0.85,
          difficulty: 4,
          safetyFlags: [] as string[],
          safetyFindings: [] as SafetyFinding[],
          reviewStatus: { requiresReview: false, triggers: [] as HumanReviewTrigger[] },
          storedContentId: 'stored-content-id',
          usage: {
            inputTokens: 100,
            outputTokens: 200,
            latencyMs: 500,
            estimatedCostUsd: 0.01,
          },
        };

        const result = createLifecycleEventPayload(input);

        expect(result.correlationId).toBe('test-request-id');
        expect(result.payload.generationId).toBe('test-request-id');
        expect(result.payload.qualityScore).toBe(0.85);
        expect(result.payload.difficulty).toBe(4);
        expect(result.payload.inputTokens).toBe(100);
        expect(result.payload.outputTokens).toBe(200);
      });

      it('includes failure category when generation failed', () => {
        const input = {
          requestId: 'test-request-id',
          tenantId: 'test-tenant-id',
          userId: 'test-user-id',
          templateId: 'test-template-id',
          templateVersion: '1.0.0',
          model: 'handcrafted-fallback',
          fallbackApplied: true,
          failureCategory: 'invalid_output' as GenerationFailureCategory,
          qualityScore: 0.0,
          difficulty: 4,
          safetyFlags: [] as string[],
          safetyFindings: [] as SafetyFinding[],
          reviewStatus: { requiresReview: false, triggers: [] as HumanReviewTrigger[] },
          storedContentId: 'stored-content-id',
          usage: {},
        };

        const result = createLifecycleEventPayload(input);

        expect(result.payload.fallbackApplied).toBe(true);
        expect(result.payload.errorCategory).toBe('invalid_output');
      });
    });

    describe('createAnalyticsEventPayload', () => {
      it('creates analytics event payload with content type', () => {
        const input = {
          requestId: 'test-request-id',
          tenantId: 'test-tenant-id',
          userId: 'test-user-id',
          templateId: 'test-template-id',
          templateVersion: '1.0.0',
          model: 'claude-3-5-sonnet',
          fallbackApplied: false,
          qualityScore: 0.85,
          difficulty: 4,
          safetyFlags: ['flag1'],
          safetyFindings: [] as SafetyFinding[],
          reviewStatus: { requiresReview: false, triggers: [] as HumanReviewTrigger[] },
          storedContentId: 'stored-content-id',
          contentType: 'email_phishing',
          usage: {},
        };

        const result = createAnalyticsEventPayload(input);

        expect(result.payload.contentType).toBe('email_phishing');
        expect(result.payload.safetyFlags).toEqual(['flag1']);
        expect(result.payload.requiresHumanReview).toBe(false);
      });
    });
  });

  describe('createEventPublishingOrchestrator', () => {
    const createMockEventBus = (): EventBus => ({
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    it('publishes safety check completed event', () => {
      const eventBus = createMockEventBus();
      const orchestrator = createEventPublishingOrchestrator(eventBus);

      orchestrator.publishSafetyCheckCompletedEvent({
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        templateId: 'test-template-id',
        templateVersion: '1.0.0',
        safetyOk: true,
        safetyFlags: [],
        safetyFindings: [],
        reviewStatus: { requiresReview: false, triggers: [] },
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('publishes human review required event', () => {
      const eventBus = createMockEventBus();
      const orchestrator = createEventPublishingOrchestrator(eventBus);

      orchestrator.publishHumanReviewRequiredEvent({
        correlationId: 'test-correlation-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        templateId: 'test-template-id',
        templateVersion: '1.0.0',
        triggers: ['LOW_CONFIDENCE'],
        safetyFindings: [],
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('publishes generation completed event when fallback not applied', () => {
      const eventBus = createMockEventBus();
      const orchestrator = createEventPublishingOrchestrator(eventBus);

      orchestrator.publishGenerationLifecycleEvent({
        requestId: 'test-request-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        templateId: 'test-template-id',
        templateVersion: '1.0.0',
        model: 'claude-3-5-sonnet',
        fallbackApplied: false,
        qualityScore: 0.85,
        difficulty: 4,
        safetyFlags: [],
        safetyFindings: [],
        reviewStatus: { requiresReview: false, triggers: [] },
        storedContentId: 'stored-content-id',
        usage: {},
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('publishes generation failed event when fallback applied', () => {
      const eventBus = createMockEventBus();
      const orchestrator = createEventPublishingOrchestrator(eventBus);

      orchestrator.publishGenerationLifecycleEvent({
        requestId: 'test-request-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        templateId: 'test-template-id',
        templateVersion: '1.0.0',
        model: 'handcrafted-fallback',
        fallbackApplied: true,
        failureCategory: 'invalid_output',
        qualityScore: 0.0,
        difficulty: 4,
        safetyFlags: [],
        safetyFindings: [],
        reviewStatus: { requiresReview: false, triggers: [] },
        storedContentId: 'stored-content-id',
        usage: {},
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('publishes analytics event', () => {
      const eventBus = createMockEventBus();
      const orchestrator = createEventPublishingOrchestrator(eventBus);

      orchestrator.publishAnalyticsEvent({
        requestId: 'test-request-id',
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        templateId: 'test-template-id',
        templateVersion: '1.0.0',
        model: 'claude-3-5-sonnet',
        fallbackApplied: false,
        qualityScore: 0.85,
        difficulty: 4,
        safetyFlags: [],
        safetyFindings: [],
        reviewStatus: { requiresReview: false, triggers: [] },
        storedContentId: 'stored-content-id',
        contentType: 'email_phishing',
        usage: {},
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });
});
