import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig, type AppConfig } from '../../../config.js';
import {
  closeDatabase,
  getDatabaseClient,
  getDatabasePool,
} from '../../../shared/database/connection.js';
import { ensureTenantColumns } from '../../../__tests__/helpers/db.js';
import { createTestTenant, createTestUser } from '../../../__tests__/helpers/fixtures.js';
import {
  campaigns,
  campaignEnrollments,
} from '../../../shared/database/schema/training/campaign.schema.js';
import {
  createCampaign,
  listCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
} from '../campaign-crud.service.js';
import { setCampaignAudience } from '../campaign-audience.service.js';
import { addCampaignContent, removeCampaignContent } from '../campaign-content.service.js';
import { setCampaignEscalations } from '../campaign-escalation.service.js';
import {
  getCampaignProgress,
  enrollUsersInCampaign,
  getEligibleUsersForCampaign,
  updateEnrollmentStatus,
} from '../campaign-enrollment.service.js';
import {
  saveCampaignAsTemplate,
  listCampaignTemplates,
  createCampaignFromTemplate,
  deleteCampaignTemplate,
} from '../campaign-template.service.js';

import type {
  CampaignInput,
  CampaignUpdateInput,
  CampaignAudienceInput,
  CampaignContentInput,
  CampaignEscalationInput,
} from '../campaign.types.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  const pool = getDatabasePool(testConfig);
  await ensureTenantColumns(testConfig);
  await pool`TRUNCATE TABLE
    training.campaign_escalations,
    training.campaign_content,
    training.campaign_enrollments,
    training.campaign_audience,
    training.campaign_templates,
    training.campaigns,
    analytics.events,
    analytics.player_profiles,
    auth.sessions,
    auth.user_roles,
    auth.role_permissions,
    auth.roles,
    auth.permissions,
    users,
    tenants
    RESTART IDENTITY CASCADE`;
};

