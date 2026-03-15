import { describe, expect, it } from 'vitest';

import {
  COMPETENCY_DOMAINS,
  DIFFICULTY_TIERS,
  EVENT_OUTCOMES,
  EVIDENCE_FLAGS,
  deviceInfoSchema,
  geoInfoSchema,
  analyticsPayloadSchema,
  eventEnvelopeSchema,
  validateEventEnvelope,
  parseCompetencyDomain,
  parseDifficultyTier,
  parseEventOutcome,
  isValidEventVersion,
  getLatestEventVersion,
  isBackwardCompatibleEvent,
} from './analytics.schema.js';

describe('COMPETENCY_DOMAINS', () => {
  it('contains all 7 competency domains', () => {
    expect(COMPETENCY_DOMAINS).toHaveLength(7);
    expect(COMPETENCY_DOMAINS).toContain('phishing_detection');
    expect(COMPETENCY_DOMAINS).toContain('password_security');
    expect(COMPETENCY_DOMAINS).toContain('data_handling');
    expect(COMPETENCY_DOMAINS).toContain('social_engineering_resistance');
    expect(COMPETENCY_DOMAINS).toContain('incident_response');
    expect(COMPETENCY_DOMAINS).toContain('physical_security');
    expect(COMPETENCY_DOMAINS).toContain('compliance_awareness');
  });
});

describe('DIFFICULTY_TIERS', () => {
  it('contains 5 difficulty tiers', () => {
    expect(DIFFICULTY_TIERS).toHaveLength(5);
    expect(DIFFICULTY_TIERS).toContain('tier_1');
    expect(DIFFICULTY_TIERS).toContain('tier_5');
  });
});

describe('EVENT_OUTCOMES', () => {
  it('contains all event outcomes', () => {
    expect(EVENT_OUTCOMES).toContain('correct');
    expect(EVENT_OUTCOMES).toContain('partial');
    expect(EVENT_OUTCOMES).toContain('incorrect');
    expect(EVENT_OUTCOMES).toContain('neutral');
  });
});

describe('EVIDENCE_FLAGS', () => {
  it('contains all evidence flags', () => {
    expect(EVIDENCE_FLAGS).toContain('difficulty_weighted');
    expect(EVIDENCE_FLAGS).toContain('threat_weighted');
    expect(EVIDENCE_FLAGS).toContain('time_sensitive');
  });
});

describe('deviceInfoSchema', () => {
  it('parses valid device info', () => {
    const valid = { device_type: 'desktop', os: 'Windows', browser: 'Chrome' };
    expect(deviceInfoSchema.parse(valid)).toEqual(valid);
  });

  it('allows optional fields', () => {
    const empty = {};
    expect(deviceInfoSchema.parse(empty)).toEqual({});
  });

  it('rejects unknown fields', () => {
    expect(() => deviceInfoSchema.parse({ unknown: true })).toThrow();
  });
});

describe('geoInfoSchema', () => {
  it('parses valid geo info', () => {
    const valid = { country: 'US', region: 'CA', city: 'San Francisco' };
    expect(geoInfoSchema.parse(valid)).toEqual(valid);
  });

  it('allows optional fields', () => {
    const empty = {};
    expect(geoInfoSchema.parse(empty)).toEqual({});
  });

  it('rejects unknown fields', () => {
    expect(() => geoInfoSchema.parse({ unknown: true })).toThrow();
  });
});

describe('analyticsPayloadSchema', () => {
  it('parses full analytics payload', () => {
    const payload = {
      difficulty_tier: 'tier_3' as const,
      threat_tier: 'ELEVATED',
      scenario_id: 'scenario-123',
      content_version: '1.0.0',
      competency_tags: ['phishing_detection', 'social_engineering_resistance'],
      outcome: 'correct' as const,
      time_to_decision_ms: 5000,
      evidence_flags: ['difficulty_weighted', 'threat_weighted'],
    };
    expect(analyticsPayloadSchema.parse(payload)).toEqual(payload);
  });

  it('allows empty payload', () => {
    expect(analyticsPayloadSchema.parse({})).toEqual({});
  });

  it('rejects invalid competency tags', () => {
    const payload = { competency_tags: ['invalid_domain'] };
    expect(() => analyticsPayloadSchema.parse(payload)).toThrow();
  });

  it('rejects invalid outcome', () => {
    const payload = { outcome: 'invalid_outcome' };
    expect(() => analyticsPayloadSchema.parse(payload)).toThrow();
  });

  it('rejects negative time_to_decision_ms', () => {
    const payload = { time_to_decision_ms: -1 };
    expect(() => analyticsPayloadSchema.parse(payload)).toThrow();
  });

  it('rejects non-integer time_to_decision_ms', () => {
    const payload = { time_to_decision_ms: 5.5 };
    expect(() => analyticsPayloadSchema.parse(payload)).toThrow();
  });
});

