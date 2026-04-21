// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  COMPETENCY_DOMAINS,
  type CompetencyDomain,
  type DifficultyTier,
  type EventOutcome,
  type EvidenceFlag,
} from '@the-dmz/shared/schemas';

export type { DifficultyTier, EventOutcome, CompetencyDomain, EvidenceFlag };

export function getPayloadField(
  payload: Record<string, unknown> | undefined,
  field: string,
): unknown {
  if (payload == null) {
    return undefined;
  }
  return payload[field];
}

export function getDifficultyTier(
  payload: Record<string, unknown> | undefined,
): DifficultyTier | undefined {
  const value = payload?.['difficulty_tier'];
  if (value == null) {
    return undefined;
  }
  return value as DifficultyTier;
}

export function getThreatTier(payload: Record<string, unknown> | undefined): string | undefined {
  const value = payload?.['threat_tier'];
  if (value == null) {
    return undefined;
  }
  return value as string;
}

export function getOutcome(payload: Record<string, unknown> | undefined): EventOutcome | undefined {
  const value = payload?.['outcome'];
  if (value == null) {
    return undefined;
  }
  return value as EventOutcome;
}

export function getCompetencyTags(
  payload: Record<string, unknown> | undefined,
): CompetencyDomain[] | undefined {
  const value = payload?.['competency_tags'];
  if (value == null) {
    return undefined;
  }
  const tags = value as (typeof COMPETENCY_DOMAINS)[number][];
  if (!Array.isArray(tags)) {
    return undefined;
  }
  return tags;
}

export function getTimeToDecisionMs(
  payload: Record<string, unknown> | undefined,
): number | undefined {
  const value = payload?.['time_to_decision_ms'];
  if (value == null) {
    return undefined;
  }
  return value as number;
}

export function getEvidenceFlags(
  payload: Record<string, unknown> | undefined,
): EvidenceFlag[] | undefined {
  const value = payload?.['evidence_flags'];
  if (value == null) {
    return undefined;
  }
  return value as EvidenceFlag[];
}

export function getScenarioId(payload: Record<string, unknown> | undefined): string | undefined {
  const value = payload?.['scenario_id'];
  if (value == null) {
    return undefined;
  }
  return value as string;
}

export function getContentVersion(
  payload: Record<string, unknown> | undefined,
): string | undefined {
  const value = payload?.['content_version'];
  if (value == null) {
    return undefined;
  }
  return value as string;
}
