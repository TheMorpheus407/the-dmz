import { describe, it, expect } from 'vitest';

import type {
  CampaignInput,
  CampaignUpdateInput,
  CampaignAudienceInput,
  CampaignContentInput,
  CampaignEscalationInput,
  CampaignWithRelations,
  CampaignListQuery,
  CampaignProgressMetrics,
  CampaignStatus,
  CampaignType,
  RecurrencePattern,
  ContentType,
  EnrollmentStatus,
} from '../campaign.service.js';

describe('campaign-service-types', () => {
  describe('type exports', () => {
    it('should export CampaignStatus type with correct values', () => {
      const statuses: CampaignStatus[] = ['draft', 'active', 'paused', 'completed'];
      expect(statuses).toContain('draft');
      expect(statuses).toContain('active');
      expect(statuses).toContain('paused');
      expect(statuses).toContain('completed');
    });

    it('should export CampaignType with correct values', () => {
      const types: CampaignType[] = ['onboarding', 'quarterly', 'annual', 'event-driven'];
      expect(types).toContain('onboarding');
      expect(types).toContain('quarterly');
      expect(types).toContain('annual');
      expect(types).toContain('event-driven');
    });

    it('should export RecurrencePattern with correct values', () => {
      const patterns: RecurrencePattern[] = [
        'one-time',
        'weekly',
        'monthly',
        'quarterly',
        'annual',
      ];
      expect(patterns).toContain('one-time');
      expect(patterns).toContain('weekly');
      expect(patterns).toContain('monthly');
      expect(patterns).toContain('quarterly');
      expect(patterns).toContain('annual');
    });

    it('should export ContentType with correct values', () => {
      const contentTypes: ContentType[] = ['module', 'assessment', 'phishing_simulation'];
      expect(contentTypes).toContain('module');
      expect(contentTypes).toContain('assessment');
      expect(contentTypes).toContain('phishing_simulation');
    });

    it('should export EnrollmentStatus with correct values', () => {
      const enrollmentStatuses: EnrollmentStatus[] = ['not_started', 'in_progress', 'completed'];
      expect(enrollmentStatuses).toContain('not_started');
      expect(enrollmentStatuses).toContain('in_progress');
      expect(enrollmentStatuses).toContain('completed');
    });
  });

  describe('CampaignInput', () => {
    it('should accept valid campaign input', () => {
      const input: CampaignInput = {
        name: 'Test Campaign',
        campaignType: 'onboarding',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(input.name).toBe('Test Campaign');
      expect(input.campaignType).toBe('onboarding');
    });

    it('should accept optional fields', () => {
      const input: CampaignInput = {
        name: 'Test Campaign',
        campaignType: 'quarterly',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Test description',
        startDate: new Date(),
        endDate: new Date(),
        timezone: 'America/New_York',
        recurrencePattern: 'monthly',
      };
      expect(input.description).toBe('Test description');
      expect(input.timezone).toBe('America/New_York');
    });
  });

  describe('CampaignUpdateInput', () => {
    it('should accept partial update', () => {
      const input: CampaignUpdateInput = {
        name: 'Updated Name',
      };
      expect(input.name).toBe('Updated Name');
    });
  });

  describe('CampaignAudienceInput', () => {
    it('should accept audience targeting config', () => {
      const input: CampaignAudienceInput = {
        groupIds: ['group-1', 'group-2'],
        departments: ['Engineering', 'Sales'],
        locations: ['New York', 'London'],
        roles: ['Admin', 'User'],
        attributeFilters: { title: 'Manager' },
      };
      expect(input.groupIds).toHaveLength(2);
      expect(input.departments).toContain('Engineering');
    });
  });

  describe('CampaignContentInput', () => {
    it('should accept content assignment', () => {
      const input: CampaignContentInput = {
        contentType: 'module',
        contentItemId: '123e4567-e89b-12d3-a456-426614174000',
        orderIndex: 1,
        dueDays: 7,
        isPrerequisite: false,
      };
      expect(input.contentType).toBe('module');
      expect(input.dueDays).toBe(7);
    });
  });

  describe('CampaignEscalationInput', () => {
    it('should accept escalation config', () => {
      const input: CampaignEscalationInput = {
        reminderDays: [1, 3, 7],
        managerNotification: true,
        complianceAlert: true,
        complianceAlertThreshold: 14,
      };
      expect(input.reminderDays).toHaveLength(3);
      expect(input.managerNotification).toBe(true);
    });
  });

  describe('CampaignListQuery', () => {
    it('should accept list query parameters', () => {
      const query: CampaignListQuery = {
        status: 'active',
        campaignType: 'quarterly',
        dateFrom: new Date(),
        dateTo: new Date(),
        limit: 50,
        offset: 0,
        search: 'training',
      };
      expect(query.limit).toBe(50);
      expect(query.status).toBe('active');
    });
  });

  describe('CampaignProgressMetrics', () => {
    it('should have correct structure', () => {
      const metrics: CampaignProgressMetrics = {
        totalEnrolled: 100,
        notStarted: 20,
        inProgress: 30,
        completed: 50,
        completionRate: 50,
        averageTimeToComplete: 5.5,
        byDepartment: [{ department: 'Engineering', total: 50, completed: 25, rate: 50 }],
        byRole: [{ role: 'Admin', total: 10, completed: 10, rate: 100 }],
      };
      expect(metrics.completionRate).toBe(50);
      expect(metrics.byDepartment).toHaveLength(1);
    });
  });

  describe('CampaignWithRelations', () => {
    it('should have correct structure', () => {
      const campaign: CampaignWithRelations = {
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Campaign',
        description: 'Test description',
        status: 'draft',
        campaignType: 'onboarding',
        createdBy: '123e4567-e89b-12d3-a456-426614174002',
        startDate: new Date(),
        endDate: new Date(),
        timezone: 'UTC',
        recurrencePattern: 'one-time',
        createdAt: new Date(),
        updatedAt: new Date(),
        audience: {
          audienceId: '123e4567-e89b-12d3-a456-426614174003',
          campaignId: '123e4567-e89b-12d3-a456-426614174000',
          groupIds: [],
          departments: [],
          locations: [],
          roles: [],
          attributeFilters: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        content: [
          {
            contentId: '123e4567-e89b-12d3-a456-426614174004',
            campaignId: '123e4567-e89b-12d3-a456-426614174000',
            contentType: 'module',
            contentItemId: '123e4567-e89b-12d3-a456-426614174005',
            orderIndex: 0,
            dueDays: 7,
            isPrerequisite: false,
            createdAt: new Date(),
          },
        ],
        escalations: {
          escalationId: '123e4567-e89b-12d3-a456-426614174006',
          campaignId: '123e4567-e89b-12d3-a456-426614174000',
          reminderDays: [1, 3, 7],
          managerNotification: true,
          complianceAlert: false,
          complianceAlertThreshold: 14,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        enrollmentCount: 10,
        completedCount: 5,
      };
      expect(campaign.audience).toBeDefined();
      expect(campaign.content).toHaveLength(1);
      expect(campaign.escalations).toBeDefined();
    });
  });
});
