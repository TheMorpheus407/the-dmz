import { z } from 'zod';

import {
  INCIDENT_STATUSES,
  INCIDENT_CLASSIFICATIONS,
  DETECTION_SOURCES,
  RESPONSE_ACTIONS,
} from '@the-dmz/shared/game';

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
  timestamp: z.string(),
  day: z.number(),
  detectionSource: z.enum(DETECTION_SOURCES),
  classification: z.enum(INCIDENT_CLASSIFICATIONS),
  severity: z.number().int().min(1).max(4),
  affectedAssets: z.array(z.string()),
  evidence: incidentEvidenceSchema,
  status: z.enum(INCIDENT_STATUSES),
  timeline: z.array(incidentTimelineEntrySchema),
  responseActions: z.array(incidentResponseActionSchema),
  outcome: z.string().optional(),
  rootCause: z.string().optional(),
  lessonsLearned: z.string().optional(),
  resolvedAt: z.string().optional(),
  resolutionDays: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
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

const detectionQualitySchema = z.enum(['excellent', 'good', 'fair', 'poor']);

const detectionAnalysisSchema = z.object({
  source: z.enum(DETECTION_SOURCES),
  timeToDetect: z.number(),
  detectionQuality: detectionQualitySchema,
});

const responseEvaluationSchema = z.object({
  actionsTaken: z.number(),
  effectiveness: z.number(),
  appropriateForType: z.boolean(),
  suggestions: z.array(z.string()),
});

export const postIncidentReviewSchema = z.object({
  incidentId: z.string().uuid(),
  timeline: z.array(incidentTimelineEntrySchema),
  detectionAnalysis: detectionAnalysisSchema,
  responseEvaluation: responseEvaluationSchema,
  rootCause: z.string(),
  recommendations: z.array(z.string()),
  competenceScore: z.number(),
});

export const postIncidentReviewResponseSchema = z.object({
  data: postIncidentReviewSchema,
});

export const incidentStatsSchema = z.object({
  total: z.number(),
  open: z.number(),
  investigating: z.number(),
  contained: z.number(),
  eradicated: z.number(),
  recovered: z.number(),
  closed: z.number(),
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
