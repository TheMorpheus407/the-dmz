import { z } from 'zod';

import { INCIDENT_STATUSES } from '../game/incident.js';
import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  GAME_ACTIONS,
  DECISION_TYPES,
  GAME_THREAT_TIERS,
  FACILITY_TIER_LEVELS,
} from '../types/game-engine.js';

export const sessionMacroStateSchema = z.enum(
  Object.values(SESSION_MACRO_STATES) as [string, ...string[]],
);

export const dayPhaseSchema = z.enum(Object.values(DAY_PHASES) as [string, ...string[]]);

export const gameActionTypeSchema = z.enum(Object.values(GAME_ACTIONS) as [string, ...string[]]);

export const decisionTypeSchema = z.enum(Object.values(DECISION_TYPES) as [string, ...string[]]);

export const gameThreatTierSchema = z.enum(
  Object.values(GAME_THREAT_TIERS) as [string, ...string[]],
);

export const gameFacilityTierSchema = z.enum(
  Object.values(FACILITY_TIER_LEVELS) as [string, ...string[]],
);

export const emailStatusSchema = z.enum([
  'pending',
  'flagged',
  'request_verification',
  'approved',
  'denied',
  'deferred',
]);

export const incidentStatusSchema = z.enum(
  Object.values(INCIDENT_STATUSES) as [string, ...string[]],
);

export const gameStateSchema = z
  .object({
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    tenantId: z.string().uuid(),
    seed: z.number().int(),
    currentDay: z.number().int().min(1),
    currentMacroState: sessionMacroStateSchema,
    currentPhase: dayPhaseSchema,
    funds: z.number().int().min(0),
    trustScore: z.number().int().min(0),
    intelFragments: z.number().int().min(0),
    playerLevel: z.number().int().min(1).max(50),
    playerXP: z.number().int().min(0),
    threatTier: gameThreatTierSchema,
    facilityTier: gameFacilityTierSchema,
    inbox: z.array(
      z.object({
        emailId: z.string().uuid(),
        status: emailStatusSchema,
        indicators: z.array(z.string()),
        verificationRequested: z.boolean(),
        timeSpentMs: z.number().int().min(0),
      }),
    ),
    incidents: z.array(
      z.object({
        incidentId: z.string().uuid(),
        status: incidentStatusSchema,
        severity: z.number().int().min(1).max(10),
        type: z.string(),
        createdDay: z.number().int().min(1),
        resolvedDay: z.number().int().min(1).optional(),
        responseActions: z.array(z.string()),
      }),
    ),
    narrativeState: z.object({
      currentChapter: z.number().int().min(1),
      activeTriggers: z.array(z.string()),
      completedEvents: z.array(z.string()),
    }),
    factionRelations: z.record(z.number().int()),
    blacklist: z.array(z.string()),
    whitelist: z.array(z.string()),
    analyticsState: z.object({
      totalEmailsProcessed: z.number().int().min(0),
      totalDecisions: z.number().int().min(0),
      approvals: z.number().int().min(0),
      denials: z.number().int().min(0),
      flags: z.number().int().min(0),
      verificationsRequested: z.number().int().min(0),
      incidentsTriggered: z.number().int().min(0),
      breaches: z.number().int().min(0),
    }),
    sequenceNumber: z.number().int().min(0),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type GameStateSchema = z.infer<typeof gameStateSchema>;

export const gameActionSchema = z
  .object({
    actionId: z.string().uuid(),
    actionType: gameActionTypeSchema,
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    tenantId: z.string().uuid(),
    timestamp: z.string().datetime(),
    payload: z.record(z.unknown()),
    sequenceNumber: z.number().int().min(0),
  })
  .strict();

export type GameActionSchema = z.infer<typeof gameActionSchema>;
