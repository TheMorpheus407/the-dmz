import { describe, expect, it } from 'vitest';

import { type AnalyticsPayload } from '@the-dmz/shared/schemas/analytics';

import {
  getPayloadField,
  getDifficultyTier,
  getThreatTier,
  getOutcome,
  getCompetencyTags,
  getTimeToDecisionMs,
  getEvidenceFlags,
  getScenarioId,
  getContentVersion,
  type DifficultyTier,
  type EventOutcome,
  type CompetencyDomain,
  type EvidenceFlag,
} from '../payload.js';

const createPayload = (overrides: Partial<AnalyticsPayload> = {}): AnalyticsPayload => ({
  difficulty_tier: undefined,
  threat_tier: undefined,
  scenario_id: undefined,
  content_version: undefined,
  competency_tags: undefined,
  outcome: undefined,
  time_to_decision_ms: undefined,
  evidence_flags: undefined,
  ...overrides,
});

describe('getPayloadField', () => {
  it('returns the value of an existing string field', () => {
    const payload = createPayload({ difficulty_tier: 'tier_1' });
    expect(getPayloadField(payload, 'difficulty_tier')).toBe('tier_1');
  });

  it('returns undefined for a missing string field', () => {
    const payload = createPayload({ difficulty_tier: undefined });
    expect(getPayloadField(payload, 'difficulty_tier')).toBeUndefined();
  });

  it('returns the value of an existing number field', () => {
    const payload = createPayload({ time_to_decision_ms: 1500 });
    expect(getPayloadField(payload, 'time_to_decision_ms')).toBe(1500);
  });

  it('returns undefined for a missing number field', () => {
    const payload = createPayload({ time_to_decision_ms: undefined });
    expect(getPayloadField(payload, 'time_to_decision_ms')).toBeUndefined();
  });

  it('returns the value of an existing array field', () => {
    const payload = createPayload({
      competency_tags: ['phishing_detection', 'password_security'],
    });
    expect(getPayloadField(payload, 'competency_tags')).toEqual([
      'phishing_detection',
      'password_security',
    ]);
  });

  it('returns undefined for a missing array field', () => {
    const payload = createPayload({ competency_tags: undefined });
    expect(getPayloadField(payload, 'competency_tags')).toBeUndefined();
  });

  it('returns undefined when payload is undefined', () => {
    expect(getPayloadField(undefined, 'difficulty_tier')).toBeUndefined();
  });

  it('returns undefined when payload is null', () => {
    expect(
      getPayloadField(null as unknown as Record<string, unknown>, 'difficulty_tier'),
    ).toBeUndefined();
  });

  it('returns proper type (not unknown) for string fields', () => {
    const payload = createPayload({ difficulty_tier: 'tier_2' });
    const result: string | undefined = getPayloadField(payload, 'difficulty_tier');
    expect(result).toBe('tier_2');
  });

  it('returns proper type (not unknown) for number fields', () => {
    const payload = createPayload({ time_to_decision_ms: 2000 });
    const result: number | undefined = getPayloadField(payload, 'time_to_decision_ms');
    expect(result).toBe(2000);
  });

  it('returns proper type (not unknown) for array fields', () => {
    const payload = createPayload({ evidence_flags: ['first_attempt'] });
    const result: string[] | undefined = getPayloadField(payload, 'evidence_flags');
    expect(result).toEqual(['first_attempt']);
  });
});

describe('getDifficultyTier', () => {
  it('returns the difficulty tier when present', () => {
    const payload = createPayload({ difficulty_tier: 'tier_3' });
    expect(getDifficultyTier(payload)).toBe('tier_3');
  });

  it('returns undefined when difficulty tier is missing', () => {
    const payload = createPayload({ difficulty_tier: undefined });
    expect(getDifficultyTier(payload)).toBeUndefined();
  });

  it('returns proper DifficultyTier type', () => {
    const payload = createPayload({ difficulty_tier: 'tier_1' });
    const result: DifficultyTier | undefined = getDifficultyTier(payload);
    expect(result).toBe('tier_1');
  });
});

describe('getThreatTier', () => {
  it('returns the threat tier when present', () => {
    const payload = createPayload({ threat_tier: 'high' });
    expect(getThreatTier(payload)).toBe('high');
  });

  it('returns undefined when threat tier is missing', () => {
    const payload = createPayload({ threat_tier: undefined });
    expect(getThreatTier(payload)).toBeUndefined();
  });
});

describe('getOutcome', () => {
  it('returns the outcome when present', () => {
    const payload = createPayload({ outcome: 'correct' });
    expect(getOutcome(payload)).toBe('correct');
  });

  it('returns undefined when outcome is missing', () => {
    const payload = createPayload({ outcome: undefined });
    expect(getOutcome(payload)).toBeUndefined();
  });

  it('returns proper EventOutcome type', () => {
    const payload = createPayload({ outcome: 'partial' });
    const result: EventOutcome | undefined = getOutcome(payload);
    expect(result).toBe('partial');
  });
});

describe('getCompetencyTags', () => {
  it('returns competency tags when present', () => {
    const payload = createPayload({
      competency_tags: ['phishing_detection', 'data_handling'],
    });
    expect(getCompetencyTags(payload)).toEqual(['phishing_detection', 'data_handling']);
  });

  it('returns undefined when competency tags is missing', () => {
    const payload = createPayload({ competency_tags: undefined });
    expect(getCompetencyTags(payload)).toBeUndefined();
  });

  it('returns proper CompetencyDomain array type', () => {
    const payload = createPayload({ competency_tags: ['incident_response'] });
    const result: CompetencyDomain[] | undefined = getCompetencyTags(payload);
    expect(result).toEqual(['incident_response']);
  });
});

