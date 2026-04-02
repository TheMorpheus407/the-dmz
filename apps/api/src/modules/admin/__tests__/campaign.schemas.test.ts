import { describe, expect, it } from 'vitest';

import {
  campaignCreateSchema,
  campaignUpdateSchema,
  campaignStatusUpdateSchema,
  campaignAudienceSchema,
  campaignContentSchema,
  campaignEscalationSchema,
  campaignListQuerySchema,
  enrollUsersSchema,
  enrollmentStatusUpdateSchema,
  campaignStatusEnum,
  campaignTypeEnum,
  recurrencePatternEnum,
  contentTypeEnum,
  enrollmentStatusEnum,
} from '../campaign.schemas.js';

describe('campaign-schemas', () => {
  describe('enums', () => {
    describe('campaignStatusEnum', () => {
      it('should accept valid status values', () => {
        expect(() => campaignStatusEnum.parse('draft')).not.toThrow();
        expect(() => campaignStatusEnum.parse('active')).not.toThrow();
        expect(() => campaignStatusEnum.parse('paused')).not.toThrow();
        expect(() => campaignStatusEnum.parse('completed')).not.toThrow();
      });

      it('should reject invalid status values', () => {
        expect(() => campaignStatusEnum.parse('invalid')).toThrow();
        expect(() => campaignStatusEnum.parse('')).toThrow();
      });
    });

    describe('campaignTypeEnum', () => {
      it('should accept valid type values', () => {
        expect(() => campaignTypeEnum.parse('onboarding')).not.toThrow();
        expect(() => campaignTypeEnum.parse('quarterly')).not.toThrow();
        expect(() => campaignTypeEnum.parse('annual')).not.toThrow();
        expect(() => campaignTypeEnum.parse('event-driven')).not.toThrow();
      });

      it('should reject invalid type values', () => {
        expect(() => campaignTypeEnum.parse('invalid')).toThrow();
        expect(() => campaignTypeEnum.parse('')).toThrow();
      });
    });

    describe('recurrencePatternEnum', () => {
      it('should accept valid pattern values', () => {
        expect(() => recurrencePatternEnum.parse('one-time')).not.toThrow();
        expect(() => recurrencePatternEnum.parse('weekly')).not.toThrow();
        expect(() => recurrencePatternEnum.parse('monthly')).not.toThrow();
        expect(() => recurrencePatternEnum.parse('quarterly')).not.toThrow();
        expect(() => recurrencePatternEnum.parse('annual')).not.toThrow();
      });

      it('should reject invalid pattern values', () => {
        expect(() => recurrencePatternEnum.parse('invalid')).toThrow();
      });
    });

    describe('contentTypeEnum', () => {
      it('should accept valid content type values', () => {
        expect(() => contentTypeEnum.parse('module')).not.toThrow();
        expect(() => contentTypeEnum.parse('assessment')).not.toThrow();
        expect(() => contentTypeEnum.parse('phishing_simulation')).not.toThrow();
      });

      it('should reject invalid content type values', () => {
        expect(() => contentTypeEnum.parse('invalid')).toThrow();
      });
    });

    describe('enrollmentStatusEnum', () => {
      it('should accept valid enrollment status values', () => {
        expect(() => enrollmentStatusEnum.parse('not_started')).not.toThrow();
        expect(() => enrollmentStatusEnum.parse('in_progress')).not.toThrow();
        expect(() => enrollmentStatusEnum.parse('completed')).not.toThrow();
      });

      it('should reject invalid enrollment status values', () => {
        expect(() => enrollmentStatusEnum.parse('invalid')).toThrow();
      });
    });
  });

  describe('campaignCreateSchema', () => {
    it('should accept valid campaign creation input', () => {
      const input = {
        name: 'Test Campaign',
        campaignType: 'onboarding',
        description: 'Test description',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
        timezone: 'America/New_York',
        recurrencePattern: 'monthly',
      };
      expect(() => campaignCreateSchema.parse(input)).not.toThrow();
    });

    it('should require name and campaignType', () => {
      expect(() => campaignCreateSchema.parse({})).toThrow();
      expect(() => campaignCreateSchema.parse({ name: 'Test' })).toThrow();
      expect(() => campaignCreateSchema.parse({ campaignType: 'onboarding' })).toThrow();
    });

    it('should accept minimal valid input', () => {
      const input = { name: 'Test Campaign', campaignType: 'quarterly' };
      expect(() => campaignCreateSchema.parse(input)).not.toThrow();
    });

    it('should reject name exceeding max length', () => {
      const input = {
        name: 'a'.repeat(256),
        campaignType: 'onboarding',
      };
      expect(() => campaignCreateSchema.parse(input)).toThrow();
    });

    it('should reject invalid datetime format', () => {
      const input = {
        name: 'Test',
        campaignType: 'onboarding',
        startDate: 'not-a-date',
      };
      expect(() => campaignCreateSchema.parse(input)).toThrow();
    });

    it('should reject invalid campaign type', () => {
      const input = {
        name: 'Test',
        campaignType: 'invalid',
      };
      expect(() => campaignCreateSchema.parse(input)).toThrow();
    });
  });

  describe('campaignUpdateSchema', () => {
    it('should accept empty object', () => {
      expect(() => campaignUpdateSchema.parse({})).not.toThrow();
    });

    it('should accept partial updates', () => {
      expect(() => campaignUpdateSchema.parse({ name: 'Updated Name' })).not.toThrow();
      expect(() => campaignUpdateSchema.parse({ status: 'active' })).not.toThrow();
    });

    it('should reject invalid values', () => {
      expect(() => campaignUpdateSchema.parse({ name: '' })).toThrow();
      expect(() => campaignUpdateSchema.parse({ campaignType: 'invalid' })).toThrow();
    });
  });

  describe('campaignStatusUpdateSchema', () => {
    it('should accept valid status', () => {
      expect(() => campaignStatusUpdateSchema.parse({ status: 'draft' })).not.toThrow();
      expect(() => campaignStatusUpdateSchema.parse({ status: 'active' })).not.toThrow();
      expect(() => campaignStatusUpdateSchema.parse({ status: 'paused' })).not.toThrow();
      expect(() => campaignStatusUpdateSchema.parse({ status: 'completed' })).not.toThrow();
    });

    it('should require status field', () => {
      expect(() => campaignStatusUpdateSchema.parse({})).toThrow();
    });

    it('should reject invalid status', () => {
      expect(() => campaignStatusUpdateSchema.parse({ status: 'invalid' })).toThrow();
    });
  });

  describe('campaignAudienceSchema', () => {
    it('should accept valid audience configuration', () => {
      const input = {
        groupIds: ['123e4567-e89b-12d3-a456-426614174000'],
        departments: ['Engineering'],
        locations: ['New York'],
        roles: ['Developer'],
        attributeFilters: { seniority: 'senior' },
      };
      expect(() => campaignAudienceSchema.parse(input)).not.toThrow();
    });

    it('should accept empty object', () => {
      expect(() => campaignAudienceSchema.parse({})).not.toThrow();
    });

    it('should reject invalid UUID in groupIds', () => {
      const input = { groupIds: ['not-a-uuid'] };
      expect(() => campaignAudienceSchema.parse(input)).toThrow();
    });
  });

  describe('campaignContentSchema', () => {
    it('should accept valid content input', () => {
      const input = {
        contentType: 'module',
        contentItemId: '123e4567-e89b-12d3-a456-426614174000',
        orderIndex: 1,
        dueDays: 7,
        isPrerequisite: true,
      };
      expect(() => campaignContentSchema.parse(input)).not.toThrow();
    });

    it('should require contentType and contentItemId', () => {
      expect(() => campaignContentSchema.parse({})).toThrow();
      expect(() => campaignContentSchema.parse({ contentType: 'module' })).toThrow();
    });

    it('should reject invalid UUID for contentItemId', () => {
      const input = {
        contentType: 'module',
        contentItemId: 'invalid-uuid',
      };
      expect(() => campaignContentSchema.parse(input)).toThrow();
    });

    it('should reject invalid content type', () => {
      const input = {
        contentType: 'invalid',
        contentItemId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => campaignContentSchema.parse(input)).toThrow();
    });
  });

  describe('campaignEscalationSchema', () => {
    it('should accept valid escalation configuration', () => {
      const input = {
        reminderDays: [1, 3, 7],
        managerNotification: true,
        complianceAlert: true,
        complianceAlertThreshold: 80,
      };
      expect(() => campaignEscalationSchema.parse(input)).not.toThrow();
    });

    it('should accept empty object', () => {
      expect(() => campaignEscalationSchema.parse({})).not.toThrow();
    });

    it('should reject non-integer reminder days', () => {
      const input = { reminderDays: [1.5, 2] };
      expect(() => campaignEscalationSchema.parse(input)).toThrow();
    });
  });

  describe('campaignListQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const input = {
        status: 'active',
        campaignType: 'quarterly',
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.999Z',
        search: 'test',
        limit: 50,
        offset: 10,
      };
      expect(() => campaignListQuerySchema.parse(input)).not.toThrow();
    });

    it('should accept empty object', () => {
      expect(() => campaignListQuerySchema.parse({})).not.toThrow();
    });

    it('should reject limit below minimum', () => {
      expect(() => campaignListQuerySchema.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit above maximum', () => {
      expect(() => campaignListQuerySchema.parse({ limit: 101 })).toThrow();
    });

    it('should reject negative offset', () => {
      expect(() => campaignListQuerySchema.parse({ offset: -1 })).toThrow();
    });
  });

  describe('enrollUsersSchema', () => {
    it('should accept valid user IDs', () => {
      const input = {
        userIds: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
      };
      expect(() => enrollUsersSchema.parse(input)).not.toThrow();
    });

    it('should require at least one user', () => {
      expect(() => enrollUsersSchema.parse({ userIds: [] })).toThrow();
    });

    it('should reject more than 500 users', () => {
      const input = {
        userIds: Array(501).fill('123e4567-e89b-12d3-a456-426614174000'),
      };
      expect(() => enrollUsersSchema.parse(input)).toThrow();
    });

    it('should reject invalid UUIDs', () => {
      const input = { userIds: ['not-a-uuid'] };
      expect(() => enrollUsersSchema.parse(input)).toThrow();
    });
  });

  describe('enrollmentStatusUpdateSchema', () => {
    it('should accept valid enrollment status', () => {
      expect(() => enrollmentStatusUpdateSchema.parse({ status: 'not_started' })).not.toThrow();
      expect(() => enrollmentStatusUpdateSchema.parse({ status: 'in_progress' })).not.toThrow();
      expect(() => enrollmentStatusUpdateSchema.parse({ status: 'completed' })).not.toThrow();
    });

    it('should require status field', () => {
      expect(() => enrollmentStatusUpdateSchema.parse({})).toThrow();
    });

    it('should reject invalid status', () => {
      expect(() => enrollmentStatusUpdateSchema.parse({ status: 'invalid' })).toThrow();
    });
  });
});
