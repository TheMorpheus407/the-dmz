import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  handleCreateCampaign,
  handleListCampaigns,
  handleGetCampaign,
  handleUpdateCampaign,
  handleUpdateCampaignStatus,
  handleDeleteCampaign,
  handleSetCampaignAudience,
  handleAddCampaignContent,
  handleRemoveCampaignContent,
  handleGetCampaignProgress,
  handleSaveCampaignAsTemplate,
  handleListCampaignTemplates,
  handleCreateCampaignFromTemplate,
  handleDeleteCampaignTemplate,
  handleEnrollUsersInCampaign,
  handleGetEligibleUsers,
  handleThrottleCheck,
  handleUpdateEnrollmentStatus,
  handleSetCampaignEscalations,
  type CampaignCreateBody,
  type CampaignUpdateBody,
  type CampaignStatusUpdateBody,
  type CampaignAudienceBody,
  type CampaignContentBody,
  type CampaignEscalationBody,
  type CampaignListQuery,
  type EnrollUsersBody,
  type EnrollmentStatusBody,
} from '../campaign.handlers.js';

import type { FastifyRequest, FastifyReply } from 'fastify';

const mockRequest = (overrides = {}) => {
  return {
    tenantContext: { tenantId: 'test-tenant-id' },
    user: { userId: 'test-user-id' },
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as unknown as FastifyRequest;
};

const mockReply = () => {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as FastifyReply;
};

describe('campaign-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCreateCampaign', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleCreateCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
      });
    });

    it('should return 400 for invalid input', async () => {
      const request = mockRequest({
        body: { name: '', campaignType: 'invalid' },
      });
      const reply = mockReply();

      await handleCreateCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('should return 400 for valid input without service call', async () => {
      const request = mockRequest({
        body: { name: 'Test' },
      });
      const reply = mockReply();

      await handleCreateCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('handleListCampaigns', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleListCampaigns(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleGetCampaign', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleGetCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleUpdateCampaign', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleUpdateCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid input', async () => {
      const request = mockRequest({
        params: { campaignId: '123' },
        body: { name: '' },
      });
      const reply = mockReply();

      await handleUpdateCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('handleUpdateCampaignStatus', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleUpdateCampaignStatus(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleDeleteCampaign', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleDeleteCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleSetCampaignAudience', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleSetCampaignAudience(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleAddCampaignContent', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleAddCampaignContent(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleRemoveCampaignContent', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleRemoveCampaignContent(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleGetCampaignProgress', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleGetCampaignProgress(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleSaveCampaignAsTemplate', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleSaveCampaignAsTemplate(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleListCampaignTemplates', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleListCampaignTemplates(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleCreateCampaignFromTemplate', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleCreateCampaignFromTemplate(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleDeleteCampaignTemplate', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleDeleteCampaignTemplate(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleEnrollUsersInCampaign', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleEnrollUsersInCampaign(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleGetEligibleUsers', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleGetEligibleUsers(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleThrottleCheck', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleThrottleCheck(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleUpdateEnrollmentStatus', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleUpdateEnrollmentStatus(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('handleSetCampaignEscalations', () => {
    it('should return 401 when tenant context is missing', async () => {
      const request = mockRequest({ tenantContext: null });
      const reply = mockReply();

      await handleSetCampaignEscalations(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });
});

describe('campaign-handler-types', () => {
  describe('CampaignCreateBody', () => {
    it('should accept valid campaign create body', () => {
      const body: CampaignCreateBody = {
        name: 'Test Campaign',
        campaignType: 'onboarding',
      };
      expect(body.name).toBe('Test Campaign');
      expect(body.campaignType).toBe('onboarding');
    });
  });

  describe('CampaignUpdateBody', () => {
    it('should accept partial update body', () => {
      const body: CampaignUpdateBody = {
        name: 'Updated Name',
      };
      expect(body.name).toBe('Updated Name');
    });
  });

  describe('CampaignStatusUpdateBody', () => {
    it('should accept status update body', () => {
      const body: CampaignStatusUpdateBody = {
        status: 'active',
      };
      expect(body.status).toBe('active');
    });
  });

  describe('CampaignAudienceBody', () => {
    it('should accept audience body', () => {
      const body: CampaignAudienceBody = {
        departments: ['Engineering'],
      };
      expect(body.departments).toContain('Engineering');
    });
  });

  describe('CampaignContentBody', () => {
    it('should accept content body', () => {
      const body: CampaignContentBody = {
        contentType: 'module',
        contentItemId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(body.contentType).toBe('module');
    });
  });

  describe('CampaignEscalationBody', () => {
    it('should accept escalation body', () => {
      const body: CampaignEscalationBody = {
        reminderDays: [1, 3, 7],
        managerNotification: true,
      };
      expect(body.reminderDays).toHaveLength(3);
    });
  });

  describe('CampaignListQuery', () => {
    it('should accept list query', () => {
      const query: CampaignListQuery = {
        status: 'active',
        limit: 50,
      };
      expect(query.status).toBe('active');
      expect(query.limit).toBe(50);
    });
  });

  describe('EnrollUsersBody', () => {
    it('should accept enroll users body', () => {
      const body: EnrollUsersBody = {
        userIds: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
      };
      expect(body.userIds).toHaveLength(2);
    });
  });

  describe('EnrollmentStatusBody', () => {
    it('should accept enrollment status body', () => {
      const body: EnrollmentStatusBody = {
        status: 'completed',
      };
      expect(body.status).toBe('completed');
    });
  });
});
