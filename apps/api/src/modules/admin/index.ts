export { registerAdminRateLimitRoutes } from './admin-rate-limit.routes.js';
export { registerAdminTenantRoutes } from './admin-tenants.routes.js';
export { registerAdminRoleRoutes } from './admin-roles.routes.js';
export { registerAdminDashboardRoutes } from './admin-dashboard.routes.js';
export { registerAdminUserRoutes } from './admin-users.routes.js';
export { registerTrainerRoutes } from './trainer.routes.js';

export {
  getTenantInfo,
  getActiveUsers,
  getUserMetrics,
  getDashboardData,
  type TenantInfo,
  type ActiveUsersData,
  type UserMetrics,
  type DashboardData,
} from './dashboard.service.js';

export {
  getCompetencyDistribution,
  getErrorPatterns,
  getLearnersByDomain,
  getCampaignCompletion,
  getTrainerDashboardData,
  type DateRange,
  type CompetencyDistribution,
  type ErrorPattern,
  type LearnerSummary,
  type CampaignCompletion,
  type TrainerDashboardData,
} from './trainer.service.js';
