import { authGuard, requirePermission } from '../middleware/authorization.js';
import { tenantContext } from '../middleware/tenant-context.js';
import { tenantStatusGuard } from '../middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../schemas/error-schemas.js';

export const protectedRoutePreHandlers = [authGuard, tenantContext, tenantStatusGuard];

export const contentReadRoutePreHandlers = [
  ...protectedRoutePreHandlers,
  requirePermission('admin', 'read'),
];

export const contentWriteRoutePreHandlers = [
  ...protectedRoutePreHandlers,
  requirePermission('admin', 'write'),
];

export const analyticsReadRoutePreHandlers = [
  ...protectedRoutePreHandlers,
  requirePermission('analytics', 'read'),
];

export const adminReadRoutePreHandlers = contentReadRoutePreHandlers;

export const adminWriteRoutePreHandlers = contentWriteRoutePreHandlers;

export const tenantInactiveOrForbiddenResponseJsonSchema = {
  oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
} as const;
