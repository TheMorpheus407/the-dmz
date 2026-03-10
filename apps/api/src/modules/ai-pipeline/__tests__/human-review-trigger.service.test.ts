import { describe, expect, it } from 'vitest';

import { evaluateHumanReviewTriggers } from '../human-review-trigger.service.js';

import type {
  ContentGenerationRequest,
  QualityScoreResult,
  SafetyFinding,
} from '../ai-pipeline.types.js';

const createMockQualityScore = (score: number): QualityScoreResult => ({
  score,
  breakdown: {
    plausibility: score,
    signalClarity: score,
    variety: score,
    pedagogicalValue: score,
    narrativeAlignment: score,
  },
});

const createMockContent = (text: string): Record<string, unknown> => ({
  body: {
    summary: text,
    justification: text,
    call_to_action: text,
  },
});

describe('human-review-trigger.service', () => {
  const baseRequest: ContentGenerationRequest = {
    category: 'email_phishing',
  };

  it('does not require review when no triggers are present', async () => {
    const quality = createMockQualityScore(0.8);
    const content = {
      body: {
        summary: 'Please check the attached document',
        justification: 'This is a normal request',
        call_to_action: 'Process this at your convenience',
      },
    };
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'template-1',
      '1.0.0',
      quality,
      findings,
      content,
      { templateVersions: new Map([['template-1', '1.0.0']]) },
    );

    expect(result.requiresReview).toBe(false);
    expect(result.triggers).toHaveLength(0);
  });

  it('triggers review for enterprise campaigns', async () => {
    const enterpriseRequest: ContentGenerationRequest = {
      ...baseRequest,
      isEnterprise: true,
    };
    const quality = createMockQualityScore(0.8);
    const content = createMockContent('Please review the attached document');
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      enterpriseRequest,
      'template-1',
      '1.0.0',
      quality,
      findings,
      content,
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('ENTERPRISE_CAMPAIGN');
  });

  it('triggers review for low confidence scores', async () => {
    const quality = createMockQualityScore(0.3);
    const content = createMockContent('Please review the attached document');
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'template-1',
      '1.0.0',
      quality,
      findings,
      content,
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('LOW_CONFIDENCE');
    expect(result.confidenceScore).toBe(0.3);
  });

  it('triggers review for new template version', async () => {
    const quality = createMockQualityScore(0.8);
    const content = createMockContent('Please review the attached document');
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'template-1',
      '2.0.0',
      quality,
      findings,
      content,
      { templateVersions: new Map([['template-1', '1.0.0']]) },
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('NEW_TEMPLATE_VERSION');
  });

  it('triggers review for first use of a template', async () => {
    const quality = createMockQualityScore(0.8);
    const content = createMockContent('Please review the attached document');
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'new-template',
      '1.0.0',
      quality,
      findings,
      content,
      { templateVersions: new Map() },
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('NEW_TEMPLATE_VERSION');
  });

  it('triggers review for edge case patterns', async () => {
    const quality = createMockQualityScore(0.8);
    const content = createMockContent('URGENT ACTION REQUIRED: Immediately verify your identity');
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'template-1',
      '1.0.0',
      quality,
      findings,
      content,
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('EDGE_CASE_PATTERN');
  });

  it('triggers review for multiple borderline patterns even without safety findings', async () => {
    const quality = createMockQualityScore(0.8);
    const content = createMockContent(
      'URGENT: Immediately transfer funds to verify your account. This is urgent attention required.',
    );
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'template-1',
      '1.0.0',
      quality,
      findings,
      content,
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('EDGE_CASE_PATTERN');
  });

  it('combines multiple triggers', async () => {
    const enterpriseRequest: ContentGenerationRequest = {
      ...baseRequest,
      isEnterprise: true,
    };
    const quality = createMockQualityScore(0.3);
    const content = createMockContent('URGENT ACTION REQUIRED: Immediately verify your identity');

    const result = await evaluateHumanReviewTriggers(
      enterpriseRequest,
      'template-1',
      '2.0.0',
      quality,
      [],
      content,
      { templateVersions: new Map([['template-1', '1.0.0']]) },
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('ENTERPRISE_CAMPAIGN');
    expect(result.triggers).toContain('LOW_CONFIDENCE');
    expect(result.triggers).toContain('NEW_TEMPLATE_VERSION');
    expect(result.triggers).toContain('EDGE_CASE_PATTERN');
  });

  it('uses custom confidence threshold', async () => {
    const quality = createMockQualityScore(0.6);
    const content = createMockContent('Please review the document');
    const findings: SafetyFinding[] = [];

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'template-1',
      '1.0.0',
      quality,
      findings,
      content,
      { confidenceThreshold: 0.7 },
    );

    expect(result.requiresReview).toBe(true);
    expect(result.triggers).toContain('LOW_CONFIDENCE');
  });

  it('includes edge case pattern descriptions when triggered', async () => {
    const quality = createMockQualityScore(0.8);
    const content = createMockContent('URGENT: Immediately verify your password reset');

    const result = await evaluateHumanReviewTriggers(
      baseRequest,
      'template-1',
      '1.0.0',
      quality,
      [],
      content,
    );

    expect(result.edgeCasePatterns).toBeDefined();
    expect(result.edgeCasePatterns?.length).toBeGreaterThan(0);
  });
});
