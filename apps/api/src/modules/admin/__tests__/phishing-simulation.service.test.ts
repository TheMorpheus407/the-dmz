import { describe, it, expect } from 'vitest';

import type {
  SimulationStatus,
  UrgencyLevel,
  SimulationOutcome,
  PhishingSimulationInput,
  PhishingSimulationUpdateInput,
  SimulationAudienceInput,
  PhishingSimulationTemplateInput,
  TeachableMomentInput,
  SimulationResultsSummary,
} from '../phishing-simulation.service.js';

describe('phishing-simulation-service-types', () => {
  describe('type exports', () => {
    it('should export SimulationStatus type with correct values', () => {
      const statuses: SimulationStatus[] = [
        'draft',
        'scheduled',
        'active',
        'paused',
        'completed',
        'cancelled',
      ];
      expect(statuses).toContain('draft');
      expect(statuses).toContain('scheduled');
      expect(statuses).toContain('active');
      expect(statuses).toContain('paused');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('cancelled');
    });

    it('should export UrgencyLevel with correct values', () => {
      const levels: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
      expect(levels).toContain('low');
      expect(levels).toContain('medium');
      expect(levels).toContain('high');
      expect(levels).toContain('critical');
    });

    it('should export SimulationOutcome with correct values', () => {
      const outcomes: SimulationOutcome[] = ['clicked', 'reported', 'ignored', 'pending'];
      expect(outcomes).toContain('clicked');
      expect(outcomes).toContain('reported');
      expect(outcomes).toContain('ignored');
      expect(outcomes).toContain('pending');
    });
  });

  describe('PhishingSimulationInput', () => {
    it('should accept valid simulation input', () => {
      const input: PhishingSimulationInput = {
        name: 'Q1 Phishing Campaign',
        subject: 'Urgent: Verify your password',
        body: 'Click here to verify your account',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(input.name).toBe('Q1 Phishing Campaign');
      expect(input.subject).toBe('Urgent: Verify your password');
      expect(input.createdBy).toBeDefined();
    });

    it('should accept optional fields', () => {
      const input: PhishingSimulationInput = {
        name: 'Q1 Phishing Campaign',
        subject: 'Urgent: Verify your password',
        body: 'Click here to verify your account',
        description: 'First quarter security awareness test',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
        difficultyTier: 3,
        urgencyLevel: 'high',
        senderName: 'IT Support',
        senderEmail: 'support@company.com',
        replyTo: 'it@company.com',
        includeAttachment: true,
        attachmentName: 'policy.pdf',
        trackingEnabled: true,
        scheduledStartDate: new Date('2026-04-01'),
        scheduledEndDate: new Date('2026-04-30'),
        timezone: 'America/New_York',
      };
      expect(input.difficultyTier).toBe(3);
      expect(input.urgencyLevel).toBe('high');
      expect(input.senderName).toBe('IT Support');
      expect(input.includeAttachment).toBe(true);
    });
  });

  describe('PhishingSimulationUpdateInput', () => {
    it('should accept partial update', () => {
      const input: PhishingSimulationUpdateInput = {
        name: 'Updated Campaign Name',
      };
      expect(input.name).toBe('Updated Campaign Name');
    });

    it('should allow multiple fields update', () => {
      const input: PhishingSimulationUpdateInput = {
        name: 'Updated Name',
        urgencyLevel: 'critical',
        difficultyTier: 5,
      };
      expect(input.name).toBe('Updated Name');
      expect(input.urgencyLevel).toBe('critical');
      expect(input.difficultyTier).toBe(5);
    });
  });

  describe('SimulationAudienceInput', () => {
    it('should accept audience configuration', () => {
      const input: SimulationAudienceInput = {
        departments: ['Engineering', 'Sales'],
        locations: ['New York', 'London'],
        roles: ['Employee', 'Manager'],
        groupIds: ['123e4567-e89b-12d3-a456-426614174000'],
      };
      expect(input.departments).toHaveLength(2);
      expect(input.locations).toHaveLength(2);
      expect(input.groupIds).toHaveLength(1);
    });

    it('should accept attribute filters', () => {
      const input: SimulationAudienceInput = {
        attributeFilters: {
          hireDate: { $gte: '2025-01-01' },
          securityClearance: 'high',
        },
      };
      expect(input.attributeFilters).toHaveProperty('hireDate');
      expect(input.attributeFilters).toHaveProperty('securityClearance');
    });
  });

  describe('PhishingSimulationTemplateInput', () => {
    it('should accept valid template input', () => {
      const input: PhishingSimulationTemplateInput = {
        name: 'Password Reset Template',
        subject: 'Your password expires soon',
        body: 'Please reset your password immediately',
      };
      expect(input.name).toBe('Password Reset Template');
    });

    it('should accept merge tags and indicator hints', () => {
      const input: PhishingSimulationTemplateInput = {
        name: 'Template with hints',
        subject: 'Hello {{firstName}}, your account',
        body: 'Dear {{firstName}} {{lastName}},',
        mergeTags: ['firstName', 'lastName', 'department'],
        indicatorHints: ['urgent_language', 'suspicious_sender'],
      };
      expect(input.mergeTags).toContain('firstName');
      expect(input.indicatorHints).toContain('urgent_language');
    });
  });

  describe('TeachableMomentInput', () => {
    it('should accept valid teachable moment input', () => {
      const input: TeachableMomentInput = {
        name: 'Check the sender address',
        title: 'Always Verify the Sender',
        description: 'This email came from a suspicious sender',
        educationalContent: 'Always check the sender email address carefully...',
        whatToDoInstead: 'Report suspicious emails to IT security...',
      };
      expect(input.name).toBe('Check the sender address');
      expect(input.educationalContent).toBeDefined();
      expect(input.whatToDoInstead).toBeDefined();
    });

    it('should accept optional indicator type and micro training', () => {
      const input: TeachableMomentInput = {
        name: 'Suspicious Links',
        title: 'Dont Click Unknown Links',
        description: 'This email contained a malicious link',
        educationalContent: 'Hover over links to see the real URL...',
        whatToDoInstead: 'Go directly to the website instead of clicking...',
        indicatorType: 'suspicious_link',
        microTrainingCourseId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(input.indicatorType).toBe('suspicious_link');
      expect(input.microTrainingCourseId).toBeDefined();
    });
  });

  describe('SimulationResultsSummary', () => {
    it('should have correct structure', () => {
      const summary: SimulationResultsSummary = {
        totalTargeted: 100,
        emailDelivered: 95,
        emailOpened: 80,
        linkClicked: 20,
        clickRate: 20,
        reported: 60,
        reportRate: 60,
        attachmentOpened: 5,
        teachableMomentViewed: 18,
        microTrainingEnrolled: 10,
        byDepartment: [
          {
            department: 'Engineering',
            total: 50,
            clicked: 5,
            reported: 40,
            clickRate: 10,
            reportRate: 80,
          },
        ],
        byRole: [
          {
            role: 'Employee',
            total: 80,
            clicked: 18,
            reported: 50,
            clickRate: 22.5,
            reportRate: 62.5,
          },
        ],
        timeToClickDistribution: [
          { bucket: '< 1 min', count: 5 },
          { bucket: '1-5 min', count: 10 },
        ],
        repeatFailures: ['user-1', 'user-2'],
      };
      expect(summary.totalTargeted).toBe(100);
      expect(summary.clickRate).toBe(20);
      expect(summary.byDepartment).toHaveLength(1);
      expect(summary.repeatFailures).toHaveLength(2);
    });
  });
});
