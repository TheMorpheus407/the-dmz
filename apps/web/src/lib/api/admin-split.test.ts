import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('admin-dashboard module', () => {
  it('should export getDashboard function', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(typeof module.getDashboard).toBe('function');
  });

  it('should export DashboardData type', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(module.DashboardData).toBeDefined();
  });

  it('should export TenantInfo type', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(module.TenantInfo).toBeDefined();
  });

  it('should export TenantFeatureFlags type', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(module.TenantFeatureFlags).toBeDefined();
  });

  it('should export ActiveUsersData type', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(module.ActiveUsersData).toBeDefined();
  });

  it('should export UserMetrics type', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(module.UserMetrics).toBeDefined();
  });

  it('should export UserGrowthTrendItem type', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(module.UserGrowthTrendItem).toBeDefined();
  });

  it('should export UsersByRole type', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(module.UsersByRole).toBeDefined();
  });
});

describe('admin-trainer module', () => {
  it('should export getTrainerDashboard function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerDashboard).toBe('function');
  });

  it('should export getTrainerCompetencies function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerCompetencies).toBe('function');
  });

  it('should export getTrainerErrors function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerErrors).toBe('function');
  });

  it('should export getTrainerCampaigns function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerCampaigns).toBe('function');
  });

  it('should export getTrainerLearners function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerLearners).toBe('function');
  });

  it('should export TrainerDashboardData type', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(module.TrainerDashboardData).toBeDefined();
  });

  it('should export CompetencyDistribution type', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(module.CompetencyDistribution).toBeDefined();
  });

  it('should export ErrorPattern type', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(module.ErrorPattern).toBeDefined();
  });

  it('should export CampaignCompletion type', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(module.CampaignCompletion).toBeDefined();
  });

  it('should export LearnerSummary type', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(module.LearnerSummary).toBeDefined();
  });
});

describe('admin-compliance module', () => {
  it('should export getComplianceSummary function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.getComplianceSummary).toBe('function');
  });

  it('should export getComplianceDetail function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.getComplianceDetail).toBe('function');
  });

  it('should export getFrameworkRequirements function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.getFrameworkRequirements).toBe('function');
  });

  it('should export calculateCompliance function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.calculateCompliance).toBe('function');
  });

  it('should export ComplianceStatus type', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(module.ComplianceStatus).toBeDefined();
  });

  it('should export ComplianceSummary type', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(module.ComplianceSummary).toBeDefined();
  });

  it('should export FrameworkRequirement type', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(module.FrameworkRequirement).toBeDefined();
  });

  it('should export ComplianceDetail type', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(module.ComplianceDetail).toBeDefined();
  });

  it('should export ComplianceDashboardData type', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(module.ComplianceDashboardData).toBeDefined();
  });
});

describe('admin-saml module', () => {
  it('should export getSAMLProviders function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.getSAMLProviders).toBe('function');
  });

  it('should export getSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.getSAMLProvider).toBe('function');
  });

  it('should export createSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.createSAMLProvider).toBe('function');
  });

  it('should export updateSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.updateSAMLProvider).toBe('function');
  });

  it('should export deleteSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.deleteSAMLProvider).toBe('function');
  });

  it('should export testSAMLConnection function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.testSAMLConnection).toBe('function');
  });

  it('should export SAMLProviderConfig type', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(module.SAMLProviderConfig).toBeDefined();
  });

  it('should export CreateSAMLProviderRequest type', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(module.CreateSAMLProviderRequest).toBeDefined();
  });

  it('should export UpdateSAMLProviderRequest type', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(module.UpdateSAMLProviderRequest).toBeDefined();
  });

  it('should export SAMLTestConnectionResponse type', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(module.SAMLTestConnectionResponse).toBeDefined();
  });
});

describe('admin-scim module', () => {
  it('should export getSCIMTokens function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.getSCIMTokens).toBe('function');
  });

  it('should export createSCIMToken function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.createSCIMToken).toBe('function');
  });

  it('should export revokeSCIMToken function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.revokeSCIMToken).toBe('function');
  });

  it('should export rotateSCIMToken function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.rotateSCIMToken).toBe('function');
  });

  it('should export testSCIMConnection function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.testSCIMConnection).toBe('function');
  });

  it('should export testSCIMProvisioning function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.testSCIMProvisioning).toBe('function');
  });

  it('should export getSCIMSyncStatus function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.getSCIMSyncStatus).toBe('function');
  });

  it('should export getSCIMGroupMappings function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.getSCIMGroupMappings).toBe('function');
  });

  it('should export updateSCIMGroupRole function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.updateSCIMGroupRole).toBe('function');
  });

  it('should export SCIMTokenConfig type', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(module.SCIMTokenConfig).toBeDefined();
  });

  it('should export SCIMTokenWithSecret type', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(module.SCIMTokenWithSecret).toBeDefined();
  });

  it('should export SCIMTestConnectionResponse type', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(module.SCIMTestConnectionResponse).toBeDefined();
  });

  it('should export SCIMTestProvisioningResponse type', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(module.SCIMTestProvisioningResponse).toBeDefined();
  });

  it('should export SCIMSyncStatus type', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(module.SCIMSyncStatus).toBeDefined();
  });

  it('should export SCIMGroupRoleMapping type', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(module.SCIMGroupRoleMapping).toBeDefined();
  });

  it('should export SCIMRole type', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(module.SCIMRole).toBeDefined();
  });
});
