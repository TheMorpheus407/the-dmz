import type { BacklogState } from './types.js';

export function calculateBacklogPressure(
  unresolvedCount: number,
  previousPenalty: number = 0,
): BacklogState {
  const threshold = 3;
  const incidentThreshold = 10;

  const penalty = unresolvedCount > threshold ? -(unresolvedCount - threshold) : 0;

  const accumulatedPenalty = previousPenalty + penalty;

  const shouldCreateIncident = unresolvedCount >= incidentThreshold;

  return {
    totalUnresolved: unresolvedCount,
    accumulatedPenalty,
    shouldCreateIncident,
  };
}

export function calculateBacklogTrustPenalty(unresolvedCount: number): number {
  const threshold = 3;

  if (unresolvedCount <= threshold) {
    return 0;
  }

  return -(unresolvedCount - threshold);
}

export function shouldTriggerBacklogIncident(unresolvedCount: number): boolean {
  return unresolvedCount >= 10;
}

export function resolveBacklogPenalty(resolvedCount: number, previousPenalty: number): number {
  const penaltyReduction = Math.min(resolvedCount, Math.abs(previousPenalty));

  if (previousPenalty < 0) {
    return previousPenalty + penaltyReduction;
  }

  return previousPenalty;
}

export function calculateBacklogTrustImpact(backlogState: BacklogState): number {
  return backlogState.accumulatedPenalty;
}

export function getBacklogSeverity(unresolvedCount: number): 'normal' | 'elevated' | 'critical' {
  if (unresolvedCount < 5) return 'normal';
  if (unresolvedCount < 10) return 'elevated';
  return 'critical';
}
