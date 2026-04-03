import { describe, expect, it } from 'vitest';

import {
  incidentSchema,
  sessionParamsSchema,
  incidentParamsSchema,
  incidentStatusUpdateBodySchema,
  incidentResponseActionBodySchema,
  incidentResolveBodySchema,
  postIncidentReviewSchema,
  incidentStatsSchema,
  incidentTimelineEntrySchema,
  incidentResponseActionSchema,
  incidentEvidenceSchema,
} from '../incident.schemas.js';

describe('incident-schemas', () => {
  describe('incidentTimelineEntrySchema', () => {
    it('should accept valid timeline entry', () => {
      const input = {
        timestamp: '2024-01-01T00:00:00.000Z',
        day: 5,
        action: 'status_change',
        description: 'Incident status changed',
        actor: 'system',
      };
      expect(() => incidentTimelineEntrySchema.parse(input)).not.toThrow();
    });

    it('should accept player actor', () => {
      const input = {
        timestamp: '2024-01-01T00:00:00.000Z',
        day: 5,
        action: 'status_change',
        description: 'Incident status changed',
        actor: 'player',
      };
      expect(() => incidentTimelineEntrySchema.parse(input)).not.toThrow();
    });

    it('should reject invalid actor', () => {
      const input = {
        timestamp: '2024-01-01T00:00:00.000Z',
        day: 5,
        action: 'status_change',
        description: 'Incident status changed',
        actor: 'admin',
      };
      expect(() => incidentTimelineEntrySchema.parse(input)).toThrow();
    });

    it('should require all fields', () => {
      expect(() => incidentTimelineEntrySchema.parse({})).toThrow();
      expect(() =>
        incidentTimelineEntrySchema.parse({ timestamp: '2024-01-01T00:00:00.000Z' }),
      ).toThrow();
    });
  });

  describe('incidentResponseActionSchema', () => {
    it('should accept valid response action', () => {
      const input = {
        actionId: '123e4567-e89b-12d3-a456-426614174000',
        actionType: 'deny_email',
        timestamp: '2024-01-01T00:00:00.000Z',
        day: 5,
        effectiveness: 0.85,
        notes: 'Action taken successfully',
      };
      expect(() => incidentResponseActionSchema.parse(input)).not.toThrow();
    });

    it('should accept action without optional fields', () => {
      const input = {
        actionId: '123e4567-e89b-12d3-a456-426614174000',
        actionType: 'report_threat_intel',
        timestamp: '2024-01-01T00:00:00.000Z',
        day: 5,
        effectiveness: 0,
      };
      expect(() => incidentResponseActionSchema.parse(input)).not.toThrow();
    });

    it('should reject invalid action type', () => {
      const input = {
        actionId: '123e4567-e89b-12d3-a456-426614174000',
        actionType: 'invalid_action',
        timestamp: '2024-01-01T00:00:00.000Z',
        day: 5,
        effectiveness: 0.5,
      };
      expect(() => incidentResponseActionSchema.parse(input)).toThrow();
    });

    it('should accept effectiveness values', () => {
      const input = {
        actionId: '123e4567-e89b-12d3-a456-426614174000',
        actionType: 'deny_email',
        timestamp: '2024-01-01T00:00:00.000Z',
        day: 5,
        effectiveness: 1.5,
      };
      expect(() => incidentResponseActionSchema.parse(input)).not.toThrow();
    });
  });

  describe('incidentEvidenceSchema', () => {
    it('should accept valid evidence', () => {
      const input = {
        indicators: ['indicator1', 'indicator2'],
        logs: ['log entry 1', 'log entry 2'],
        screenshots: ['screenshot1.png'],
        networkPackets: ['packet1', 'packet2'],
      };
      expect(() => incidentEvidenceSchema.parse(input)).not.toThrow();
    });

    it('should accept minimal evidence', () => {
      const input = {
        indicators: [],
        logs: [],
      };
      expect(() => incidentEvidenceSchema.parse(input)).not.toThrow();
    });

    it('should reject when indicators is missing', () => {
      const input = {
        logs: ['log entry 1'],
      };
      expect(() => incidentEvidenceSchema.parse(input)).toThrow();
    });
  });

  describe('incidentSchema', () => {
    const validIncident = {
      incidentId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      timestamp: '2024-01-01T00:00:00.000Z',
      day: 5,
      detectionSource: 'siem',
      classification: 'phishing',
      severity: 3,
      affectedAssets: ['workstation-1', 'email-server'],
      evidence: {
        indicators: ['suspicious@email.com'],
        logs: ['connection attempt'],
      },
      status: 'open',
      timeline: [],
      responseActions: [],
    };

    it('should accept valid incident object', () => {
      expect(() => incidentSchema.parse(validIncident)).not.toThrow();
    });

    it('should accept valid incident with Date objects', () => {
      const input = {
        ...validIncident,
        timestamp: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(() => incidentSchema.parse(input)).not.toThrow();
    });

    it('should reject invalid incidentId (non-UUID)', () => {
      const input = { ...validIncident, incidentId: 'not-a-uuid' };
      expect(() => incidentSchema.parse(input)).toThrow();
    });

    it('should reject invalid sessionId (non-UUID)', () => {
      const input = { ...validIncident, sessionId: 'invalid-session' };
      expect(() => incidentSchema.parse(input)).toThrow();
    });

    it('should reject invalid status', () => {
      const input = { ...validIncident, status: 'invalid_status' };
      expect(() => incidentSchema.parse(input)).toThrow();
    });

    it('should reject severity outside 1-4 range', () => {
      expect(() => incidentSchema.parse({ ...validIncident, severity: 0 })).toThrow();
      expect(() => incidentSchema.parse({ ...validIncident, severity: 5 })).toThrow();
      expect(() => incidentSchema.parse({ ...validIncident, severity: 1.5 })).toThrow();
    });

    it('should reject invalid classification', () => {
      const input = { ...validIncident, classification: 'invalid_class' };
      expect(() => incidentSchema.parse(input)).toThrow();
    });

    it('should reject invalid detection source', () => {
      const input = { ...validIncident, detectionSource: 'invalid_source' };
      expect(() => incidentSchema.parse(input)).toThrow();
    });

    it('should accept all valid status values', () => {
      const statuses = ['open', 'investigating', 'contained', 'eradicated', 'recovered', 'closed'];
      for (const status of statuses) {
        expect(() => incidentSchema.parse({ ...validIncident, status })).not.toThrow();
      }
    });

    it('should require all required fields', () => {
      expect(() => incidentSchema.parse({})).toThrow();
      expect(() =>
        incidentSchema.parse({ incidentId: '123e4567-e89b-12d3-a456-426614174000' }),
      ).toThrow();
    });

    it('should accept incident with optional fields', () => {
      const input = {
        ...validIncident,
        attackId: '123e4567-e89b-12d3-a456-426614174002',
        outcome: 'Resolved successfully',
        rootCause: 'Phishing email',
        lessonsLearned: 'Better email filtering needed',
        resolvedAt: '2024-01-02T00:00:00.000Z',
        resolutionDays: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };
      expect(() => incidentSchema.parse(input)).not.toThrow();
    });
  });

  describe('sessionParamsSchema', () => {
    it('should accept valid sessionId UUID', () => {
      const input = { sessionId: '123e4567-e89b-12d3-a456-426614174000' };
      expect(() => sessionParamsSchema.parse(input)).not.toThrow();
    });

    it('should reject invalid UUID format', () => {
      const input = { sessionId: 'not-a-uuid' };
      expect(() => sessionParamsSchema.parse(input)).toThrow();
    });

    it('should reject missing sessionId', () => {
      expect(() => sessionParamsSchema.parse({})).toThrow();
    });
  });

  describe('incidentParamsSchema', () => {
    it('should accept valid sessionId and incidentId', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        incidentId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(() => incidentParamsSchema.parse(input)).not.toThrow();
    });

    it('should reject invalid sessionId', () => {
      const input = {
        sessionId: 'invalid',
        incidentId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(() => incidentParamsSchema.parse(input)).toThrow();
    });

    it('should reject invalid incidentId', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        incidentId: 'invalid',
      };
      expect(() => incidentParamsSchema.parse(input)).toThrow();
    });

    it('should reject missing fields', () => {
      expect(() => incidentParamsSchema.parse({})).toThrow();
      expect(() =>
        incidentParamsSchema.parse({ sessionId: '123e4567-e89b-12d3-a456-426614174000' }),
      ).toThrow();
    });
  });

  describe('incidentStatusUpdateBodySchema', () => {
    it('should accept valid status update', () => {
      const input = {
        status: 'investigating',
        notes: 'Starting investigation',
        day: 5,
      };
      expect(() => incidentStatusUpdateBodySchema.parse(input)).not.toThrow();
    });

    it('should accept status update without optional notes', () => {
      const input = {
        status: 'contained',
        day: 6,
      };
      expect(() => incidentStatusUpdateBodySchema.parse(input)).not.toThrow();
    });

    it('should reject invalid status', () => {
      const input = {
        status: 'invalid_status',
        day: 5,
      };
      expect(() => incidentStatusUpdateBodySchema.parse(input)).toThrow();
    });

    it('should reject missing day field', () => {
      const input = { status: 'open' };
      expect(() => incidentStatusUpdateBodySchema.parse(input)).toThrow();
    });

    it('should accept all valid status values', () => {
      const statuses = ['open', 'investigating', 'contained', 'eradicated', 'recovered', 'closed'];
      for (const status of statuses) {
        expect(() => incidentStatusUpdateBodySchema.parse({ status, day: 1 })).not.toThrow();
      }
    });
  });

  describe('incidentResponseActionBodySchema', () => {
    it('should accept valid response action', () => {
      const input = {
        actionType: 'deny_email',
        effectiveness: 0.75,
        notes: 'Email blocked successfully',
        day: 5,
      };
      expect(() => incidentResponseActionBodySchema.parse(input)).not.toThrow();
    });

    it('should accept action without optional effectiveness', () => {
      const input = {
        actionType: 'report_threat_intel',
        day: 5,
      };
      expect(() => incidentResponseActionBodySchema.parse(input)).not.toThrow();
    });

    it('should reject effectiveness below 0', () => {
      const input = {
        actionType: 'deny_email',
        effectiveness: -0.1,
        day: 5,
      };
      expect(() => incidentResponseActionBodySchema.parse(input)).toThrow();
    });

    it('should reject effectiveness above 1', () => {
      const input = {
        actionType: 'deny_email',
        effectiveness: 1.1,
        day: 5,
      };
      expect(() => incidentResponseActionBodySchema.parse(input)).toThrow();
    });

    it('should reject invalid action type', () => {
      const input = {
        actionType: 'invalid_action',
        day: 5,
      };
      expect(() => incidentResponseActionBodySchema.parse(input)).toThrow();
    });

    it('should accept effectiveness at boundaries', () => {
      expect(() =>
        incidentResponseActionBodySchema.parse({
          actionType: 'deny_email',
          effectiveness: 0,
          day: 1,
        }),
      ).not.toThrow();
      expect(() =>
        incidentResponseActionBodySchema.parse({
          actionType: 'deny_email',
          effectiveness: 1,
          day: 1,
        }),
      ).not.toThrow();
    });
  });

  describe('incidentResolveBodySchema', () => {
    it('should accept valid resolve input', () => {
      const input = {
        outcome: 'Successfully contained',
        rootCause: 'Phishing email',
        lessonsLearned: 'Need better email filtering',
        day: 10,
      };
      expect(() => incidentResolveBodySchema.parse(input)).not.toThrow();
    });

    it('should accept minimal resolve input', () => {
      const input = {
        outcome: 'Resolved',
        day: 10,
      };
      expect(() => incidentResolveBodySchema.parse(input)).not.toThrow();
    });

    it('should reject missing outcome', () => {
      const input = {
        day: 10,
      };
      expect(() => incidentResolveBodySchema.parse(input)).toThrow();
    });

    it('should reject missing day', () => {
      const input = {
        outcome: 'Resolved',
      };
      expect(() => incidentResolveBodySchema.parse(input)).toThrow();
    });
  });

  describe('postIncidentReviewSchema', () => {
    const validReview = {
      incidentId: '123e4567-e89b-12d3-a456-426614174000',
      timeline: [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          day: 1,
          action: 'created',
          description: 'Incident created',
          actor: 'system',
        },
      ],
      detectionAnalysis: {
        source: 'siem',
        timeToDetect: 30,
        detectionQuality: 'good',
      },
      responseEvaluation: {
        actionsTaken: 3,
        effectiveness: 0.85,
        appropriateForType: true,
        suggestions: ['Improve monitoring'],
      },
      rootCause: 'Phishing email',
      recommendations: ['Better email filtering', 'User training'],
      competenceScore: 85,
    };

    it('should accept valid post-incident review', () => {
      expect(() => postIncidentReviewSchema.parse(validReview)).not.toThrow();
    });

    it('should reject invalid detection quality', () => {
      const input = {
        ...validReview,
        detectionAnalysis: {
          source: 'siem',
          timeToDetect: 30,
          detectionQuality: 'invalid_quality',
        },
      };
      expect(() => postIncidentReviewSchema.parse(input)).toThrow();
    });

    it('should reject invalid incidentId', () => {
      const input = { ...validReview, incidentId: 'not-a-uuid' };
      expect(() => postIncidentReviewSchema.parse(input)).toThrow();
    });

    it('should require competence score', () => {
      const input = { ...validReview, competenceScore: undefined };
      expect(() => postIncidentReviewSchema.parse(input)).toThrow();
    });

    it('should accept all valid detection quality values', () => {
      const qualities = ['excellent', 'good', 'fair', 'poor'];
      for (const quality of qualities) {
        const input = {
          ...validReview,
          detectionAnalysis: {
            source: 'siem',
            timeToDetect: 30,
            detectionQuality: quality,
          },
        };
        expect(() => postIncidentReviewSchema.parse(input)).not.toThrow();
      }
    });
  });

  describe('incidentStatsSchema', () => {
    it('should accept valid stats object', () => {
      const input = {
        total: 10,
        open: 2,
        investigating: 1,
        contained: 3,
        eradicated: 2,
        recovered: 1,
        closed: 1,
        avgResolutionDays: 5.5,
      };
      expect(() => incidentStatsSchema.parse(input)).not.toThrow();
    });

    it('should require all numeric fields', () => {
      const input = {
        total: 10,
        open: 2,
        investigating: 1,
        contained: 3,
        eradicated: 2,
        recovered: 1,
        closed: 1,
      };
      expect(() => incidentStatsSchema.parse(input)).toThrow();
    });

    it('should accept zero values', () => {
      const input = {
        total: 0,
        open: 0,
        investigating: 0,
        contained: 0,
        eradicated: 0,
        recovered: 0,
        closed: 0,
        avgResolutionDays: 0,
      };
      expect(() => incidentStatsSchema.parse(input)).not.toThrow();
    });

    it('should accept negative values', () => {
      const input = {
        total: -1,
        open: 0,
        investigating: 0,
        contained: 0,
        eradicated: 0,
        recovered: 0,
        closed: 0,
        avgResolutionDays: 0,
      };
      expect(() => incidentStatsSchema.parse(input)).not.toThrow();
    });
  });
});