describe('getTimeToDecisionMs', () => {
  it('returns time to decision when present', () => {
    const payload = createPayload({ time_to_decision_ms: 3500 });
    expect(getTimeToDecisionMs(payload)).toBe(3500);
  });

  it('returns undefined when time to decision is missing', () => {
    const payload = createPayload({ time_to_decision_ms: undefined });
    expect(getTimeToDecisionMs(payload)).toBeUndefined();
  });
});

describe('getEvidenceFlags', () => {
  it('returns evidence flags when present', () => {
    const payload = createPayload({
      evidence_flags: ['first_attempt', 'adaptive_difficulty'],
    });
    expect(getEvidenceFlags(payload)).toEqual(['first_attempt', 'adaptive_difficulty']);
  });

  it('returns undefined when evidence flags is missing', () => {
    const payload = createPayload({ evidence_flags: undefined });
    expect(getEvidenceFlags(payload)).toBeUndefined();
  });

  it('returns proper EvidenceFlag array type', () => {
    const payload = createPayload({ evidence_flags: ['threat_weighted'] });
    const result: EvidenceFlag[] | undefined = getEvidenceFlags(payload);
    expect(result).toEqual(['threat_weighted']);
  });
});

describe('getScenarioId', () => {
  it('returns scenario id when present', () => {
    const payload = createPayload({ scenario_id: 'scenario-123' });
    expect(getScenarioId(payload)).toBe('scenario-123');
  });

  it('returns undefined when scenario id is missing', () => {
    const payload = createPayload({ scenario_id: undefined });
    expect(getScenarioId(payload)).toBeUndefined();
  });
});

describe('getContentVersion', () => {
  it('returns content version when present', () => {
    const payload = createPayload({ content_version: '1.2.3' });
    expect(getContentVersion(payload)).toBe('1.2.3');
  });

  it('returns undefined when content version is missing', () => {
    const payload = createPayload({ content_version: undefined });
    expect(getContentVersion(payload)).toBeUndefined();
  });
});

describe('type safety', () => {
  it('eliminates need for manual type casting', () => {
    const payload = createPayload({
      difficulty_tier: 'tier_2',
      outcome: 'correct',
      time_to_decision_ms: 1000,
      competency_tags: ['phishing_detection'],
    });

    const difficultyTier = getDifficultyTier(payload);
    const outcome = getOutcome(payload);
    const timeToDecisionMs = getTimeToDecisionMs(payload);
    const competencyTags = getCompetencyTags(payload);

    expect(typeof difficultyTier === 'string' || difficultyTier === undefined).toBe(true);
    expect(typeof outcome === 'string' || outcome === undefined).toBe(true);
    expect(typeof timeToDecisionMs === 'number' || timeToDecisionMs === undefined).toBe(true);
    expect(Array.isArray(competencyTags) || competencyTags === undefined).toBe(true);
  });

  it('can be used directly in conditional logic without casting', () => {
    const payload = createPayload({ outcome: 'correct' });

    if (getOutcome(payload) === 'correct') {
      expect(getOutcome(payload)).toBe('correct');
    }
  });

  it('can be used directly in array operations without casting', () => {
    const payload = createPayload({
      competency_tags: ['phishing_detection', 'password_security'],
    });

    const tags = getCompetencyTags(payload);
    const uppercased = tags?.map((tag) => tag.toUpperCase());
    expect(uppercased).toEqual(['PHISHING_DETECTION', 'PASSWORD_SECURITY']);
  });
});

describe('edge cases', () => {
  it('handles empty payload object', () => {
    const payload = createPayload({});
    expect(getDifficultyTier(payload)).toBeUndefined();
    expect(getOutcome(payload)).toBeUndefined();
    expect(getTimeToDecisionMs(payload)).toBeUndefined();
    expect(getCompetencyTags(payload)).toBeUndefined();
  });

  it('handles payload with all fields undefined', () => {
    const payload = createPayload({
      difficulty_tier: undefined,
      threat_tier: undefined,
      scenario_id: undefined,
      content_version: undefined,
      competency_tags: undefined,
      outcome: undefined,
      time_to_decision_ms: undefined,
      evidence_flags: undefined,
    });
    expect(getDifficultyTier(payload)).toBeUndefined();
    expect(getThreatTier(payload)).toBeUndefined();
    expect(getScenarioId(payload)).toBeUndefined();
    expect(getContentVersion(payload)).toBeUndefined();
    expect(getOutcome(payload)).toBeUndefined();
    expect(getTimeToDecisionMs(payload)).toBeUndefined();
    expect(getCompetencyTags(payload)).toBeUndefined();
    expect(getEvidenceFlags(payload)).toBeUndefined();
  });

  it('handles zero value for time_to_decision_ms', () => {
    const payload = createPayload({ time_to_decision_ms: 0 });
    expect(getTimeToDecisionMs(payload)).toBe(0);
  });

  it('handles empty array for competency_tags', () => {
    const payload = createPayload({ competency_tags: [] });
    expect(getCompetencyTags(payload)).toEqual([]);
  });

  it('handles empty array for evidence_flags', () => {
    const payload = createPayload({ evidence_flags: [] });
    expect(getEvidenceFlags(payload)).toEqual([]);
  });
});