describe('eventEnvelopeSchema', () => {
  it('parses valid event envelope', () => {
    const envelope = {
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      event_name: 'game.session.started',
      event_version: 1,
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      session_id: '550e8400-e29b-41d4-a716-446655440003',
      correlation_id: '550e8400-e29b-41d4-a716-446655440004',
      timestamp: '2026-01-15T10:30:00.000Z',
      source: 'game-engine',
      environment: 'production',
      device_info: { device_type: 'desktop' },
      geo_info: { country: 'US' },
      payload: {
        difficulty_tier: 'tier_1' as const,
        competency_tags: ['phishing_detection'],
        outcome: 'correct' as const,
      },
    };
    expect(eventEnvelopeSchema.parse(envelope)).toEqual(envelope);
  });

  it('allows minimal envelope', () => {
    const minimal = {
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      event_name: 'game.session.started',
      event_version: 1,
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      session_id: '550e8400-e29b-41d4-a716-446655440003',
      correlation_id: '550e8400-e29b-41d4-a716-446655440004',
      timestamp: '2026-01-15T10:30:00.000Z',
      source: 'game-engine',
    };
    expect(eventEnvelopeSchema.parse(minimal)).toEqual(minimal);
  });

  it('rejects invalid UUIDs', () => {
    const invalid = {
      event_id: 'not-a-uuid',
      event_name: 'game.session.started',
      event_version: 1,
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      session_id: '550e8400-e29b-41d4-a716-446655440003',
      correlation_id: '550e8400-e29b-41d4-a716-446655440004',
      timestamp: '2026-01-15T10:30:00.000Z',
      source: 'game-engine',
    };
    expect(() => eventEnvelopeSchema.parse(invalid)).toThrow();
  });

  it('rejects negative version', () => {
    const invalid = {
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      event_name: 'game.session.started',
      event_version: -1,
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      session_id: '550e8400-e29b-41d4-a716-446655440003',
      correlation_id: '550e8400-e29b-41d4-a716-446655440004',
      timestamp: '2026-01-15T10:30:00.000Z',
      source: 'game-engine',
    };
    expect(() => eventEnvelopeSchema.parse(invalid)).toThrow();
  });
});

describe('validateEventEnvelope', () => {
  it('returns valid for correct envelope', () => {
    const envelope = {
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      event_name: 'game.session.started',
      event_version: 1,
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      session_id: '550e8400-e29b-41d4-a716-446655440003',
      correlation_id: '550e8400-e29b-41d4-a716-446655440004',
      timestamp: '2026-01-15T10:30:00.000Z',
      source: 'game-engine',
    };
    const result = validateEventEnvelope(envelope);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for invalid envelope', () => {
    const invalid = {
      event_id: 'not-a-uuid',
      event_name: 'game.session.started',
      event_version: 1,
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: '550e8400-e29b-41d4-a716-446655440002',
      session_id: '550e8400-e29b-41d4-a716-446655440003',
      correlation_id: '550e8400-e29b-41d4-a716-446655440004',
      timestamp: '2026-01-15T10:30:00.000Z',
      source: 'game-engine',
    };
    const result = validateEventEnvelope(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('parseCompetencyDomain', () => {
  it('returns domain for valid input', () => {
    expect(parseCompetencyDomain('phishing_detection')).toBe('phishing_detection');
    expect(parseCompetencyDomain('incident_response')).toBe('incident_response');
  });

  it('returns null for invalid input', () => {
    expect(parseCompetencyDomain('invalid')).toBeNull();
    expect(parseCompetencyDomain(123)).toBeNull();
    expect(parseCompetencyDomain(null)).toBeNull();
  });
});

describe('parseDifficultyTier', () => {
  it('returns tier for valid input', () => {
    expect(parseDifficultyTier('tier_1')).toBe('tier_1');
    expect(parseDifficultyTier('tier_5')).toBe('tier_5');
  });

  it('returns null for invalid input', () => {
    expect(parseDifficultyTier('tier_6')).toBeNull();
    expect(parseDifficultyTier('easy')).toBeNull();
  });
});

describe('parseEventOutcome', () => {
  it('returns outcome for valid input', () => {
    expect(parseEventOutcome('correct')).toBe('correct');
    expect(parseEventOutcome('incorrect')).toBe('incorrect');
  });

  it('returns null for invalid input', () => {
    expect(parseEventOutcome('right')).toBeNull();
    expect(parseEventOutcome(1)).toBeNull();
  });
});

describe('isValidEventVersion', () => {
  it('returns true for valid versions', () => {
    expect(isValidEventVersion(1)).toBe(true);
    expect(isValidEventVersion(100)).toBe(true);
    expect(isValidEventVersion(999)).toBe(true);
  });

  it('returns false for invalid versions', () => {
    expect(isValidEventVersion(0)).toBe(false);
    expect(isValidEventVersion(-1)).toBe(false);
    expect(isValidEventVersion(1000)).toBe(false);
  });
});

describe('getLatestEventVersion', () => {
  it('returns current version', () => {
    expect(getLatestEventVersion()).toBe(1);
  });
});

describe('isBackwardCompatibleEvent', () => {
  it('returns true for known events at valid versions', () => {
    expect(isBackwardCompatibleEvent('game.session.started', 1)).toBe(true);
    expect(isBackwardCompatibleEvent('game.email.opened', 1)).toBe(true);
    expect(isBackwardCompatibleEvent('game.decision.approved', 1)).toBe(true);
  });

  it('returns false for unknown events', () => {
    expect(isBackwardCompatibleEvent('unknown.event', 1)).toBe(false);
  });

  it('returns false for invalid versions', () => {
    expect(isBackwardCompatibleEvent('game.session.started', 999)).toBe(false);
  });
});
