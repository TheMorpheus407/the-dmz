import type { DecisionType, DayPhase, EmailInstance } from '@the-dmz/shared/game';
import { DAY_PHASES } from '@the-dmz/shared/game';

export interface DecisionValidationResult {
  valid: boolean;
  error?: string;
}

export interface DecisionEvaluationResult {
  isCorrect: boolean;
  riskAlignment: 'risk_averse' | 'risk_balanced' | 'risk_permissive';
  trustImpact: number;
  fundsImpact: number;
  factionImpact: number;
  threatImpact: number;
  explanation: string;
  indicatorsFound: number;
  indicatorsMissed: number;
}

export interface DecisionResolutionParams {
  email: EmailInstance;
  decision: DecisionType;
  markedIndicators: string[];
  timeSpentMs: number;
  currentPhase: DayPhase;
}

export class DecisionResolutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DecisionResolutionError';
  }
}

export const validateDecisionPhase = (phase: DayPhase): DecisionValidationResult => {
  const allowedPhases: DayPhase[] = [
    DAY_PHASES.PHASE_TRIAGE,
    DAY_PHASES.PHASE_VERIFICATION,
    DAY_PHASES.PHASE_DECISION,
  ];

  if (!allowedPhases.includes(phase)) {
    return {
      valid: false,
      error: `Decision cannot be submitted in phase ${phase}. Must be in TRIAGE, VERIFICATION, or DECISION phase.`,
    };
  }

  return { valid: true };
};

export const evaluateDecision = (params: DecisionResolutionParams): DecisionEvaluationResult => {
  const { email, decision, markedIndicators, timeSpentMs } = params;
  const groundTruth = email.groundTruth;

  const isCorrect = decision === groundTruth.correctDecision;

  const markedIndicatorSet = new Set(markedIndicators);
  const emailIndicatorTypes = new Set(email.indicators.map((i) => i.type));

  const indicatorsFound = email.indicators.filter((i) => markedIndicatorSet.has(i.type)).length;

  const indicatorsMissed = emailIndicatorTypes.size - indicatorsFound;

  const riskScore = groundTruth.riskScore;
  let riskAlignment: 'risk_averse' | 'risk_balanced' | 'risk_permissive';

  if (riskScore < 30) {
    riskAlignment = 'risk_averse';
  } else if (riskScore < 70) {
    riskAlignment = 'risk_balanced';
  } else {
    riskAlignment = 'risk_permissive';
  }

  const decisionToConsequenceKey: Record<string, string> = {
    approve: 'approved',
    deny: 'denied',
    flag: 'flagged',
    defer: 'deferred',
  };

  const consequenceKey = decisionToConsequenceKey[decision] ?? decision;
  const consequences = groundTruth.consequences[
    consequenceKey as keyof typeof groundTruth.consequences
  ] ?? {
    trustImpact: 0,
    fundsImpact: 0,
    factionImpact: 0,
    threatImpact: 0,
  };

  const speedBonus = calculateSpeedBonus(timeSpentMs, isCorrect);
  const indicatorBonus = calculateIndicatorBonus(indicatorsFound, emailIndicatorTypes.size);

  const finalTrustImpact = Math.round(consequences.trustImpact * (1 + speedBonus + indicatorBonus));
  const finalFundsImpact = Math.round(consequences.fundsImpact * (1 + speedBonus));

  const explanation = generateExplanation(
    decision,
    isCorrect,
    indicatorsFound,
    indicatorsMissed,
    email.indicators,
    markedIndicators,
  );

  return {
    isCorrect,
    riskAlignment,
    trustImpact: finalTrustImpact,
    fundsImpact: finalFundsImpact,
    factionImpact: consequences.factionImpact,
    threatImpact: consequences.threatImpact,
    explanation,
    indicatorsFound,
    indicatorsMissed,
  };
};

function calculateSpeedBonus(timeSpentMs: number, isCorrect: boolean): number {
  const minTime = 5000;
  const maxTime = 120000;

  if (timeSpentMs < minTime) {
    return isCorrect ? -0.2 : -0.4;
  }

  if (timeSpentMs > maxTime) {
    return isCorrect ? 0.1 : 0;
  }

  return 0;
}

function calculateIndicatorBonus(indicatorsFound: number, totalIndicators: number): number {
  if (totalIndicators === 0) {
    return 0;
  }

  const ratio = indicatorsFound / totalIndicators;

  if (ratio >= 0.8) {
    return 0.2;
  }
  if (ratio >= 0.5) {
    return 0.1;
  }
  if (ratio >= 0.25) {
    return 0.05;
  }

  return 0;
}

function generateExplanation(
  _decision: DecisionType,
  isCorrect: boolean,
  indicatorsFound: number,
  indicatorsMissed: number,
  allIndicators: Array<{ type: string; description: string }>,
  markedIndicators: string[],
): string {
  const foundDescriptions = allIndicators
    .filter((i) => markedIndicators.includes(i.type))
    .map((i) => i.description)
    .join(', ');

  const missedDescriptions = allIndicators
    .filter((i) => !markedIndicators.includes(i.type))
    .map((i) => i.description)
    .join(', ');

  if (isCorrect) {
    if (indicatorsFound > 0) {
      return `Correct decision. You identified ${indicatorsFound} indicator(s): ${foundDescriptions}`;
    }
    return 'Correct decision based on your assessment.';
  }

  if (indicatorsMissed > 0 && missedDescriptions) {
    return `Decision did not align with the email intent. You missed: ${missedDescriptions}`;
  }

  return `Decision did not align with the email intent.`;
}

export const resolveDecision = (params: DecisionResolutionParams): DecisionEvaluationResult => {
  const phaseValidation = validateDecisionPhase(params.currentPhase);

  if (!phaseValidation.valid) {
    throw new DecisionResolutionError(phaseValidation.error ?? 'Invalid phase', 'INVALID_PHASE');
  }

  return evaluateDecision(params);
};
