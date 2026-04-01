export {
  createCampaign,
  listCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  mapCampaignRow,
} from './campaign-crud.service.js';

export { setCampaignAudience } from './campaign-audience.service.js';

export { addCampaignContent, removeCampaignContent } from './campaign-content.service.js';

export { setCampaignEscalations } from './campaign-escalation.service.js';

export {
  getCampaignProgress,
  enrollUsersInCampaign,
  getEligibleUsersForCampaign,
  checkInterventionThrottling,
  updateEnrollmentStatus,
} from './campaign-enrollment.service.js';

export {
  saveCampaignAsTemplate,
  listCampaignTemplates,
  createCampaignFromTemplate,
  deleteCampaignTemplate,
} from './campaign-template.service.js';

export type {
  CampaignStatus,
  CampaignType,
  RecurrencePattern,
  CampaignContentType,
  EnrollmentStatus,
  Campaign,
  CampaignAudience,
  CampaignContent,
  CampaignEnrollment,
  CampaignTemplate,
  CampaignEscalation,
  CampaignInput,
  CampaignUpdateInput,
  CampaignAudienceInput,
  CampaignContentInput,
  CampaignEscalationInput,
  CampaignTemplateInput,
  CampaignWithRelations,
  CampaignListQuery,
  CampaignListResult,
  CampaignProgressMetrics,
} from './campaign.types.js';
