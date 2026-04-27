import { describe, expect, it } from 'vitest';

describe('admin barrel re-exports (backward compatibility)', () => {
  describe('dashboard exports', () => {
    it('should re-export getDashboard from admin-dashboard', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getDashboard).toBe('function');
    });

    it('should re-export DashboardData from admin-dashboard', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.DashboardData).toBeDefined();
    });

    it('should re-export TenantInfo from admin-dashboard', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.TenantInfo).toBeDefined();
    });

    it('should re-export TenantFeatureFlags from admin-dashboard', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.TenantFeatureFlags).toBeDefined();
    });

    it('should re-export ActiveUsersData from admin-dashboard', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.ActiveUsersData).toBeDefined();
    });

    it('should re-export UserMetrics from admin-dashboard', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.UserMetrics).toBeDefined();
    });
  });

  describe('trainer exports', () => {
    it('should re-export getTrainerDashboard from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerDashboard).toBe('function');
    });

    it('should re-export getTrainerCompetencies from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerCompetencies).toBe('function');
    });

    it('should re-export getTrainerErrors from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerErrors).toBe('function');
    });

    it('should re-export getTrainerCampaigns from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerCampaigns).toBe('function');
    });

    it('should re-export getTrainerLearners from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerLearners).toBe('function');
    });

    it('should re-export TrainerDashboardData from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.TrainerDashboardData).toBeDefined();
    });

    it('should re-export CompetencyDistribution from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.CompetencyDistribution).toBeDefined();
    });

    it('should re-export ErrorPattern from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.ErrorPattern).toBeDefined();
    });

    it('should re-export CampaignCompletion from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.CampaignCompletion).toBeDefined();
    });

    it('should re-export LearnerSummary from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.LearnerSummary).toBeDefined();
    });
  });

  describe('compliance exports', () => {
    it('should re-export getComplianceSummary from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getComplianceSummary).toBe('function');
    });

    it('should re-export getComplianceDetail from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getComplianceDetail).toBe('function');
    });

    it('should re-export getFrameworkRequirements from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getFrameworkRequirements).toBe('function');
    });

    it('should re-export calculateCompliance from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.calculateCompliance).toBe('function');
    });

    it('should re-export ComplianceStatus from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.ComplianceStatus).toBeDefined();
    });

    it('should re-export ComplianceSummary from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.ComplianceSummary).toBeDefined();
    });

    it('should re-export FrameworkRequirement from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.FrameworkRequirement).toBeDefined();
    });

    it('should re-export ComplianceDetail from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.ComplianceDetail).toBeDefined();
    });

    it('should re-export ComplianceDashboardData from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.ComplianceDashboardData).toBeDefined();
    });
  });

  describe('saml exports', () => {
    it('should re-export getSAMLProviders from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSAMLProviders).toBe('function');
    });

    it('should re-export getSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSAMLProvider).toBe('function');
    });

    it('should re-export createSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.createSAMLProvider).toBe('function');
    });

    it('should re-export updateSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.updateSAMLProvider).toBe('function');
    });

    it('should re-export deleteSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.deleteSAMLProvider).toBe('function');
    });

    it('should re-export testSAMLConnection from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.testSAMLConnection).toBe('function');
    });

    it('should re-export SAMLProviderConfig from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SAMLProviderConfig).toBeDefined();
    });

    it('should re-export CreateSAMLProviderRequest from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.CreateSAMLProviderRequest).toBeDefined();
    });

    it('should re-export UpdateSAMLProviderRequest from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.UpdateSAMLProviderRequest).toBeDefined();
    });

    it('should re-export SAMLTestConnectionResponse from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SAMLTestConnectionResponse).toBeDefined();
    });
  });

  describe('scim exports', () => {
    it('should re-export getSCIMTokens from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSCIMTokens).toBe('function');
    });

    it('should re-export createSCIMToken from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.createSCIMToken).toBe('function');
    });

    it('should re-export revokeSCIMToken from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.revokeSCIMToken).toBe('function');
    });

    it('should re-export rotateSCIMToken from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.rotateSCIMToken).toBe('function');
    });

    it('should re-export testSCIMConnection from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.testSCIMConnection).toBe('function');
    });

    it('should re-export testSCIMProvisioning from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.testSCIMProvisioning).toBe('function');
    });

    it('should re-export getSCIMSyncStatus from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSCIMSyncStatus).toBe('function');
    });

    it('should re-export getSCIMGroupMappings from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSCIMGroupMappings).toBe('function');
    });

    it('should re-export updateSCIMGroupRole from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.updateSCIMGroupRole).toBe('function');
    });

    it('should re-export SCIMTokenConfig from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SCIMTokenConfig).toBeDefined();
    });

    it('should re-export SCIMTokenWithSecret from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SCIMTokenWithSecret).toBeDefined();
    });

    it('should re-export SCIMTestConnectionResponse from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SCIMTestConnectionResponse).toBeDefined();
    });

    it('should re-export SCIMTestProvisioningResponse from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SCIMTestProvisioningResponse).toBeDefined();
    });

    it('should re-export SCIMSyncStatus from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SCIMSyncStatus).toBeDefined();
    });

    it('should re-export SCIMGroupRoleMapping from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SCIMGroupRoleMapping).toBeDefined();
    });

    it('should re-export SCIMRole from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(admin.SCIMRole).toBeDefined();
    });
  });
});
