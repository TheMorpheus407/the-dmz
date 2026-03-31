import { DEFAULT_SCORE_WEIGHTS, SCORE_CAPS } from '../../db/schema/social/index.js';

import type { ScoreWeights, LeaderboardMetrics } from '../../db/schema/social/index.js';

export { DEFAULT_SCORE_WEIGHTS, SCORE_CAPS };
export type { ScoreWeights, LeaderboardMetrics };

export function computeCompositeScore(
  metrics: LeaderboardMetrics,
  riskyApprovalRate: number = 0,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): number {
  const cappedAccuracy = Math.min(metrics.accuracy, SCORE_CAPS.accuracy);
  const cappedDecisionTime = Math.min(metrics.avgDecisionTime, SCORE_CAPS.avgDecisionTime);
  const cappedIncidents = Math.min(metrics.incidentsResolved, SCORE_CAPS.incidentsResolved);
  const cappedResourceEfficiency = Math.min(
    metrics.resourceEfficiency,
    SCORE_CAPS.resourceEfficiency,
  );
  const cappedRiskyRate = Math.min(riskyApprovalRate, SCORE_CAPS.riskyApprovalRate);

  const timeBonus =
    cappedDecisionTime > 0 ? Math.max(0, 1 - cappedDecisionTime / SCORE_CAPS.avgDecisionTime) : 1;

  const score =
    weights.accuracyWeight * cappedAccuracy +
    weights.timeWeight * timeBonus * 100 +
    weights.incidentWeight * cappedIncidents +
    weights.resourceWeight * cappedResourceEfficiency -
    weights.penaltyWeight * cappedRiskyRate;

  return Math.max(0, Math.round(score));
}
