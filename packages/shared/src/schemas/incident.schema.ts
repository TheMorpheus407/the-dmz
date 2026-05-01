import { z } from 'zod';

import {
  INCIDENT_STATUSES,
  INCIDENT_CLASSIFICATIONS,
  DETECTION_SOURCES,
  RESPONSE_ACTIONS,
} from '../game/incident.js';

export const incidentTimelineEntrySchema = z.object({
  timestamp: z.string(),
  day: z.number(),
  action: z.string(),
  description: z.string(),
  actor: z.enum(['system', 'player']),
});

export const incidentResponseActionSchema = z.object({
  actionId: z.string(),
  actionType: z.enum(RESPONSE_ACTIONS),
  timestamp: z.string(),
  day: z.number(),
  effectiveness: z.number(),
  notes: z.string().optional(),
});

export const incidentEvidenceSchema = z.object({
  indicators: z.array(z.string()),
  logs: z.array(z.string()),
  screenshots: z.array(z.string()).optional(),
  networkPackets: z.array(z.string()).optional(),
});

export const incidentSchema = z.object({
  incidentId: z.string().uuid(),
  sessionId: z.string().uuid(),
  attackId: z.string().uuid().nullable().optional(),
  timestamp: z.string().or(z.date()),
  day: z.number(),
  detectionSource: z.enum(DETECTION_SOURCES),
  classification: z.enum(INCIDENT_CLASSIFICATIONS),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  affectedAssets: z.array(z.string()),
  evidence: incidentEvidenceSchema,
  status: z.enum(INCIDENT_STATUSES),
  timeline: z.array(incidentTimelineEntrySchema),
  responseActions: z.array(incidentResponseActionSchema),
  outcome: z.string().optional(),
  rootCause: z.string().optional(),
  lessonsLearned: z.string().optional(),
  resolvedAt: z.string().or(z.date()).optional(),
  resolutionDays: z.number().nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const incidentListResponseSchema = z.object({
  data: z.array(incidentSchema),
});

export const incidentSingleResponseSchema = z.object({
  data: incidentSchema,
});

export const availableActionsResponseSchema = z.object({
  data: z.array(z.enum(RESPONSE_ACTIONS)),
});

export const incidentStatusUpdateBodySchema = z.object({
  status: z.enum(INCIDENT_STATUSES),
  notes: z.string().optional(),
  day: z.number(),
});

export const incidentStatusUpdateResponseSchema = z.object({
  data: incidentSchema,
});

export const incidentResponseActionBodySchema = z.object({
  actionType: z.enum(RESPONSE_ACTIONS),
  effectiveness: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  day: z.number(),
});

export const incidentResponseActionResponseSchema = z.object({
  data: incidentSchema,
});

export const incidentResolveBodySchema = z.object({
  outcome: z.string(),
  rootCause: z.string().optional(),
  lessonsLearned: z.string().optional(),
  day: z.number(),
});

export const incidentResolveResponseSchema = z.object({
  data: incidentSchema,
});

const DETECTION_QUALITY_SCHEMA = z.enum(['excellent', 'good', 'fair', 'poor']);

const DETECTION_ANALYSIS_SCHEMA = z.object({
  source: z.enum(DETECTION_SOURCES),
  timeToDetect: z.number(),
  detectionQuality: DETECTION_QUALITY_SCHEMA,
});

const RESPONSE_EVALUATION_SCHEMA = z.object({
  actionsTaken: z.number(),
  effectiveness: z.number(),
  appropriateForType: z.boolean(),
  suggestions: z.array(z.string()),
});

export const postIncidentReviewSchema = z.object({
  incidentId: z.string().uuid(),
  timeline: z.array(incidentTimelineEntrySchema),
  detectionAnalysis: DETECTION_ANALYSIS_SCHEMA,
  responseEvaluation: RESPONSE_EVALUATION_SCHEMA,
  rootCause: z.string(),
  recommendations: z.array(z.string()),
  competenceScore: z.number(),
});

export const postIncidentReviewResponseSchema = z.object({
  data: postIncidentReviewSchema,
});

export const incidentStatsSchema = z.object({
  total: z.number().int().min(0),
  open: z.number().int().min(0),
  investigating: z.number().int().min(0),
  contained: z.number().int().min(0),
  eradicated: z.number().int().min(0),
  recovered: z.number().int().min(0),
  closed: z.number().int().min(0),
  avgResolutionDays: z.number(),
});

export const incidentStatsResponseSchema = z.object({
  data: incidentStatsSchema,
});

export const sessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

export const incidentParamsSchema = z.object({
  sessionId: z.string().uuid(),
  incidentId: z.string().uuid(),
});
