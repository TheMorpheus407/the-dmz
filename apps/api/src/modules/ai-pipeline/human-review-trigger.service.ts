import {
  EDGE_CASE_PATTERNS,
  type ContentGenerationRequest,
  type HumanReviewStatus,
  type HumanReviewTrigger,
  type QualityScoreResult,
  type SafetyFinding,
} from './ai-pipeline.types.js';

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

const detectEdgeCasePatterns = (
  content: Record<string, unknown>,
): { pattern: string; description: string }[] => {
  const text = collectText(content).join(' ');
  const detected: { pattern: string; description: string }[] = [];

  for (const { pattern, description } of EDGE_CASE_PATTERNS) {
    if (pattern.test(text)) {
      detected.push({ pattern: pattern.source, description });
    }
  }

  return detected;
};

export interface HumanReviewTriggerOptions {
  confidenceThreshold?: number;
  qualityScoreThreshold?: number;
  templateVersions?: Map<string, string>;
}

export const evaluateHumanReviewTriggers = async (
  request: ContentGenerationRequest,
  _templateId: string,
  _templateVersion: string,
  quality: QualityScoreResult,
  safetyFindings: SafetyFinding[],
  generatedContent: Record<string, unknown>,
  options: HumanReviewTriggerOptions = {},
): Promise<HumanReviewStatus> => {
  const triggers: HumanReviewTrigger[] = [];
  const confidenceThreshold = options.confidenceThreshold ?? 0.5;
  const qualityScoreThreshold = options.qualityScoreThreshold ?? 0.4;

  if (request.isEnterprise === true) {
    triggers.push('ENTERPRISE_CAMPAIGN');
  }

  const qualityConfidence = quality.score;
  if (qualityConfidence < confidenceThreshold || quality.score < qualityScoreThreshold) {
    triggers.push('LOW_CONFIDENCE');
  }

  const previousVersion = options.templateVersions?.get(_templateId);
  if (!previousVersion || previousVersion !== _templateVersion) {
    triggers.push('NEW_TEMPLATE_VERSION');
  }

  if (generatedContent) {
    const edgeCasePatterns = detectEdgeCasePatterns(generatedContent);
    if (edgeCasePatterns.length > 0) {
      triggers.push('EDGE_CASE_PATTERN');
    }

    if (safetyFindings.length === 0) {
      const text = collectText(generatedContent).join(' ');
      const borderlineFindings = [
        /urgent|immediately/gi,
        /verify\s+your\s+identity|password\s+reset/gi,
        /bank|transfer|wire/gi,
      ];
      const borderlineCount = borderlineFindings.reduce(
        (count, pattern) => count + (text.match(pattern)?.length ?? 0),
        0,
      );
      if (borderlineCount >= 2) {
        if (!triggers.includes('EDGE_CASE_PATTERN')) {
          triggers.push('EDGE_CASE_PATTERN');
        }
      }
    }
  }

  return {
    requiresReview: triggers.length > 0,
    triggers,
    confidenceScore: qualityConfidence,
    ...(triggers.includes('EDGE_CASE_PATTERN')
      ? { edgeCasePatterns: detectEdgeCasePatterns(generatedContent).map((p) => p.description) }
      : {}),
  };
};

export const createHumanReviewTriggerService = () => ({
  evaluate: evaluateHumanReviewTriggers,
});
