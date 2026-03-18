export { registerAdminRateLimitRoutes } from './admin-rate-limit.routes.js';
export { registerAdminTenantRoutes } from './admin-tenants.routes.js';
export { registerAdminRoleRoutes } from './admin-roles.routes.js';
export { registerAdminDashboardRoutes } from './admin-dashboard.routes.js';
export { registerAdminUserRoutes } from './admin-users.routes.js';
export { registerAdminSAMLRoutes } from './admin-saml.routes.js';
export { registerAdminOIDCRoutes } from './admin-oidc.routes.js';
export { registerAdminSCIMRoutes } from './admin-scim.routes.js';
export { registerTrainerRoutes } from './trainer.routes.js';
export { registerCertificateRoutes } from './certificate.routes.js';
export {
  createCertificateEventHandler,
  registerCertificateEventHandlers,
  type CertificateGenerationConfig,
} from './certificate.events.js';
export { registerComplianceRoutes } from './compliance.routes.js';
export { registerCampaignRoutes } from './campaign.routes.js';

export {
  getComplianceSummary,
  getComplianceDetail,
  getFrameworkRequirements,
  calculateComplianceSnapshot,
  calculateAllComplianceSnapshots,
  type ComplianceStatus,
  type ComplianceSnapshotData,
  type FrameworkRequirementData,
  type ComplianceSummary,
  type ComplianceDetail,
  type ComplianceDashboardData,
} from './compliance.service.js';

export {
  createCampaign,
  listCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  setCampaignAudience,
  addCampaignContent,
  removeCampaignContent,
  setCampaignEscalations,
  getCampaignProgress,
  enrollUsersInCampaign,
  getEligibleUsersForCampaign,
  checkInterventionThrottling,
  saveCampaignAsTemplate,
  listCampaignTemplates,
  createCampaignFromTemplate,
  deleteCampaignTemplate,
  updateEnrollmentStatus,
  type CampaignStatus,
  type CampaignType,
  type RecurrencePattern,
  type ContentType,
  type EnrollmentStatus,
  type CampaignInput,
  type CampaignUpdateInput,
  type CampaignAudienceInput,
  type CampaignContentInput,
  type CampaignEscalationInput,
  type CampaignTemplateInput,
  type CampaignWithRelations,
  type CampaignListQuery,
  type CampaignListResult,
  type CampaignProgressMetrics,
} from './campaign.service.js';
