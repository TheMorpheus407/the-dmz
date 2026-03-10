import type { EmailFeatures } from './feature-extraction.js';

export interface ClassificationResult {
  difficulty: number;
  confidence: number;
  scores: Record<string, number>;
}

interface ThresholdConfig {
  min?: number;
  max?: number;
  weight: number;
}

interface BoolThresholdConfig {
  value: boolean;
  weight: number;
}

type ThresholdTier = {
  1: ThresholdConfig;
  2: ThresholdConfig;
  3: ThresholdConfig;
  4: ThresholdConfig;
  5: ThresholdConfig;
};

type BoolThresholdTier = {
  1: BoolThresholdConfig;
  2: BoolThresholdConfig;
  3: BoolThresholdConfig;
  4: BoolThresholdConfig;
  5: BoolThresholdConfig;
};

const DEFAULT_THRESHOLDS: {
  indicatorDensity: ThresholdTier;
  impersonationQuality: ThresholdTier;
  emotionalManipulation: ThresholdTier;
  grammarComplexity: ThresholdTier;
  hasSpoofedHeaders: BoolThresholdTier;
  hasVerificationHooks: BoolThresholdTier;
} = {
  indicatorDensity: {
    1: { max: 3, weight: 2.0 },
    2: { min: 1.5, max: 3, weight: 2.0 },
    3: { min: 0.75, max: 1.5, weight: 2.0 },
    4: { min: 0.25, max: 0.75, weight: 2.0 },
    5: { min: 0, max: 0.25, weight: 2.0 },
  },
  impersonationQuality: {
    1: { max: 0.2, weight: 2.5 },
    2: { min: 0.2, max: 0.4, weight: 2.5 },
    3: { min: 0.4, max: 0.6, weight: 2.5 },
    4: { min: 0.6, max: 0.8, weight: 2.5 },
    5: { min: 0.8, max: 1.0, weight: 2.5 },
  },
  emotionalManipulation: {
    1: { max: 0.2, weight: 1.5 },
    2: { min: 0.2, max: 0.4, weight: 1.5 },
    3: { min: 0.4, max: 0.6, weight: 1.5 },
    4: { min: 0.6, max: 0.8, weight: 1.5 },
    5: { min: 0.8, max: 1.0, weight: 1.5 },
  },
  grammarComplexity: {
    1: { max: 0.3, weight: 1.0 },
    2: { min: 0.3, max: 0.5, weight: 1.0 },
    3: { min: 0.5, max: 0.7, weight: 1.0 },
    4: { min: 0.7, max: 0.85, weight: 1.0 },
    5: { min: 0.85, max: 1.0, weight: 1.0 },
  },
  hasSpoofedHeaders: {
    1: { value: false, weight: 1.5 },
    2: { value: false, weight: 1.5 },
    3: { value: false, weight: 1.5 },
    4: { value: true, weight: 1.5 },
    5: { value: true, weight: 1.5 },
  },
  hasVerificationHooks: {
    1: { value: true, weight: 1.5 },
    2: { value: true, weight: 1.5 },
    3: { value: false, weight: 1.5 },
    4: { value: false, weight: 1.5 },
    5: { value: false, weight: 1.5 },
  },
};

function calculateTierScore(
  features: EmailFeatures,
  _tier: number,
): { score: number; confidence: number } {
  const tiers = [1, 2, 3, 4, 5];
  const tierScores: number[] = [];

  const indicatorDensity = features.indicatorCount;
  const impQual = features.impersonationQuality;
  const emoManip = features.emotionalManipulationLevel;
  const gramComp = features.grammarComplexity;

  for (const t of tiers) {
    let score = 0;
    let totalWeight = 0;

    const indThresh = DEFAULT_THRESHOLDS.indicatorDensity[t as 1 | 2 | 3 | 4 | 5];
    if (indThresh) {
      const { min, max, weight } = indThresh;
      let matches = true;
      if (min !== undefined && indicatorDensity < min) matches = false;
      if (max !== undefined && indicatorDensity > max) matches = false;
      if (matches) score += weight;
      totalWeight += weight;
    }

    const impThresh = DEFAULT_THRESHOLDS.impersonationQuality[t as 1 | 2 | 3 | 4 | 5];
    if (impThresh) {
      const { min, max, weight } = impThresh;
      let matches = true;
      if (min !== undefined && impQual < min) matches = false;
      if (max !== undefined && impQual > max) matches = false;
      if (matches) score += weight;
      totalWeight += weight;
    }

    const emoThresh = DEFAULT_THRESHOLDS.emotionalManipulation[t as 1 | 2 | 3 | 4 | 5];
    if (emoThresh) {
      const { min, max, weight } = emoThresh;
      let matches = true;
      if (min !== undefined && emoManip < min) matches = false;
      if (max !== undefined && emoManip > max) matches = false;
      if (matches) score += weight;
      totalWeight += weight;
    }

    const gramThresh = DEFAULT_THRESHOLDS.grammarComplexity[t as 1 | 2 | 3 | 4 | 5];
    if (gramThresh) {
      const { min, max, weight } = gramThresh;
      let matches = true;
      if (min !== undefined && gramComp < min) matches = false;
      if (max !== undefined && gramComp > max) matches = false;
      if (matches) score += weight;
      totalWeight += weight;
    }

    const spoofThresh = DEFAULT_THRESHOLDS.hasSpoofedHeaders[t as 1 | 2 | 3 | 4 | 5];
    if (spoofThresh) {
      const { value, weight } = spoofThresh;
      if (features.hasSpoofedHeaders === value) score += weight;
      totalWeight += weight;
    }

    const verifyThresh = DEFAULT_THRESHOLDS.hasVerificationHooks[t as 1 | 2 | 3 | 4 | 5];
    if (verifyThresh) {
      const { value, weight } = verifyThresh;
      if (features.hasVerificationHooks === value) score += weight;
      totalWeight += weight;
    }

    const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;
    tierScores.push(normalizedScore);
  }

  const maxScore = Math.max(...tierScores);
  const confidence = maxScore > 0 ? maxScore : 0.5;

  return { score: maxScore, confidence };
}

export function classifyFromFeatures(features: EmailFeatures): ClassificationResult {
  const tiers = [1, 2, 3, 4, 5];
  const scores: Record<string, number> = {};

  let bestTier = 1;
  let bestScore = 0;
  let bestConfidence = 0;

  for (const tier of tiers) {
    const { score, confidence } = calculateTierScore(features, tier);
    scores[`tier_${tier}`] = Math.round(score * 100) / 100;

    if (score > bestScore) {
      bestScore = score;
      bestTier = tier;
      bestConfidence = confidence;
    }
  }

  return {
    difficulty: bestTier,
    confidence: Math.round(bestConfidence * 100) / 100,
    scores,
  };
}

export function isWithinTolerance(
  requestedDifficulty?: number,
  classifiedDifficulty?: number,
  tolerance: number = 1,
): boolean {
  if (requestedDifficulty === undefined || classifiedDifficulty === undefined) {
    return true;
  }
  return Math.abs(requestedDifficulty - classifiedDifficulty) <= tolerance;
}
