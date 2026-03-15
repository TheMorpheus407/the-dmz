import { z } from 'zod';

import { COMPETENCY_DOMAINS, type CompetencyDomain } from '../constants/competency.js';

export { COMPETENCY_DOMAINS, type CompetencyDomain };

export const DIFFICULTY_TIERS = ['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5'] as const;

export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number];

export const EVENT_OUTCOMES = ['correct', 'partial', 'incorrect', 'neutral'] as const;

export type EventOutcome = (typeof EVENT_OUTCOMES)[number];

export const EVIDENCE_FLAGS = [
  'difficulty_weighted',
  'threat_weighted',
  'time_sensitive',
  'first_attempt',
  'repeated_error',
  'adaptive_difficulty',
] as const;

export type EvidenceFlag = (typeof EVIDENCE_FLAGS)[number];

export const deviceInfoSchema = z
  .object({
    device_type: z.string().optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
    screen_resolution: z.string().optional(),
  })
  .strict();

export type DeviceInfo = z.infer<typeof deviceInfoSchema>;

export const geoInfoSchema = z
  .object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
  })
  .strict();

export type GeoInfo = z.infer<typeof geoInfoSchema>;

export const analyticsPayloadSchema = z
  .object({
    difficulty_tier: z.enum(DIFFICULTY_TIERS).optional(),
    threat_tier: z.string().optional(),
    scenario_id: z.string().optional(),
    content_version: z.string().optional(),
    competency_tags: z.array(z.enum(COMPETENCY_DOMAINS)).optional(),
    outcome: z.enum(EVENT_OUTCOMES).optional(),
    time_to_decision_ms: z.number().int().min(0).optional(),
    evidence_flags: z.array(z.enum(EVIDENCE_FLAGS)).optional(),
  })
  .strict();

export type AnalyticsPayload = z.infer<typeof analyticsPayloadSchema>;

export const eventEnvelopeSchema = z
  .object({
    event_id: z.string().uuid(),
    event_name: z.string(),
    event_version: z.number().int().positive(),
    user_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    session_id: z.string().uuid(),
    correlation_id: z.string().uuid(),
    timestamp: z.string().datetime(),
    source: z.string(),
    environment: z.string().optional(),
    device_info: deviceInfoSchema.optional(),
    geo_info: geoInfoSchema.optional(),
    payload: analyticsPayloadSchema.optional(),
  })
  .strict();

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export const eventValidationResultSchema = z
  .object({
    valid: z.boolean(),
    errors: z.array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    ),
  })
  .strict();

export type EventValidationResult = z.infer<typeof eventValidationResultSchema>;

export function parseCompetencyDomain(input: unknown): CompetencyDomain | null {
  return COMPETENCY_DOMAINS.includes(input as CompetencyDomain)
    ? (input as CompetencyDomain)
    : null;
}

export function parseDifficultyTier(input: unknown): DifficultyTier | null {
  return DIFFICULTY_TIERS.includes(input as DifficultyTier) ? (input as DifficultyTier) : null;
}

export function parseEventOutcome(input: unknown): EventOutcome | null {
  return EVENT_OUTCOMES.includes(input as EventOutcome) ? (input as EventOutcome) : null;
}

export function validateEventEnvelope(input: unknown): EventValidationResult {
  const result = eventEnvelopeSchema.safeParse(input);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { valid: false, errors };
}

export function isValidEventVersion(version: number): boolean {
  return version >= 1 && version <= 999;
}

export function getLatestEventVersion(): number {
  return 1;
}

export function isBackwardCompatibleEvent(eventName: string, eventVersion: number): boolean {
  const supportedVersions: Record<string, number[]> = {
    'game.session.started': [1],
    'game.session.ended': [1],
    'game.session.paused': [1],
    'game.session.resumed': [1],
    'game.email.received': [1],
    'game.email.opened': [1],
    'game.email.indicator.marked': [1],
    'game.email.header.viewed': [1],
    'game.email.url.hovered': [1],
    'game.email.attachment.previewed': [1],
    'game.decision.approved': [1],
    'game.decision.denied': [1],
    'game.decision.flagged': [1],
    'game.decision.verification_requested': [1],
    'game.verification.packet_opened': [1],
    'game.verification.out_of_band_initiated': [1],
    'game.verification.result': [1],
    'game.resource.adjusted': [1],
    'game.upgrade.purchased': [1],
    'threat.attack.launched': [1],
    'threat.attack.mitigated': [1],
    'threat.attack.succeeded': [1],
    'threat.breach.occurred': [1],
    'threat.level.changed': [1],
    'incident.response.action_taken': [1],
  };

  const versions = supportedVersions[eventName];
  if (!versions) {
    return false;
  }

  return versions.some((v) => v >= eventVersion);
}