describe('campaign-service', () => {
  beforeAll(async () => {
    await resetTestData();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createCampaign', () => {
    it('should create a campaign with draft status', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const input: CampaignInput = {
        name: 'Test Campaign',
        campaignType: 'onboarding',
        createdBy: user.userId,
      };

      const result = await createCampaign(tenant.tenantId, input, testConfig);

      expect(result.name).toBe('Test Campaign');
      expect(result.campaignType).toBe('onboarding');
      expect(result.status).toBe('draft');
      expect(result.tenantId).toBe(tenant.tenantId);
      expect(result.campaignId).toBeDefined();
    });

    it('should create a campaign with all optional fields', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const input: CampaignInput = {
        name: 'Full Campaign',
        description: 'A campaign with all fields',
        campaignType: 'quarterly',
        createdBy: user.userId,
        startDate,
        endDate,
        timezone: 'America/New_York',
        recurrencePattern: 'quarterly',
      };

      const result = await createCampaign(tenant.tenantId, input, testConfig);

      expect(result.name).toBe('Full Campaign');
      expect(result.description).toBe('A campaign with all fields');
      expect(result.campaignType).toBe('quarterly');
      expect(result.recurrencePattern).toBe('quarterly');
      expect(result.timezone).toBe('America/New_York');
      expect(result.startDate).toEqual(startDate);
      expect(result.endDate).toEqual(endDate);
    });

    it('should persist campaign to database', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const input: CampaignInput = {
        name: 'Persisted Campaign',
        campaignType: 'annual',
        createdBy: user.userId,
      };

      const result = await createCampaign(tenant.tenantId, input, testConfig);

      const [dbCampaign] = await db
        .select()
        .from(campaigns)
        .where((c) => c.campaignId.equals(result.campaignId))
        .limit(1);

      expect(dbCampaign).toBeDefined();
      expect(dbCampaign.name).toBe('Persisted Campaign');
    });
  });

  describe('listCampaigns', () => {
    it('should return empty list when no campaigns exist', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await listCampaigns(tenant.tenantId, {}, testConfig);

      expect(result.campaigns).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return campaigns for tenant', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      await createCampaign(
        tenant.tenantId,
        { name: 'Campaign 1', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );
      await createCampaign(
        tenant.tenantId,
        { name: 'Campaign 2', campaignType: 'quarterly', createdBy: user.userId },
        testConfig,
      );

      const result = await listCampaigns(tenant.tenantId, {}, testConfig);

      expect(result.total).toBe(2);
      expect(result.campaigns).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign1 = await createCampaign(
        tenant.tenantId,
        { name: 'Draft Campaign', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );
      await createCampaign(
        tenant.tenantId,
        { name: 'Active Campaign', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      await updateCampaignStatus(tenant.tenantId, campaign1.campaignId, 'active', testConfig);

      const result = await listCampaigns(tenant.tenantId, { status: 'active' }, testConfig);

      expect(result.total).toBe(1);
      expect(result.campaigns[0].name).toBe('Active Campaign');
    });

    it('should filter by campaign type', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      await createCampaign(
        tenant.tenantId,
        { name: 'Onboarding Campaign', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );
      await createCampaign(
        tenant.tenantId,
        { name: 'Quarterly Campaign', campaignType: 'quarterly', createdBy: user.userId },
        testConfig,
      );

      const result = await listCampaigns(
        tenant.tenantId,
        { campaignType: 'quarterly' },
        testConfig,
      );

      expect(result.total).toBe(1);
      expect(result.campaigns[0].name).toBe('Quarterly Campaign');
    });

    it('should include enrollment counts', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Campaign with Enrollments', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      await enrollUsersInCampaign(tenant.tenantId, campaign.campaignId, [user.userId], testConfig);

      const result = await listCampaigns(tenant.tenantId, {}, testConfig);

      expect(result.campaigns[0].enrollmentCount).toBe(1);
    });
  });

  describe('getCampaignById', () => {
    it('should return null for non-existent campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await getCampaignById(tenant.tenantId, 'non-existent-id', testConfig);

      expect(result).toBeNull();
    });

    it('should return campaign with relations', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Campaign with Relations', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        {
          departments: ['Engineering'],
          roles: ['Admin'],
        },
        testConfig,
      );

      await addCampaignContent(
        tenant.tenantId,
        campaign.campaignId,
        {
          contentType: 'module',
          contentItemId: '123e4567-e89b-12d3-a456-426614174000',
          orderIndex: 0,
          dueDays: 7,
        },
        testConfig,
      );

      const result = await getCampaignById(tenant.tenantId, campaign.campaignId, testConfig);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Campaign with Relations');
      expect(result!.audience).not.toBeNull();
      expect(result!.audience!.departments).toContain('Engineering');
      expect(result!.content).toHaveLength(1);
      expect(result!.content![0].contentType).toBe('module');
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign name', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Original Name', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const updateInput: CampaignUpdateInput = { name: 'Updated Name' };

      const result = await updateCampaign(
        tenant.tenantId,
        campaign.campaignId,
        updateInput,
        testConfig,
      );

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Name');
    });

    it('should return null for non-existent campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await updateCampaign(
        tenant.tenantId,
        'non-existent-id',
        { name: 'Test' },
        testConfig,
      );

      expect(result).toBeNull();
    });

    it('should update multiple fields', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Original', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const newStartDate = new Date();
      const newEndDate = new Date(newStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const result = await updateCampaign(
        tenant.tenantId,
        campaign.campaignId,
        {
          name: 'Updated',
          description: 'New description',
          campaignType: 'quarterly',
          startDate: newStartDate,
          endDate: newEndDate,
        },
        testConfig,
      );

      expect(result!.name).toBe('Updated');
      expect(result!.description).toBe('New description');
      expect(result!.campaignType).toBe('quarterly');
    });
  });

  describe('updateCampaignStatus', () => {
    it('should transition campaign from draft to active', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Status Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      expect(campaign.status).toBe('draft');

      const result = await updateCampaignStatus(
        tenant.tenantId,
        campaign.campaignId,
        'active',
        testConfig,
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe('active');
    });

    it('should transition campaign to paused', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Status Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      await updateCampaignStatus(tenant.tenantId, campaign.campaignId, 'active', testConfig);
      const result = await updateCampaignStatus(
        tenant.tenantId,
        campaign.campaignId,
        'paused',
        testConfig,
      );

      expect(result!.status).toBe('paused');
    });

    it('should transition campaign to completed', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Status Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      await updateCampaignStatus(tenant.tenantId, campaign.campaignId, 'active', testConfig);
      const result = await updateCampaignStatus(
        tenant.tenantId,
        campaign.campaignId,
        'completed',
        testConfig,
      );

      expect(result!.status).toBe('completed');
    });

    it('should return null for non-existent campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await updateCampaignStatus(
        tenant.tenantId,
        'non-existent',
        'active',
        testConfig,
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteCampaign', () => {
    it('should delete existing campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'To Delete', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const result = await deleteCampaign(tenant.tenantId, campaign.campaignId, testConfig);

      expect(result).toBe(true);

      const deleted = await getCampaignById(tenant.tenantId, campaign.campaignId, testConfig);
      expect(deleted).toBeNull();
    });

    it('should return true even for non-existent campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await deleteCampaign(tenant.tenantId, 'non-existent', testConfig);

      expect(result).toBe(true);
    });
  });

  describe('setCampaignAudience', () => {
    it('should create audience for campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Audience Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const audienceInput: CampaignAudienceInput = {
        departments: ['Engineering', 'Sales'],
        locations: ['New York'],
        roles: ['Admin', 'User'],
        attributeFilters: { title: 'Manager' },
      };

      const result = await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        audienceInput,
        testConfig,
      );

      expect(result.departments).toEqual(['Engineering', 'Sales']);
      expect(result.locations).toEqual(['New York']);
      expect(result.roles).toEqual(['Admin', 'User']);
      expect(result.attributeFilters).toEqual({ title: 'Manager' });
    });

    it('should update existing audience', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Audience Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        { departments: ['Engineering'] },
        testConfig,
      );

      const result = await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        { departments: ['Sales', 'Marketing'] },
        testConfig,
      );

      expect(result.departments).toEqual(['Sales', 'Marketing']);
    });
  });

  describe('addCampaignContent', () => {
    it('should add content to campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Content Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const contentInput: CampaignContentInput = {
        contentType: 'module',
        contentItemId: '123e4567-e89b-12d3-a456-426614174000',
        orderIndex: 0,
        dueDays: 14,
        isPrerequisite: false,
      };

      const result = await addCampaignContent(
        tenant.tenantId,
        campaign.campaignId,
        contentInput,
        testConfig,
      );

      expect(result.contentType).toBe('module');
      expect(result.contentItemId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.dueDays).toBe(14);
    });

    it('should update existing content with same contentItemId', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Content Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const contentItemId = '123e4567-e89b-12d3-a456-426614174000';

      await addCampaignContent(
        tenant.tenantId,
        campaign.campaignId,
        { contentType: 'module', contentItemId, dueDays: 7 },
        testConfig,
      );

      const result = await addCampaignContent(
        tenant.tenantId,
        campaign.campaignId,
        { contentType: 'assessment', contentItemId, dueDays: 14 },
        testConfig,
      );

      expect(result.contentType).toBe('assessment');
      expect(result.dueDays).toBe(14);
    });
  });

  describe('removeCampaignContent', () => {
    it('should remove content from campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Remove Content Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const content = await addCampaignContent(
        tenant.tenantId,
        campaign.campaignId,
        {
          contentType: 'module',
          contentItemId: '123e4567-e89b-12d3-a456-426614174000',
        },
        testConfig,
      );

      const result = await removeCampaignContent(
        tenant.tenantId,
        campaign.campaignId,
        content.contentId,
        testConfig,
      );

      expect(result).toBe(true);

      const updatedCampaign = await getCampaignById(
        tenant.tenantId,
        campaign.campaignId,
        testConfig,
      );
      expect(updatedCampaign!.content).toHaveLength(0);
    });
  });

  describe('setCampaignEscalations', () => {
    it('should set escalation settings for campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Escalation Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const escalationInput: CampaignEscalationInput = {
        reminderDays: [1, 3, 7],
        managerNotification: true,
        complianceAlert: true,
        complianceAlertThreshold: 14,
      };

      const result = await setCampaignEscalations(
        tenant.tenantId,
        campaign.campaignId,
        escalationInput,
        testConfig,
      );

      expect(result.reminderDays).toEqual([1, 3, 7]);
      expect(result.managerNotification).toBe(true);
      expect(result.complianceAlert).toBe(true);
      expect(result.complianceAlertThreshold).toBe(14);
    });

    it('should use default values when optional fields not provided', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Escalation Test', campaignType: 'onboarding', createdBy: user.userId },
        testConfig,
      );

      const result = await setCampaignEscalations(
        tenant.tenantId,
        campaign.campaignId,
        {},
        testConfig,
      );

      expect(result.reminderDays).toEqual([1, 3, 7]);
      expect(result.managerNotification).toBe(true);
      expect(result.complianceAlert).toBe(false);
    });
  });

  describe('enrollUsersInCampaign', () => {
    it('should enroll users in campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user1 = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user1@test.com',
        displayName: 'User 1',
        role: 'learner',
      });
      const user2 = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user2@test.com',
        displayName: 'User 2',
        role: 'learner',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Enrollment Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      const result = await enrollUsersInCampaign(
        tenant.tenantId,
        campaign.campaignId,
        [user1.userId, user2.userId],
        testConfig,
      );

      expect(result).toHaveLength(2);
    });

    it('should not duplicate enrollments', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user@test.com',
        displayName: 'User',
        role: 'learner',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'No Duplicate Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await enrollUsersInCampaign(tenant.tenantId, campaign.campaignId, [user.userId], testConfig);
      const result = await enrollUsersInCampaign(
        tenant.tenantId,
        campaign.campaignId,
        [user.userId],
        testConfig,
      );

      expect(result).toHaveLength(1);
    });

    it('should throw error for non-existent campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user@test.com',
        displayName: 'User',
        role: 'learner',
      });

      await expect(
        enrollUsersInCampaign(tenant.tenantId, 'non-existent', [user.userId], testConfig),
      ).rejects.toThrow('Campaign not found');
    });
  });

  describe('getEligibleUsersForCampaign', () => {
    it('should return eligible users based on department', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const engineeringUser = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'eng@test.com',
        displayName: 'Engineer',
        role: 'learner',
        department: 'Engineering',
      } as Record<string, unknown> as Parameters<typeof createTestUser>[1]);
      const salesUser = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'sales@test.com',
        displayName: 'Sales',
        role: 'learner',
        department: 'Sales',
      } as Record<string, unknown> as Parameters<typeof createTestUser>[1]);
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Eligibility Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        { departments: ['Engineering'] },
        testConfig,
      );

      const eligibleUsers = await getEligibleUsersForCampaign(
        tenant.tenantId,
        campaign.campaignId,
        testConfig,
      );

      expect(eligibleUsers).toContain(engineeringUser.userId);
      expect(eligibleUsers).not.toContain(salesUser.userId);
    });

    it('should return eligible users based on role', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const adminUser = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'admin@test.com',
        displayName: 'Admin',
        role: 'admin',
      } as Record<string, unknown> as Parameters<typeof createTestUser>[1]);
      const learnerUser = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'learner@test.com',
        displayName: 'Learner',
        role: 'learner',
      } as Record<string, unknown> as Parameters<typeof createTestUser>[1]);
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Role Eligibility Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        { roles: ['admin'] },
        testConfig,
      );

      const eligibleUsers = await getEligibleUsersForCampaign(
        tenant.tenantId,
        campaign.campaignId,
        testConfig,
      );

      expect(eligibleUsers).toContain(adminUser.userId);
      expect(eligibleUsers).not.toContain(learnerUser.userId);
    });

    it('should return empty array when no audience set', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'No Audience Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      const eligibleUsers = await getEligibleUsersForCampaign(
        tenant.tenantId,
        campaign.campaignId,
        testConfig,
      );

      expect(eligibleUsers).toEqual([]);
    });
  });

  describe('getCampaignProgress', () => {
    it('should return null for non-existent campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await getCampaignProgress(tenant.tenantId, 'non-existent', testConfig);

      expect(result).toBeNull();
    });

    it('should return zero metrics for campaign with no enrollments', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Progress Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      const result = await getCampaignProgress(tenant.tenantId, campaign.campaignId, testConfig);

      expect(result).not.toBeNull();
      expect(result!.totalEnrolled).toBe(0);
      expect(result!.notStarted).toBe(0);
      expect(result!.inProgress).toBe(0);
      expect(result!.completed).toBe(0);
      expect(result!.completionRate).toBe(0);
    });

    it('should calculate progress metrics correctly', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user1 = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user1@test.com',
        displayName: 'User 1',
        role: 'learner',
      });
      const user2 = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user2@test.com',
        displayName: 'User 2',
        role: 'learner',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Progress Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await enrollUsersInCampaign(
        tenant.tenantId,
        campaign.campaignId,
        [user1.userId, user2.userId],
        testConfig,
      );

      const enrollments = await db
        .select()
        .from(campaignEnrollments)
        .where((e) => e.campaignId.equals(campaign.campaignId));

      await updateEnrollmentStatus(
        tenant.tenantId,
        enrollments[0].enrollmentId,
        'completed',
        testConfig,
      );

      const result = await getCampaignProgress(tenant.tenantId, campaign.campaignId, testConfig);

      expect(result!.totalEnrolled).toBe(2);
      expect(result!.notStarted).toBe(1);
      expect(result!.completed).toBe(1);
      expect(result!.completionRate).toBe(50);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status to in_progress', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user@test.com',
        displayName: 'User',
        role: 'learner',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Enrollment Status Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await enrollUsersInCampaign(tenant.tenantId, campaign.campaignId, [user.userId], testConfig);

      const [enrollment] = await db
        .select()
        .from(campaignEnrollments)
        .where((e) => e.campaignId.equals(campaign.campaignId));

      const result = await updateEnrollmentStatus(
        tenant.tenantId,
        enrollment.enrollmentId,
        'in_progress',
        testConfig,
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe('in_progress');
    });

    it('should set completedAt when status is completed', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const user = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'user@test.com',
        displayName: 'User',
        role: 'learner',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Completed Test', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await enrollUsersInCampaign(tenant.tenantId, campaign.campaignId, [user.userId], testConfig);

      const [enrollment] = await db
        .select()
        .from(campaignEnrollments)
        .where((e) => e.campaignId.equals(campaign.campaignId));

      const result = await updateEnrollmentStatus(
        tenant.tenantId,
        enrollment.enrollmentId,
        'completed',
        testConfig,
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe('completed');
      expect(result!.completedAt).not.toBeNull();
    });

    it('should return null for non-existent enrollment', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await updateEnrollmentStatus(
        tenant.tenantId,
        'non-existent',
        'completed',
        testConfig,
      );

      expect(result).toBeNull();
    });
  });

  describe('saveCampaignAsTemplate', () => {
    it('should save campaign as template', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Template Source', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        { departments: ['Engineering'] },
        testConfig,
      );

      const result = await saveCampaignAsTemplate(
        tenant.tenantId,
        campaign.campaignId,
        'My Template',
        'A template description',
        testConfig,
      );

      expect(result.name).toBe('My Template');
      expect(result.description).toBe('A template description');
      expect(result.campaignType).toBe('onboarding');
    });

    it('should throw error for non-existent campaign', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      await expect(
        saveCampaignAsTemplate(tenant.tenantId, 'non-existent', 'Template', undefined, testConfig),
      ).rejects.toThrow('Campaign not found');
    });
  });

  describe('listCampaignTemplates', () => {
    it('should return empty list when no templates exist', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const result = await listCampaignTemplates(tenant.tenantId, testConfig);

      expect(result).toHaveLength(0);
    });

    it('should list templates for tenant', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Template Source', campaignType: 'quarterly', createdBy: creator.userId },
        testConfig,
      );

      await saveCampaignAsTemplate(
        tenant.tenantId,
        campaign.campaignId,
        'Template 1',
        undefined,
        testConfig,
      );
      await saveCampaignAsTemplate(
        tenant.tenantId,
        campaign.campaignId,
        'Template 2',
        undefined,
        testConfig,
      );

      const result = await listCampaignTemplates(tenant.tenantId, testConfig);

      expect(result).toHaveLength(2);
    });
  });

  describe('createCampaignFromTemplate', () => {
    it('should create campaign from template', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Template Source', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      await setCampaignAudience(
        tenant.tenantId,
        campaign.campaignId,
        { departments: ['Engineering'] },
        testConfig,
      );

      const template = await saveCampaignAsTemplate(
        tenant.tenantId,
        campaign.campaignId,
        'My Template',
        undefined,
        testConfig,
      );

      const newCampaign = await createCampaignFromTemplate(
        tenant.tenantId,
        template.templateId,
        'New Campaign from Template',
        creator.userId,
        testConfig,
      );

      expect(newCampaign.name).toBe('New Campaign from Template');
      expect(newCampaign.campaignType).toBe('onboarding');

      const withRelations = await getCampaignById(
        tenant.tenantId,
        newCampaign.campaignId,
        testConfig,
      );
      expect(withRelations!.audience).not.toBeNull();
      expect(withRelations!.audience!.departments).toContain('Engineering');
    });

    it('should throw error for non-existent template', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      await expect(
        createCampaignFromTemplate(
          tenant.tenantId,
          'non-existent',
          'New Campaign',
          creator.userId,
          testConfig,
        ),
      ).rejects.toThrow('Template not found');
    });
  });

  describe('deleteCampaignTemplate', () => {
    it('should delete campaign template', async () => {
      const db = getDatabaseClient(testConfig);
      const tenant = await createTestTenant(db, {
        name: 'Test Tenant',
        slug: 'test-tenant',
      });
      const creator = await createTestUser(db, {
        tenantId: tenant.tenantId,
        email: 'creator@test.com',
        displayName: 'Creator',
        role: 'trainer',
      });

      const campaign = await createCampaign(
        tenant.tenantId,
        { name: 'Template Source', campaignType: 'onboarding', createdBy: creator.userId },
        testConfig,
      );

      const template = await saveCampaignAsTemplate(
        tenant.tenantId,
        campaign.campaignId,
        'To Delete',
        undefined,
        testConfig,
      );

      const result = await deleteCampaignTemplate(tenant.tenantId, template.templateId, testConfig);

      expect(result).toBe(true);

      const templates = await listCampaignTemplates(tenant.tenantId, testConfig);
      expect(templates).toHaveLength(0);
    });
  });
});
