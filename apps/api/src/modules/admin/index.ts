export { registerAdminRateLimitRoutes } from './admin-rate-limit.routes.js';
export { registerAdminTenantRoutes } from './admin-tenants.routes.js';
export { registerAdminRoleRoutes } from './admin-roles.routes.js';
export { registerAdminDashboardRoutes } from './admin-dashboard.routes.js';
export { registerAdminUserRoutes } from './admin-users.routes.js';

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
