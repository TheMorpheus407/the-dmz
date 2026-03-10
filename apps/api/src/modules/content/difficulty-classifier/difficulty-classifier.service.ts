import {
  extractFeatures,
  type EmailFeatures,
  DIFFICULTY_TIER_NAMES,
  DIFFICULTY_TIER_DESCRIPTIONS,
} from './feature-extraction.js';
import { classifyFromFeatures, isWithinTolerance } from './rule-based-classifier.js';

export type ClassificationMethod = 'haiku' | 'rule-based' | 'manual';

export interface ClassifyEmailInput {
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface ClassifyEmailResult {
  difficulty: number;
  difficultyName: string;
  description: string;
  confidence: number;
  method: ClassificationMethod;
  features: EmailFeatures;
  scores: Record<string, number>;
  passedQualityGate: boolean;
}

export const extractEmailFeatures = (email: ClassifyEmailInput): EmailFeatures => {
  return extractFeatures({
    subject: email.subject,
    body: email.body,
    fromName: email.fromName ?? '',
    fromEmail: email.fromEmail ?? '',
    replyTo: email.replyTo ?? '',
    headers: email.headers ?? {},
  });
};

export const classifyEmailWithRuleBased = (
  features: EmailFeatures,
  requestedDifficulty?: number,
): ClassifyEmailResult => {
  const result = classifyFromFeatures(features);

  const passedQualityGate =
    requestedDifficulty !== undefined
      ? isWithinTolerance(requestedDifficulty, result.difficulty, 1)
      : true;

  return {
    difficulty: result.difficulty,
    difficultyName: DIFFICULTY_TIER_NAMES[result.difficulty] || 'UNKNOWN',
    description: DIFFICULTY_TIER_DESCRIPTIONS[result.difficulty] || '',
    confidence: result.confidence,
    method: 'rule-based',
    features,
    scores: result.scores,
    passedQualityGate,
  };
};

export const classifyDifficulty = (
  email: ClassifyEmailInput,
  requestedDifficulty?: number,
): ClassifyEmailResult => {
  const features = extractEmailFeatures(email);
  return classifyEmailWithRuleBased(features, requestedDifficulty);
};

export const isWithinQualityGate = (
  requestedDifficulty: number,
  classifiedDifficulty: number,
  tolerance: number = 1,
): boolean => {
  return isWithinTolerance(requestedDifficulty, classifiedDifficulty, tolerance);
};
